import { Request, Response, NextFunction } from "express";
import { readFile } from "node:fs/promises";
import { importSPKI, jwtVerify } from "jose";
import { config } from "../config.js";
import { UnauthorizedError, ForbiddenError } from "../shared/errors/app.error.js";

export interface AuthenticatedUser {
  id: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

let publicKeyPromise: Promise<any> | null = null;

async function getPublicKey() {
  if (!publicKeyPromise) {
    publicKeyPromise = (async () => {
      const key = await readFile(config.jwt.publicKeyPath, "utf8");
      return importSPKI(key, "RS256");
    })();
  }
  return publicKeyPromise;
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  // Option 1: Identity forwarded by API Gateway
  const gatewayUserId = req.headers["x-user-id"];
  const gatewayUserRole = req.headers["x-user-role"];

  if (typeof gatewayUserId === "string" && typeof gatewayUserRole === "string") {
    req.user = {
      id: gatewayUserId,
      role: gatewayUserRole,
    };
    return next();
  }

  // Option 2: Direct Bearer Token verification
  const authorization = req.headers.authorization;
  if (!authorization) {
    return next(
      new UnauthorizedError("Authentication required. Missing Bearer token or gateway context."),
    );
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(new UnauthorizedError("Invalid authorization format. Expected 'Bearer <token>'."));
  }

  try {
    const key = await getPublicKey();
    const { payload } = await jwtVerify(token, key, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithms: ["RS256"],
    });

    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      return next(new UnauthorizedError("Invalid token claims."));
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    return next();
  } catch (_error) {
    return next(new UnauthorizedError("Invalid or expired access token."));
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions for this resource."));
    }

    next();
  };
}
