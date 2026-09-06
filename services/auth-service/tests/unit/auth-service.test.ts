import { jest } from "@jest/globals";
import argon2 from "argon2";
import { AuthService } from "../../src/modules/auth/services/auth.service.js";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  AccountInactiveError,
} from "../../src/modules/auth/errors/auth.errors.js";
import { UserRepository } from "../../src/modules/auth/repositories/user.repository.js";
import { JwtService } from "../../src/modules/auth/services/jwt.service.js";
import { RefreshSessionService } from "../../src/modules/auth/services/refresh-session.service.js";

describe("AuthService (Unit)", () => {
  let mockUsers: jest.Mocked<Partial<UserRepository>>;
  let mockJwtService: jest.Mocked<Partial<JwtService>>;
  let mockRefreshSessions: jest.Mocked<Partial<RefreshSessionService>>;
  let authService: AuthService;

  beforeEach(() => {
    mockUsers = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    mockJwtService = {
      createAccessToken: jest.fn(),
    };
    mockRefreshSessions = {
      createSession: jest.fn(),
      rotate: jest.fn(),
      revoke: jest.fn(),
      revokeAllSessions: jest.fn(),
    };

    authService = new AuthService(
      mockUsers as UserRepository,
      mockJwtService as JwtService,
      mockRefreshSessions as RefreshSessionService,
    );
  });

  describe("register", () => {
    it("should throw EmailAlreadyExistsError if email is taken", async () => {
      (mockUsers.findByEmail as any).mockResolvedValue({
        id: "123",
        email: "taken@example.com",
      });

      await expect(
        authService.register({
          email: "taken@example.com",
          password: "Password123!",
          first_name: "Taken",
          last_name: "User",
          role: "CUSTOMER",
        }),
      ).rejects.toThrow(EmailAlreadyExistsError);
    });

    it("should hash password and create new user", async () => {
      (mockUsers.findByEmail as any).mockResolvedValue(null);
      (mockUsers.create as any).mockResolvedValue({
        id: "user-123",
        email: "new@example.com",
        firstName: "New",
        lastName: "User",
        role: "CUSTOMER",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await authService.register({
        email: "new@example.com",
        password: "Password123!",
        first_name: "New",
        last_name: "User",
        role: "CUSTOMER",
      });

      expect(user.id).toBe("user-123");
      expect(mockUsers.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("login", () => {
    it("should throw InvalidCredentialsError if user is not found", async () => {
      (mockUsers.findByEmail as any).mockResolvedValue(null);

      await expect(
        authService.login({
          email: "nonexistent@example.com",
          password: "Password123!",
          client_type: "WEB",
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should throw AccountInactiveError if user is disabled", async () => {
      (mockUsers.findByEmail as any).mockResolvedValue({
        id: "user-inactive",
        email: "inactive@example.com",
        isActive: false,
      });

      await expect(
        authService.login({
          email: "inactive@example.com",
          password: "Password123!",
          client_type: "WEB",
        }),
      ).rejects.toThrow(AccountInactiveError);
    });

    it("should throw InvalidCredentialsError if password does not match", async () => {
      const hash = await argon2.hash("RealPassword123!", {
        type: argon2.argon2id,
      });

      (mockUsers.findByEmail as any).mockResolvedValue({
        id: "user-valid",
        email: "valid@example.com",
        passwordHash: hash,
        isActive: true,
      });

      await expect(
        authService.login({
          email: "valid@example.com",
          password: "WrongPassword!",
          client_type: "WEB",
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should return tokens and user upon successful credentials match", async () => {
      const hash = await argon2.hash("CorrectPassword123!", {
        type: argon2.argon2id,
      });

      (mockUsers.findByEmail as any).mockResolvedValue({
        id: "user-ok",
        email: "ok@example.com",
        passwordHash: hash,
        role: "CUSTOMER",
        isActive: true,
      });

      (mockJwtService.createAccessToken as any).mockResolvedValue("mocked-jwt-token");
      (mockRefreshSessions.createSession as any).mockResolvedValue({
        token: "mocked-refresh-token",
        expiresAt: new Date(Date.now() + 86400000),
      });

      const result = await authService.login({
        email: "ok@example.com",
        password: "CorrectPassword123!",
        client_type: "WEB",
      });

      expect(result.accessToken).toBe("mocked-jwt-token");
      expect(result.refreshToken).toBe("mocked-refresh-token");
      expect(result.user.id).toBe("user-ok");
    });
  });
});
