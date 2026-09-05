import { readFile } from "node:fs/promises";
import { importSPKI, jwtVerify } from "jose";

import { config } from "../../../config.js";

export interface AuthenticatedUser {
  id: string;
  role: string;
}

export class JwtVerifier {
  private publicKeyPromise = this.loadPublicKey();

  private async loadPublicKey() {
    const publicKey = await readFile(config.jwt.publicKeyPath, "utf8");

    return importSPKI(publicKey, "RS256");
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    const publicKey = await this.publicKeyPromise;

    const { payload } = await jwtVerify(token, publicKey, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithms: ["RS256"],
    });

    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      throw new Error("INVALID_TOKEN_CLAIMS");
    }

    return {
      id: payload.sub,
      role: payload.role,
    };
  }
}
