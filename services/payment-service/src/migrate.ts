import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { pool } from "./db.js";

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function run() {
  await ensureMigrationsTable();

  const migrationsDir = path.join(process.cwd(), "migrations");

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = file.replace(".sql", "");

    const existing = await pool.query(
      "SELECT version FROM schema_migrations WHERE version = $1",
      [version],
    );

    if (existing.rowCount) {
      console.log(`✓ Skipping ${version}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(sql);

      await client.query("INSERT INTO schema_migrations(version) VALUES($1)", [
        version,
      ]);

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
