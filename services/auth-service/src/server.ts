import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { pool } from "./db.js";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/auth", authRoutes);

app.get("/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      service: "auth-service",
      status: "ok",
      database: "connected",
      time: result.rows[0].now,
    });
  } catch {
    res.status(500).json({
      service: "auth-service",
      status: "error",
      database: "disconnected",
    });
  }
});
app.use(errorHandler);

async function start() {
  try {
    await pool.query("SELECT 1");

    console.log("Connected to PostgreSQL");

    app.listen(config.port, () => {
      console.log(`Auth service running on port ${config.port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();
