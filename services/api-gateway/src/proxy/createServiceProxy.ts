import { createProxyMiddleware } from "http-proxy-middleware";

import { GatewayRequest } from "../middleware/authenticate.js";

export function createServiceProxy(target: string, servicePrefix: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => `/${servicePrefix}${path}`,
    on: {
      proxyReq(proxyReq, req) {
        const request = req as GatewayRequest;

        if (request.user) {
          proxyReq.setHeader("x-user-id", request.user.id);

          proxyReq.setHeader("x-user-role", request.user.role);
        }

        const requestId = req.headers["x-request-id"];

        if (requestId) {
          proxyReq.setHeader("x-request-id", requestId);
        }
      },
    },
  });
}
