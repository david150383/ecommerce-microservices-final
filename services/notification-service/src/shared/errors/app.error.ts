export abstract class AppError<TDetails = unknown> extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly details: TDetails = undefined as TDetails,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  readonly code = "BAD_REQUEST";

  constructor(message = "Bad request.") {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message = "Authentication credentials are invalid or missing.") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";

  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code: string = "RESOURCE_NOT_FOUND";

  constructor(resourceName: string, identifier: string | number) {
    super(`${resourceName} with identifier '${identifier}' was not found.`);
  }
}

export class ConflictError extends AppError<unknown[]> {
  readonly statusCode = 409;
  readonly code: string = "RESOURCE_CONFLICT";

  constructor(message: string, details: unknown[] = []) {
    super(message, details);
  }
}

export interface ValidationDetail {
  field: string;
  message: string;
  code: string;
}

export class ValidationError extends AppError<ValidationDetail[]> {
  readonly statusCode = 400;
  readonly code: string = "VALIDATION_FAILED";

  constructor(message = "Validation failed.", details: ValidationDetail[] = []) {
    super(message, details);
  }
}
