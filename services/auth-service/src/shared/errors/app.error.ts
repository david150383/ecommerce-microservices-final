export abstract class AppError<TDetails = unknown> extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly details: TDetails = undefined as TDetails,
  ) {
    console.log(details);
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}


export interface ValidationDetail {
  field: string;
  message: string;
  code: string;
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "RESOURCE_NOT_FOUND";

  constructor(resourceName: string, identifier: string | number) {
    super(`${resourceName} with identifier '${identifier}' was not found.`);
  }
}

export class ConflictError extends AppError<unknown[]> {
  readonly statusCode = 409;
  readonly code = "RESOURCE_CONFLICT";

  constructor(message: string, details: unknown[] = []) {
    super(message, details);
  }
}

export class ValidationError extends AppError<ValidationDetail[]> {
  readonly statusCode = 400;
  readonly code = "VALIDATION_FAILED";

  constructor(
    message = "Validation failed.",
    details: ValidationDetail[] = [],
  ) {
    super(message, details);
  }
}
