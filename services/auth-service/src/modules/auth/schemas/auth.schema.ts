import { z } from "zod";

export const UserRoleSchema = z.enum(["CUSTOMER", "ADMIN", "SUPPORT"]);

export const ClientTypeSchema = z.enum(["WEB", "MOBILE", "DESKTOP"]);

export const registerSchema = z.object({
  email: z.email({ message: "Invalid email address format" }).trim().toLowerCase(),

  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(128, { message: "Password must not exceed 128 characters" })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[0-9]/, {
      message: "Password must contain at least one number",
    }),

  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),

  role: UserRoleSchema.default("CUSTOMER"),
});

export const loginSchema = z.object({
  email: z.email({ message: "Invalid email address format" }).trim().toLowerCase(),

  password: z.string().min(1, {
    message: "Password is required",
  }),

  client_type: ClientTypeSchema.default("WEB"),

  device_id: z.string().trim().max(255).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(16).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;

export type UserRole = z.infer<typeof UserRoleSchema>;
export type ClientType = z.infer<typeof ClientTypeSchema>;
