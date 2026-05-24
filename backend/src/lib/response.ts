import { Response } from "express";

interface SuccessResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
  message: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "OK",
  meta?: Record<string, unknown>,
  statusCode = 200,
): void {
  const body: SuccessResponse<T> = { data, message };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Array<{ field: string; issue: string }>,
): void {
  const body: ErrorResponse = {
    error: { code, message },
  };
  if (details) body.error.details = details;
  res.status(statusCode).json(body);
}
