export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    /**
     * Optional structured details — shown to the client alongside the error
     * (e.g. per-field validation issues, provider failure reason).
     */
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
    this.name = "BadRequestError";
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, "UNPROCESSABLE", details);
    this.name = "UnprocessableError";
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", public readonly retryAfterSeconds?: number) {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    this.name = "TooManyRequestsError";
  }
}

/**
 * RFC 7807 Problem Details envelope — used by the global error handler so
 * client SDKs (and humans) can discriminate errors programmatically.
 *
 * We stay close to the RFC while adding a `code` string (machine-readable) and
 * `requestId` (correlation) that are common additions in the wild.
 */
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  requestId?: string;
  errors?: unknown;
  retryAfter?: number;
}
