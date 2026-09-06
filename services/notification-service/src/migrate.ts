import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import pg from "pg";
import { pool } from "./db.js";
import { config } from "./config.js";

const { Client } = pg;

async function ensureDatabaseExists() {
  const adminClient = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: "postgres",
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [
      config.db.database,
    ]);

    if (res.rowCount === 0) {
      console.log(`Database '${config.db.database}' does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${config.db.database}"`);
      console.log(`✓ Database '${config.db.database}' created successfully.`);
    }
  } catch (err) {
    console.warn(`Could not verify/create database via 'postgres' db: ${(err as Error).message}`);
  } finally {
    try {
      await adminClient.end();
    } catch {
      // ignore
    }
  }
}

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function run() {
  await ensureDatabaseExists();
  await ensureMigrationsTable();

  const migrationsDir = path.join(process.cwd(), "migrations");

  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const version = file.replace(".sql", "");

    const existing = await pool.query("SELECT version FROM schema_migrations WHERE version = $1", [
      version,
    ]);

    if (existing.rowCount) {
      console.log(`✓ Skipping ${version}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(sql);

      await client.query("INSERT INTO schema_migrations(version) VALUES($1)", [version]);

      await client.query("COMMIT");

      console.log(`✓ Applied ${version}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
