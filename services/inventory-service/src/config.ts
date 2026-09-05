import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3004),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DB_HOST: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1).default("ecommerce"),
  DB_PASSWORD: z.string().min(1).default("ecommerce"),
  DB_NAME: z.string().min(1).default("inventory_db"),

  REDIS_URL: z.string().default("redis://localhost:6379"),
  RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
  RABBITMQ_EXCHANGE: z.string().default("ecommerce.events"),

  JWT_PUBLIC_KEY_PATH: z.string().min(1).default("../../keys/public.pem"),
  JWT_ISSUER: z.string().min(1).default("auth-service"),
  JWT_AUDIENCE: z.string().min(1).default("ecommerce-api"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment configuration in inventory-service:");
  for (const issue of parsedEnv.error.issues) {
    console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsedEnv.data;

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
  redisUrl: env.REDIS_URL,
  rabbitmq: {
    url: env.RABBITMQ_URL,
    exchange: env.RABBITMQ_EXCHANGE,
  },
  jwt: {
    publicKeyPath: env.JWT_PUBLIC_KEY_PATH,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  },
};
