import { readFile } from "node:fs/promises";
import { importSPKI, jwtVerify } from "jose";

import { config } from "../config.js";

export interface AuthenticatedUser {
  id: string;
  role: string;
}

export class JwtVerifier {
  private publicKeyPromise = this.loadPublicKey();

  private async loadPublicKey() {
    const key = await readFile(config.jwt.publicKeyPath, "utf8");

    return importSPKI(key, "RS256");
  }

  async verify(token: string) {
    const key = await this.publicKeyPromise;

    const { payload } = await jwtVerify(token, key, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithms: ["RS256"],
    });

    return {
      id: payload.sub as string,
      role: payload.role as string,
    };
  }
}
