import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";
import { ValidationError } from "../shared/errors/app.error.js";

type RequestSource = "body" | "query" | "params";

export function validate(schema: ZodType, source: RequestSource = "body") {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedDetails = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        }));
        next(
          new ValidationError("Request validation failed", formattedDetails),
        );
      } else {
        next(error);
      }
    }
  };
}
