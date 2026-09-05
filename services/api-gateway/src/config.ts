import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  AUTH_SERVICE_URL: z.string().url().default("http://localhost:3001"),
  PRODUCT_SERVICE_URL: z.string().url().default("http://localhost:3002"),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_PUBLIC_KEY_PATH: z.string().min(1),
  JWT_ISSUER: z.string().min(1).default("auth-service"),
  JWT_AUDIENCE: z.string().min(1).default("ecommerce-api"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables in api-gateway:");
  for (const issue of parsedEnv.error.issues) {
    console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsedEnv.data;

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  authServiceUrl: env.AUTH_SERVICE_URL,
  productServiceUrl: env.PRODUCT_SERVICE_URL,
  redisUrl: env.REDIS_URL,
  jwt: {
    publicKeyPath: env.JWT_PUBLIC_KEY_PATH,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  },
};
