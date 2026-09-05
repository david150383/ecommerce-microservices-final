import { Router } from "express";
import { config } from "../../../config.js";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../authenticate.middleware.js";
import { validate } from '../../../middleware/validate.middleware.js';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.schema.js';
import { UserRepository } from "../repositories/user.repository.js"
import { RefreshSessionRepository } from "../repositories/refresh-session.repository.js"
import { JwtService } from "../services/jwt.service.js"
import { RefreshTokenService } from "../services/refresh-token.service.js"
import { RefreshSessionService } from "../services/refresh-session.service.js"
import { AuthService } from "../services/auth.service.js"

const router = Router();

const users = new UserRepository();
const jwtService = new JwtService();
const sessionRepository = new RefreshSessionRepository();
const tokenService = new RefreshTokenService()
const refreshSessions = new RefreshSessionService(
  sessionRepository,
  tokenService,
  config.jwt.refreshTokenTtlSeconds,
);

const authService = new AuthService(users, jwtService, refreshSessions);
const authController = new AuthController(authService);

// Public Routes
router.post("/register", validate(registerSchema, "body"), authController.register);
router.post("/login", validate(loginSchema, "body"), authController.login);

router.get("/me", authenticate, authController.me);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);

export default router;
