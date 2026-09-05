import crypto from "node:crypto";

export class RefreshTokenService {
  generateToken(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
