import { Redis } from "ioredis";
import { config } from "./config.js";
import { logger } from "./logger/logger.js";

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redis.on("connect", () => {
  logger.info("Connected to Redis successfully", { url: config.redisUrl });
});

redis.on("error", (error) => {
  logger.error("Redis client encountered an error", error);
});

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const reply = await redis.ping();
    return reply === "PONG";
  } catch (error) {
    logger.error("Redis health check failed", error);
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info("Redis connection closed cleanly");
  } catch (error) {
    logger.error("Error closing Redis connection", error);
  }
}
