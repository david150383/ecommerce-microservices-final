import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

import { config } from "./config.js";
import { requestId } from "./middleware/requestId.js";
import { logger } from "./middleware/logger.js";
import { authenticate } from "./middleware/authenticate.js";
import { createServiceProxy } from "./proxy/createServiceProxy.js";

const app = express();

app.use(requestId);
app.use(logger);

app.get("/health", (_req, res) => {
  res.json({
    service: "api-gateway",
    status: "ok",
  });
});

// Public routes
app.use(
  "/auth",
  createServiceProxy(config.authServiceUrl, "auth"),
);

// Example protected routes
app.use(
  "/products",
  authenticate,
  createServiceProxy(config.productServiceUrl, "products"),
);

app.listen(config.port, () => {
  console.log(`Gateway running on ${config.port}`);
});
