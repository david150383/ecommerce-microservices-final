import argon2 from "argon2";
import { UserRepository } from "../repositories/user.repository.js";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  AccountInactiveError,
} from "../errors/auth.errors.js";
import { JwtService } from "./jwt.service.js";
import { RefreshSessionService } from "./refresh-session.service.js";
import { RegisterInput, LoginInput } from "../schemas/auth.schema.js";

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly jwtService: JwtService,
    private readonly refreshSessions: RefreshSessionService,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.users.findByEmail(input.email);

    if (existing) {
      throw new EmailAlreadyExistsError(input.email);
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });

    const user = await this.users.create({
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      role: input.role,
      password_hash: passwordHash,
    });

    return user;
  }

  async login(input: LoginInput) {
    const user = await this.users.findByEmail(input.email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new AccountInactiveError();
    }

    const validPassword = await argon2.verify(user.passwordHash, input.password);

    if (!validPassword) {
      throw new InvalidCredentialsError();
    }

    const accessToken = await this.jwtService.createAccessToken({
      id: user.id,
      role: user.role,
    });

    const refreshSession = await this.refreshSessions.createSession({
      userId: user.id,
      clientType: input.client_type,
      ...(input.device_id !== undefined ? { deviceId: input.device_id } : {}),
    });

    return {
      user,
      accessToken,
      refreshToken: refreshSession.token,
      refreshTokenExpiresAt: refreshSession.expiresAt,
    };
  }

  async refresh(refreshToken: string) {
    const result = await this.refreshSessions.rotate(refreshToken);

    const user = await this.users.findById(result.userId);

    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    if (!user.isActive) {
      throw new AccountInactiveError();
    }

    const accessToken = await this.jwtService.createAccessToken({
      id: user.id,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    };
  }

  async logout(refreshToken: string) {
    await this.refreshSessions.revoke(refreshToken);
  }

  async logoutAll(userId: string) {
    await this.refreshSessions.revokeAllSessions(userId);
  }
}
