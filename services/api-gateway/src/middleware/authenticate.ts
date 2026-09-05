import { Request, Response, NextFunction } from "express";
import { JwtVerifier } from "../services/JwtVerifier.js";
import { sendError } from "../shared/utils/response.util.js";

const verifier = new JwtVerifier();

export interface GatewayRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export async function authenticate(
  req: GatewayRequest,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  const reqId = (req.headers["x-request-id"] as string) || "unknown";

  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authorization header is missing. Expected 'Bearer <token>'.",
        reqId,
      );
    }

    const [scheme, token] = auth.split(" ");

    if (scheme !== "Bearer" || !token) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Invalid authorization header format. Expected 'Bearer <token>'.",
        reqId,
      );
    }

    req.user = await verifier.verify(token);

    return next();
  } catch (_error) {
    return sendError(
      res,
      401,
      "UNAUTHORIZED",
      "Invalid or expired access token.",
      reqId,
    );
  }
}
