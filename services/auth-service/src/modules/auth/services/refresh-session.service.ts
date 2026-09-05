import crypto from "node:crypto";
import { RefreshSessionRepository } from "../repositories/refresh-session.repository.js";
import { RefreshTokenService } from "./refresh-token.service.js"
import { withTransaction } from "../../../db.js";
import {
  InvalidRefreshTokenError,
  RefreshTokenReuseDetectedError,
} from "../errors/auth.errors.js";
import { CreateSessionInput } from "../types/user.types.js"
export class RefreshSessionService {
  constructor(
    private readonly repository: RefreshSessionRepository,
    private readonly tokenService: RefreshTokenService,
    private readonly refreshTokenTtlSeconds: number,
  ) {}
  async createSession(data: CreateSessionInput) {
    const token = this.tokenService.generateToken();

    const tokenHash = this.tokenService.hashToken(token);
    const familyId = crypto.randomUUID();

    const expiresAt = this.getRefreshTokenExpiresAt();

    await this.repository.create({
      userId: data.userId,
      familyId,
      tokenHash,
      clientType: data.clientType,
      ...(data.deviceId !== undefined ? { deviceId: data.deviceId } : {}),
      expiresAt,
    });

    return {
      token,
      expiresAt,
    };
  }

  async revoke(refreshToken: string) {
    const tokenHash = this.tokenService.hashToken(refreshToken);

    const session = await this.repository.findByTokenHash(tokenHash);

    if (!session) {
      return;
    }

    await this.repository.revoke(session.id);
  }

  async rotate(token: string) {
    const tokenHash = this.tokenService.hashToken(token);

    return withTransaction(async (client) => {
      const session = await this.repository.findByTokenHash(tokenHash, client);

      if (!session) {
        throw new InvalidRefreshTokenError();
      }

      if (session.revokedAt) {
        await this.repository.revokeFamily(session.familyId, client);

        throw new RefreshTokenReuseDetectedError();
      }

      if (session.expiresAt <= new Date()) {
        await this.repository.revoke(session.id, client);

        throw new InvalidRefreshTokenError();
      }

      const newToken = this.tokenService.generateToken();

      const newTokenHash = this.tokenService.hashToken(newToken);

      const newExpiresAt = this.getRefreshTokenExpiresAt();

      await this.repository.revoke(session.id, client);

      await this.repository.create(
        {
          userId: session.userId,
          familyId: session.familyId,
          tokenHash: newTokenHash,
          clientType: session.clientType,
          ...(session.deviceId !== null ? { deviceId: session.deviceId } : {}),
          expiresAt: newExpiresAt,
        },
        client,
      );

      return {
        userId: session.userId,
        refreshToken: newToken,
        refreshTokenExpiresAt: newExpiresAt,
      };
    });
  }

  async revokeAllSessions(userId: string) {
    await this.repository.revokeAllForUser(userId);
  }

  private getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.refreshTokenTtlSeconds * 1000);
  }
}
