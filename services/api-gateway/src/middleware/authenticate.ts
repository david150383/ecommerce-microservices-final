import { Request, Response, NextFunction } from "express";

import { JwtVerifier } from "../services/JwtVerifier.js";

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
) {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
      });
    }

    const [scheme, token] = auth.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
      });
    }

    req.user = await verifier.verify(token);

    next();
  } catch {
    res.status(401).json({
      error: "UNAUTHORIZED",
    });
  }
}
