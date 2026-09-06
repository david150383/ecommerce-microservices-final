import { Pool, PoolClient } from "pg";
import { config } from "./config.js";
import { logger } from "./shared/logger/logger.js";

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  logger.error("Unexpected error on idle PostgreSQL client", err);
});

export async function checkDbHealth(): Promise<boolean> {
  try {
    const res = await pool.query("SELECT 1 AS health");
    return res.rowCount !== null && res.rowCount > 0;
  } catch (error) {
    logger.error("Database health check failed", error);
    return false;
  }
}

export async function closeDbPool(): Promise<void> {
  try {
    await pool.end();
    logger.info("PostgreSQL connection pool closed");
  } catch (error) {
    logger.error("Error closing PostgreSQL pool", error);
  }
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}
