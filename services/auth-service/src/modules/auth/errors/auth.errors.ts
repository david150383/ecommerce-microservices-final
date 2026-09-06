import { AppError, ConflictError } from "../../../shared/errors/app.error.js";

export class EmailAlreadyExistsError extends ConflictError {
  override readonly code = "EMAIL_ALREADY_EXISTS";

  constructor(_email: string) {
    super("An account with this email already exists.", [
      {
        field: "email",
        code: "EMAIL_ALREADY_EXISTS",
      },
    ]);
  }
}

export class InvalidCredentialsError extends AppError {
  readonly statusCode = 401;
  readonly code = "INVALID_CREDENTIALS";

  constructor(message = "Authentication credentials are invalid or missing.") {
    super(message);
  }
}

export class InvalidRefreshTokenError extends AppError {
  readonly statusCode = 401;
  readonly code = "INVALID_REFRESH_TOKEN";

  constructor(message = "Invalid or expired refresh token.") {
    super(message);
  }
}

export class RefreshTokenReuseDetectedError extends AppError {
  readonly statusCode = 401;
  readonly code = "REFRESH_TOKEN_REUSE_DETECTED";

  constructor(message = "Refresh token reuse detected.") {
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

export class AccountInactiveError extends AppError {
  readonly statusCode = 403;
  readonly code = "ACCOUNT_INACTIVE";

  constructor(message = "This user account has been deactivated.") {
    super(message);
  }
}
