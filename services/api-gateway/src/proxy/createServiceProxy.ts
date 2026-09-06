import { createProxyMiddleware } from "http-proxy-middleware";
import type { ServerResponse } from "node:http";
import { GatewayRequest } from "../middleware/authenticate.js";
import { logger } from "../logger/logger.js";
import { ApiErrorResponse } from "../shared/types/api.types.js";

export function createServiceProxy(target: string, servicePrefix: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    timeout: 15000,
    proxyTimeout: 15000,
    pathRewrite: (path) => `/${servicePrefix}${path}`,
    on: {
      proxyReq(proxyReq, req) {
        const request = req as GatewayRequest;

        // 1. CRITICAL SECURITY: Strip client-supplied user headers to prevent spoofing
        proxyReq.removeHeader("x-user-id");
        proxyReq.removeHeader("x-user-role");

        // 2. Attach verified claims only if request was authenticated by gateway
        if (request.user) {
          proxyReq.setHeader("x-user-id", request.user.id);
          proxyReq.setHeader("x-user-role", request.user.role);
        }

        // 3. Propagate correlation ID downstream
        const requestId = req.headers["x-request-id"];
        if (requestId) {
          proxyReq.setHeader("x-request-id", requestId);
        }
      },
      error(err, req, res) {
        const requestId = (req.headers["x-request-id"] as string) || "unknown";
        logger.error(`Proxy error forwarding to service '${servicePrefix}'`, err, {
          service: servicePrefix,
          target,
          url: req.url,
          requestId,
        });

        const serverRes = res as ServerResponse;
        if (!serverRes.headersSent) {
          interface NetworkError extends Error {
            code?: string;
          }
          const netErr = err as NetworkError;
          const isTimeout = netErr.code === "ETIMEDOUT" || netErr.code === "ESOCKETTIMEDOUT";
          const statusCode = isTimeout ? 504 : 502;
          const errorCode = isTimeout ? "GATEWAY_TIMEOUT" : "BAD_GATEWAY";
          const message = isTimeout
            ? `Downstream service '${servicePrefix}' timed out.`
            : `Downstream service '${servicePrefix}' is currently unreachable.`;

          const errorPayload: ApiErrorResponse = {
            success: false,
            error: {
              code: errorCode,
              message,
              requestId,
            },
          };

          serverRes.writeHead(statusCode, { "Content-Type": "application/json" });
          serverRes.end(JSON.stringify(errorPayload));
        }
      },
    },
  });
}
