import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import {
  IdempotencyConflictError,
  ValidationError,
} from "../lib/errors";

type IdempotencyOptions = {
  requiredWhen?: (req: Request) => boolean;
};

declare global {
  namespace Express {
    interface Request {
      idempotencyRequestId?: string;
    }
  }
}

const PROCESSING_STATE = "processing";
const COMPLETED_STATE = "completed";
const FAILED_STATE = "failed";
const WAIT_TIMEOUT_MS = 5_000;
const WAIT_INTERVAL_MS = 50;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function hashRequest(req: Request): string {
  const hashInput = stableStringify({
    method: req.method,
    path: req.originalUrl,
    body: req.body ?? null,
  });
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function expiresAtFromNow(): Date {
  return new Date(Date.now() + config.idempotency.windowHours * 60 * 60 * 1000);
}

function staleProcessingCutoff(): Date {
  return new Date(
    Date.now() - config.idempotency.processingTimeoutSeconds * 1000,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCompletedResponse(userId: string, key: string) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const row = await prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });

    if (
      row?.state === COMPLETED_STATE &&
      row.responseBody !== null &&
      row.statusCode !== null
    ) {
      return row;
    }

    await sleep(WAIT_INTERVAL_MS);
  }

  throw new ValidationError("A request with this Idempotency-Key is still processing");
}

function isStaleProcessing(row: { state: string; createdAt: Date }): boolean {
  return row.state === PROCESSING_STATE && row.createdAt < staleProcessingCutoff();
}

async function markStaleProcessingFailed(id: string) {
  await prisma.idempotencyKey.update({
    where: { id },
    data: { state: FAILED_STATE },
  });
}

async function replayOrRejectExisting(
  req: Request,
  res: Response,
  key: string,
  requestHash: string,
): Promise<boolean> {
  const userId = req.user!.userId;
  const existing = await prisma.idempotencyKey.findUnique({
    where: { userId_key: { userId, key } },
  });

  if (!existing) {
    return false;
  }

  if (existing.expiresAt <= new Date()) {
    await prisma.idempotencyKey.delete({
      where: { id: existing.id },
    });
    return false;
  }

  if (existing.requestHash !== requestHash) {
    throw new IdempotencyConflictError(
      "Idempotency-Key was already used with a different request body",
    );
  }

  if (isStaleProcessing(existing)) {
    await markStaleProcessingFailed(existing.id);
    throw new ValidationError(
      "A previous request with this Idempotency-Key did not complete; check resource state and retry with a new key",
      [{ field: "Idempotency-Key", issue: "stale_processing" }],
    );
  }

  if (existing.state === FAILED_STATE) {
    throw new ValidationError(
      "A previous request with this Idempotency-Key failed; retry with a new key",
      [{ field: "Idempotency-Key", issue: "failed" }],
    );
  }

  const completed =
    existing.state === COMPLETED_STATE &&
    existing.responseBody !== null &&
    existing.statusCode !== null
      ? existing
      : await waitForCompletedResponse(userId, key);

  res.status(completed.statusCode!).json(completed.responseBody);
  return true;
}

async function reserveKey(req: Request, key: string, requestHash: string) {
  const id = crypto.randomUUID();
  const result = await prisma.idempotencyKey.createMany({
    data: {
      id,
      userId: req.user!.userId,
      key,
      method: req.method,
      path: req.originalUrl,
      requestHash,
      state: PROCESSING_STATE,
      expiresAt: expiresAtFromNow(),
    },
    skipDuplicates: true,
  });

  if (result.count === 1) {
    req.idempotencyRequestId = id;
  }

  return result.count === 1;
}

export function requireIdempotency(options: IdempotencyOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (options.requiredWhen && !options.requiredWhen(req)) {
        next();
        return;
      }

      const key = req.headers["idempotency-key"];
      if (typeof key !== "string" || key.trim().length === 0) {
        throw new ValidationError("Idempotency-Key header is required", [
          { field: "Idempotency-Key", issue: "required" },
        ]);
      }

      const normalizedKey = key.trim();
      const requestHash = hashRequest(req);
      let reserved = await reserveKey(req, normalizedKey, requestHash);

      if (!reserved) {
        const replayed = await replayOrRejectExisting(
          req,
          res,
          normalizedKey,
          requestHash,
        );
        if (replayed) return;

        reserved = await reserveKey(req, normalizedKey, requestHash);
        if (!reserved) {
          const replayedAfterRetry = await replayOrRejectExisting(
            req,
            res,
            normalizedKey,
            requestHash,
          );
          if (replayedAfterRetry) return;
        }
      }

      const originalJson = res.json.bind(res);
      res.json = function idempotentJson(body: unknown) {
        const statusCode = res.statusCode;
        void (async () => {
          await prisma.idempotencyKey.update({
            where: {
              userId_key: {
                userId: req.user!.userId,
                key: normalizedKey,
              },
            },
            data: {
              responseBody: toInputJson(body),
              statusCode,
              state: COMPLETED_STATE,
            },
          });

          originalJson(body);
        })().catch(async (err) => {
          await prisma.idempotencyKey
            .updateMany({
              where: {
                userId: req.user!.userId,
                key: normalizedKey,
                state: PROCESSING_STATE,
              },
              data: { state: FAILED_STATE },
            })
            .catch(() => undefined);

          next(err);
        });

        return res;
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
