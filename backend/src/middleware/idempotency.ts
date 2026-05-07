import { Request, Response, NextFunction } from "express";
import { IdempotencyConflictError } from "../lib/errors";

/**
 * Simple in-memory idempotency store.
 * In production, replace with Redis or a PostgreSQL table.
 */
const idempotencyStore = new Map<string, { response: unknown; expiresAt: number }>();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore.entries()) {
    if (entry.expiresAt < now) {
      idempotencyStore.delete(key);
    }
  }
}, 600_000);

export function idempotency(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Only apply to financial POST endpoints
  if (req.method !== "POST") {
    next();
    return;
  }

  const key = req.headers["idempotency-key"] as string | undefined;
  if (!key) {
    next();
    return;
  }

  const existing = idempotencyStore.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    // Return cached response
    res.status(200).json(existing.response);
    return;
  }

  // Intercept res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    idempotencyStore.set(key, {
      response: body,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    return originalJson(body);
  };

  next();
}
