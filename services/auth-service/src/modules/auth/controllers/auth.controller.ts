import { Request, Response, NextFunction } from "express";

import { AuthService } from "../services/auth.service.js";
import { AuthenticatedRequest } from "../authenticate.middleware.js";
import { config } from "../../../config.js";

const REFRESH_TOKEN_COOKIE = "refresh_token";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/auth",
    maxAge: config.jwt.refreshTokenTtlSeconds * 1000,
  };

  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.authService.register(req.body);
      res.status(201).json({
        message: "User registered successfully",
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.login(req.body);

      res.cookie(
        REFRESH_TOKEN_COOKIE,
        result.refreshToken,
        this.refreshCookieOptions,
      );

      res.status(200).json({
        message: "Login successful",
        data: {
          accessToken: result.accessToken,
          expiresIn: config.jwt.accessTokenTtlSeconds,
          user: {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  public me = async (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      data: {
        user: req.user,
      },
    });
  };
  public refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

      if (!refreshToken) {
        res.status(401).json({
          message: "Refresh token is required.",
          data: null,
        });

        return;
      }

      const result = await this.authService.refresh(refreshToken);

      res.cookie(
        REFRESH_TOKEN_COOKIE,
        result.refreshToken,
        this.refreshCookieOptions,
      );

      res.status(200).json({
        message: "Token refreshed successfully",
        data: {
          accessToken: result.accessToken,
          expiresIn: config.jwt.accessTokenTtlSeconds,
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
      res.clearCookie(REFRESH_TOKEN_COOKIE, this.refreshCookieOptions);

      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  public logoutAll = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      await this.authService.logoutAll(req.user!.id);

      res.clearCookie(REFRESH_TOKEN_COOKIE, this.refreshCookieOptions);
      
      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
