import { Request, Response, NextFunction } from "express";

import { JwtVerifier } from "./services/jwt-verifier.service.js";
import { UnauthorizedError } from "./errors/auth.errors.js"
const jwtVerifier = new JwtVerifier();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      next(
        new UnauthorizedError(
          'Missing or malformed Authorization header. Expected "Bearer <token>".',
        ),
      );
      return;
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid authorization header.",
      });
    }

    const user = await jwtVerifier.verifyAccessToken(token);

    req.user = user;

    return next();
  } catch (e) {
    console.log(e);
    console.log("sohin");
    console.log(req.headers.authorization);
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Invalid or expired access token.",
    });
  }
}
