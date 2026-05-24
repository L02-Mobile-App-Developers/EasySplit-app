import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { sendError } from "../lib/response";
import { logger } from "./logger";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  void _next;

  if (err instanceof AppError) {
    logger.warn({ err }, "Application error");
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  logger.error({ err }, "Unhandled error");
  sendError(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
}
