import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { RedisReply } from "rate-limit-redis";
import { redis } from "../../../redis.js";
import { config } from "../../../config.js";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../authenticate.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";
import { sendError } from "../../../shared/utils/response.util.js";
import { registerSchema, loginSchema, refreshSchema } from "../schemas/auth.schema.js";
import { UserRepository } from "../repositories/user.repository.js";
import { RefreshSessionRepository } from "../repositories/refresh-session.repository.js";
import { JwtService } from "../services/jwt.service.js";
import { RefreshTokenService } from "../services/refresh-token.service.js";
import { RefreshSessionService } from "../services/refresh-session.service.js";
import { AuthService } from "../services/auth.service.js";

const router = Router();

// Distributed Redis rate limiting for auth mutations (30 attempts per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redis.call(args[0]!, ...args.slice(1)) as Promise<RedisReply>,
    prefix: "rl:auth:",
  }),
  handler: (req, res) => {
    const requestId = (req.headers["x-request-id"] as string) || "unknown";
    sendError(
      res,
      429,
      "TOO_MANY_REQUESTS",
      "Too many authentication requests, please try again later.",
      requestId,
    );
  },
});

const users = new UserRepository();
const jwtService = new JwtService();
const sessionRepository = new RefreshSessionRepository();
const tokenService = new RefreshTokenService();
const refreshSessions = new RefreshSessionService(
  sessionRepository,
  tokenService,
  config.jwt.refreshTokenTtlSeconds,
);

const authService = new AuthService(users, jwtService, refreshSessions);
const authController = new AuthController(authService);

// Public Routes
router.post("/register", authLimiter, validate(registerSchema, "body"), authController.register);

router.post("/login", authLimiter, validate(loginSchema, "body"), authController.login);

router.post("/refresh", authLimiter, validate(refreshSchema, "body"), authController.refresh);

router.post("/logout", authController.logout);

// Protected Routes
router.get("/me", authenticate, authController.me);
router.post("/logout-all", authenticate, authController.logoutAll);

export default router;
