import { Request, Response, NextFunction } from "express";

import { JwtVerifier } from "./services/jwt-verifier.service.js";
import { UnauthorizedError } from "./errors/auth.errors.js";
const jwtVerifier = new JwtVerifier();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return next(
        new UnauthorizedError(
          'Missing or malformed Authorization header. Expected "Bearer <token>".',
        ),
      );
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return next(
        new UnauthorizedError('Invalid authorization header format. Expected "Bearer <token>".'),
      );
    }

    const user = await jwtVerifier.verifyAccessToken(token);

    req.user = user;

    return next();
  } catch (_error) {
    return next(new UnauthorizedError("Invalid or expired access token."));
  }
}
