import { readFile } from "node:fs/promises";
import { importPKCS8, SignJWT } from "jose";

import { config } from "../../../config.js";
import { UserRole } from "../schemas/auth.schema.js"

export class JwtService {
  private privateKeyPromise = this.loadPrivateKey();

  private async loadPrivateKey() {
    const privateKey = await readFile(config.jwt.privateKeyPath, "utf8");

    return importPKCS8(privateKey, "RS256");
  }

  async createAccessToken(user: {
    id: string;
    role: UserRole;
  }): Promise<string> {
    const privateKey = await this.privateKeyPromise;

    return new SignJWT({
      role: user.role,
    })
      .setProtectedHeader({
        alg: "RS256",
        typ: "JWT",
      })
      .setSubject(user.id)
      .setIssuer(config.jwt.issuer)
      .setAudience(config.jwt.audience)
      .setIssuedAt()
      .setExpirationTime(config.jwt.accessTokenTtl)
      .sign(privateKey);
  }
}
