export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Array<{ field: string; issue: string }>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Array<{ field: string; issue: string }>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(409, "CONFLICT", message);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Validation failed",
    details?: Array<{ field: string; issue: string }>,
  ) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class PremiumRequiredError extends AppError {
  constructor(message = "Premium subscription required") {
    super(403, "PREMIUM_REQUIRED", message);
  }
}

export class FreeQuotaExceededError extends AppError {
  constructor(message = "Free tier quota exceeded") {
    super(403, "FREE_QUOTA_EXCEEDED", message);
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message = "Duplicate request detected") {
    super(409, "IDEMPOTENCY_CONFLICT", message);
  }
}
