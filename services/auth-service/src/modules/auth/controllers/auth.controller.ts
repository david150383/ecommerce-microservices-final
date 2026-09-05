import { Request, Response, NextFunction } from "express";

import { AuthService } from "../services/auth.service.js";
import { AuthenticatedRequest } from "../authenticate.middleware.js";
import { config } from "../../../config.js";
import { sendSuccess, sendCreated } from "../../../shared/utils/response.util.js";
import { UnauthorizedError } from "../errors/auth.errors.js";
import {
  RegisterResponseData,
  LoginResponseData,
  RefreshResponseData,
  MeResponseData,
} from "../types/user.types.js";
import {
  ApiResponse,
  ApiErrorResponse,
} from "../../../shared/types/api.types.js";

const REFRESH_TOKEN_COOKIE = "refresh_token";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly refreshCookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax" as const,
    path: "/auth",
    maxAge: config.jwt.refreshTokenTtlSeconds * 1000,
  };

  public register = async (
    req: Request,
    res: Response<ApiResponse<RegisterResponseData>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const user = await this.authService.register(req.body);

      return sendCreated(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
        "User registered successfully",
      );
    } catch (error) {
      return next(error);
    }
  };

  public login = async (
    req: Request,
    res: Response<ApiResponse<LoginResponseData>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const result = await this.authService.login(req.body);

      res.cookie(
        REFRESH_TOKEN_COOKIE,
        result.refreshToken,
        this.refreshCookieOptions,
      );

      return sendSuccess(
        res,
        {
          accessToken: result.accessToken,
          expiresIn: config.jwt.accessTokenTtlSeconds,
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
          },
        },
        "Login successful",
      );
    } catch (error) {
      return next(error);
    }
  };

  public me = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<MeResponseData>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      return sendSuccess(res, {
        user: req.user,
      });
    } catch (error) {
      return next(error);
    }
  };

  public refresh = async (
    req: Request,
    res: Response<ApiResponse<RefreshResponseData>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const refreshToken =
        req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedError("Refresh token is required.");
      }

      const result = await this.authService.refresh(refreshToken);

      res.cookie(
        REFRESH_TOKEN_COOKIE,
        result.refreshToken,
        this.refreshCookieOptions,
      );

      return sendSuccess(
        res,
        {
          accessToken: result.accessToken,
          expiresIn: config.jwt.accessTokenTtlSeconds,
        },
        "Token refreshed successfully",
      );
    } catch (error) {
      return next(error);
    }
  };

  public logout = async (
    req: Request,
    res: Response<void | ApiErrorResponse>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const refreshToken =
        req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
      res.clearCookie(REFRESH_TOKEN_COOKIE, this.refreshCookieOptions);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  public logoutAll = async (
    req: AuthenticatedRequest,
    res: Response<void | ApiErrorResponse>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("Authentication required.");
      }

      await this.authService.logoutAll(req.user.id);

      res.clearCookie(REFRESH_TOKEN_COOKIE, this.refreshCookieOptions);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
