import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { config } from "../config";
import {
  cleanForFirestore,
  collectionNames,
  collectionRef,
  docRef,
  getDoc,
  idempotencyId,
  IdempotencyKey,
} from "../lib/firestore-db";
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
  const id = idempotencyId(userId, key);

  while (Date.now() < deadline) {
    const row = await getDoc<IdempotencyKey>(
      collectionNames.idempotencyKeys,
      id,
    );

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
  await docRef(collectionNames.idempotencyKeys, id).set(
    cleanForFirestore({ state: FAILED_STATE }),
    { merge: true },
  );
}

async function replayOrRejectExisting(
  req: Request,
  res: Response,
  key: string,
  requestHash: string,
): Promise<boolean> {
  const userId = req.user!.userId;
  const id = idempotencyId(userId, key);
  const existing = await getDoc<IdempotencyKey>(
    collectionNames.idempotencyKeys,
    id,
  );

  if (!existing) {
    return false;
  }

  if (existing.expiresAt <= new Date()) {
    await docRef(collectionNames.idempotencyKeys, id).delete();
    return false;
  }

  if (existing.requestHash !== requestHash) {
    throw new IdempotencyConflictError(
      "Idempotency-Key was already used with a different request body",
    );
  }

  if (isStaleProcessing(existing)) {
    await markStaleProcessingFailed(id);
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
  const id = idempotencyId(req.user!.userId, key);
  const reserved = await collectionRef(collectionNames.idempotencyKeys).firestore.runTransaction(
    async (transaction) => {
      const ref = docRef(collectionNames.idempotencyKeys, id);
      const existing = await transaction.get(ref);
      if (existing.exists) {
        return false;
      }

      const row: IdempotencyKey = {
        id,
        userId: req.user!.userId,
        key,
        method: req.method,
        path: req.originalUrl,
        requestHash,
        responseBody: null,
        statusCode: null,
        state: PROCESSING_STATE,
        createdAt: new Date(),
        expiresAt: expiresAtFromNow(),
      };
      transaction.set(ref, cleanForFirestore(row));
      return true;
    },
  );

  if (reserved) {
    req.idempotencyRequestId = id;
  }

  return reserved;
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
          await docRef(
            collectionNames.idempotencyKeys,
            idempotencyId(req.user!.userId, normalizedKey),
          ).set(
            cleanForFirestore({
              responseBody: body,
              statusCode,
              state: COMPLETED_STATE,
            }),
            { merge: true },
          );

          originalJson(body);
        })().catch(async (err) => {
          await docRef(
            collectionNames.idempotencyKeys,
            idempotencyId(req.user!.userId, normalizedKey),
          )
            .set(cleanForFirestore({ state: FAILED_STATE }), { merge: true })
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
