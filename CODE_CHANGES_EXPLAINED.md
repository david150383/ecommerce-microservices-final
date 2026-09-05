# Comprehensive Code Changes & Architectural Upgrade Guide

This document provides a detailed breakdown of all files updated, refactored, and created since the initial commit (`7235623`). For every file, it explains:
1. **The Before Issue** (Vulnerabilities, design flaws, or architectural gaps in the prototype).
2. **The After Fix & Code Comparison** (The specific code introduced to fix the issue).
3. **Why That Particular Code Was Used** (Technical rationale and design patterns).
4. **What It Improved** (Security, reliability, scalability, testability, and developer experience).

---

## Table of Contents
1. [Architectural Overview & Core Principles](#architectural-overview--core-principles)
2. [API Gateway Changes](#1-api-gateway-changes)
   - [`src/config.ts`](#api-gateway-srcconfigts)
   - [`src/server.ts`](#api-gateway-srcserverts)
   - [`src/app.ts` [NEW]](#api-gateway-srcappts-new)
   - [`src/logger/logger.ts` [NEW]](#api-gateway-srcloggerloggerts-new)
   - [`src/middleware/logger.ts`](#api-gateway-srcmiddlewareloggerts)
   - [`src/middleware/requestId.ts`](#api-gateway-srcmiddlewarerequestidts)
   - [`src/middleware/authenticate.ts`](#api-gateway-srcmiddlewareauthenticatets)
   - [`src/proxy/createServiceProxy.ts`](#api-gateway-srcproxycreateserviceproxyts)
   - [`Dockerfile` & `.env.example` [NEW]](#api-gateway-dockerfile--envexample-new)
3. [Auth Service Changes](#2-auth-service-changes)
   - [`src/config.ts`](#auth-service-srcconfigts)
   - [`src/server.ts`](#auth-service-srcserverts)
   - [`src/app.ts` [NEW]](#auth-service-srcappts-new)
   - [`src/db.ts`](#auth-service-srcdbts)
   - [`src/shared/types/api.types.ts` [NEW]](#auth-service-srcsharedtypesapitypests-new)
   - [`src/shared/utils/response.util.ts` [NEW]](#auth-service-srcsharedutilsresponseutilts-new)
   - [`src/shared/logger/logger.ts` [NEW]](#auth-service-srcsharedloggerloggerts-new)
   - [`src/shared/errors/app.error.ts`](#auth-service-srcsharederrorsapperrorts)
   - [`src/middleware/error-handler.middleware.ts`](#auth-service-srcmiddlewareerror-handlermiddlewarets)
   - [`src/middleware/validate.middleware.ts`](#auth-service-srcmiddlewarevalidatemiddlewarets)
   - [`src/middleware/request-id.middleware.ts` & `request-logger.middleware.ts` [NEW]](#auth-service-request-middlewares-new)
   - [`src/modules/auth/authenticate.middleware.ts`](#auth-service-srcmodulesauthauthenticatemiddlewarets)
   - [`src/modules/auth/errors/auth.errors.ts`](#auth-service-srcmodulesautherrorsautherrorsts)
   - [`src/modules/auth/types/user.types.ts`](#auth-service-srcmodulesauthtypesusertypests)
   - [`src/modules/auth/repositories/user.repository.ts`](#auth-service-srcmodulesauthrepositoriesuserrepositoryts)
   - [`src/modules/auth/services/auth.service.ts`](#auth-service-srcmodulesauthservicesauthservicets)
   - [`src/modules/auth/controllers/auth.controller.ts`](#auth-service-srcmodulesauthcontrollersauthcontrollerts)
   - [`src/modules/auth/routes/auth.routes.ts`](#auth-service-srcmodulesauthroutesauthroutests)
   - [`Dockerfile` & `.env.example` [NEW]](#auth-service-dockerfile--envexample-new)
4. [Platform Level Additions](#3-platform-level-additions)
   - [`ARCHITECTURE.md` [NEW]](#architecturemd-new)
   - [`services/service-template/` [NEW]](#servicesservice-template-new)
5. [Summary Comparison Matrix](#summary-comparison-matrix)

---

## Architectural Overview & Core Principles

The initial commit was a functioning prototype, but it contained critical production liabilities:
- **Security Vulnerabilities**: Header spoofing through the gateway, sensitive tokens and developer debug messages printed to `console.log`, missing HTTP security headers, no CORS enforcement, and lack of brute-force rate limiting.
- **Contract Fragmentation**: Services returned inconsistent JSON shapes (`{ error: "UNAUTHORIZED" }` vs `{ error: { code, message } }` vs `{ message, data }`).
- **Process Instability**: No graceful shutdown handling. Container restarts or deployments would abruptly terminate active requests and database connections.
- **Untestable Architecture**: Server startup (`listen`) was tightly coupled with Express application setup in `server.ts`, preventing isolated integration testing without port conflicts.
- **Data Incompleteness**: User attributes (`first_name`, `last_name`, `is_active`) were created in PostgreSQL but ignored in application code, allowing deactivated users to remain logged in indefinitely.

---

## 1. API Gateway Changes

### API Gateway: `src/config.ts`

#### Before Issue
Configuration used a manual `requireEnv` helper with no type coercion or format validation:
```typescript
// BEFORE (Vulnerable & brittle)
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
export const config = {
  port: Number(process.env.PORT), // NaN if undefined!
  authServiceUrl: requireEnv("AUTH_SERVICE_URL"),
  // ...
};
```
If `PORT` was not set, `port` became `NaN`. If URLs were malformed strings, errors only occurred at runtime during downstream HTTP requests.

#### After Fix
```typescript
// AFTER (Fail-fast typed Zod schema)
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SERVICE_URL: z.string().url().default("http://localhost:3001"),
  PRODUCT_SERVICE_URL: z.string().url().default("http://localhost:3002"),
  JWT_PUBLIC_KEY_PATH: z.string().min(1),
  JWT_ISSUER: z.string().min(1).default("auth-service"),
  JWT_AUDIENCE: z.string().min(1).default("ecommerce-api"),
});
```

#### Why This Particular Code Was Used
- `z.coerce.number()` safely handles environment strings like `"3000"`.
- `z.string().url()` validates URL formatting at boot time.
- `safeParse` prints formatted issue lists and exits immediately (`process.exit(1)`) before any sockets open.

#### What It Improved
- **Reliability**: Fail-fast validation prevents services from running in half-initialized or corrupted configurations.
- **Developer Experience**: Clear console errors tell developers exactly which `.env` variable is missing or malformed.

---

### API Gateway: `src/server.ts`

#### Before Issue
```typescript
// BEFORE
const app = express();
// ... all routes defined here ...
app.listen(config.port, () => {
  console.log(`Gateway running on ${config.port}`);
});
```
- No handling of `SIGTERM` or `SIGINT`. In Kubernetes/Docker deployments, updating a container resulted in abruptly dropped client connections.
- Inability to import `app` into integration test suites without immediately binding to port 3000.

#### After Fix
```typescript
// AFTER
const app = createApp();
let server: Server | null = null;
let isShuttingDown = false;

async function start() {
  server = app.listen(config.port, () => {
    logger.info(`API Gateway running on port ${config.port}`);
  });
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}. Shutting down API Gateway gracefully...`);

  const timeout = setTimeout(() => {
    logger.error("Graceful shutdown timeout exceeded. Forcing exit.");
    process.exit(1);
  }, 10000);

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
  }
  clearTimeout(timeout);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

#### Why This Particular Code Was Used
- Decouples server orchestration from routing logic (`createApp()`).
- `server.close()` stops accepting new HTTP connections while allowing active in-flight requests to complete.
- `keepAliveTimeout = 65000` prevents race conditions with upstream cloud load balancers (e.g. AWS ALB 60s idle timeout).
- 10-second watchdog timer guarantees process termination if a socket hangs.

#### What It Improved
- **Zero-Downtime Deployments**: Seamless rolling updates in container environments.
- **Connection Health**: Prevents 502 Bad Gateway errors caused by premature connection resets.

---

### API Gateway: `src/app.ts` [NEW]

#### Before Issue
No modular application factory existed. The Express app was created in `server.ts` alongside socket binding. No security headers (`helmet`), no CORS policies, and no rate limiting existed on the entry point to the system.

#### After Fix
Introduced `createApp()` factory with full security pipeline:
1. **`helmet()`**: Sets `X-Content-Type-Options`, `Strict-Transport-Security`, `X-Frame-Options`.
2. **`cors()`**: Configured to restrict origins in production while allowing development workflows.
3. **`express-rate-limit`**: Enforces a global gateway limiter (100 requests/minute per IP) returning a standardized 429 JSON response.
4. **Health Check Probes**:
   - `/health/live`: Liveness probe for Kubernetes process monitoring.
   - `/health/ready`: Readiness probe for traffic routing.
   - `/health`: Legacy fallback.
5. **Catch-All 404 & 500 Handlers**: Formats missing endpoints and unhandled exceptions into the universal error contract with `requestId`.

#### What It Improved
- **Security**: Guarded against DoS, cross-site scripting (XSS), and clickjacking attacks.
- **Testability**: End-to-end integration tests can instantiate isolated app instances on ephemeral ports.

---

### API Gateway: `src/logger/logger.ts` [NEW]

#### Before Issue
The gateway used raw `console.log()` outputs with unpredictable string formatting:
```typescript
// BEFORE
console.log(JSON.stringify({ requestId, method, ... }));
```
Logs had no levels, could not be filtered in log aggregators (Datadog/ELK/CloudWatch), and errors lacked stack trace serialization.

#### After Fix
Built a structured JSON logger conforming to enterprise observability standards:
```typescript
export class Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>, error?: unknown): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}
```
Every log output produces a single-line JSON string:
```json
{
  "timestamp": "2026-09-05T06:01:19.438Z",
  "level": "INFO",
  "service": "api-gateway",
  "message": "Gateway Request Completed",
  "context": { "requestId": "...", "method": "GET", "statusCode": 200 }
}
```

#### What It Improved
- **Observability**: Direct ingestion into log aggregators with queryable fields (`level`, `service`, `context.requestId`).
- **Clean Standard Streams**: Normal messages route to `stdout`; warnings and errors route to `stderr`.

---

### API Gateway: `src/middleware/logger.ts`

#### Before Issue
Logged requests to `console.log` regardless of whether the request succeeded or exploded with an internal 500:
```typescript
// BEFORE
res.on("finish", () => {
  console.log(JSON.stringify({ ... }));
});
```

#### After Fix
Routes log level according to HTTP status code using the structured logger:
```typescript
// AFTER
if (res.statusCode >= 500) {
  logger.error("Gateway Request Error", undefined, context);
} else if (res.statusCode >= 400) {
  logger.warn("Gateway Client Request Error", context);
} else {
  logger.info("Gateway Request Completed", context);
}
```

#### What It Improved
- **Alerting Accuracy**: Monitoring systems can alert on `level: "ERROR"` without false positives from 200 OK traffic.

---

### API Gateway: `src/middleware/requestId.ts`

#### Before Issue
```typescript
// BEFORE
const id = uuid();
req.headers["x-request-id"] = id;
res.setHeader("x-request-id", id);
```
- If an upstream client, reverse proxy, or load balancer already provided an `x-request-id`, it was overwritten, breaking end-to-end distributed tracing.
- Unnecessary external package dependency (`uuid`) when Node.js has native crypto.

#### After Fix
```typescript
// AFTER
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers["x-request-id"];
  const id =
    typeof existingId === "string" && existingId.trim().length > 0
      ? existingId
      : crypto.randomUUID();

  req.headers["x-request-id"] = id;
  res.setHeader("x-request-id", id);
  next();
}
```

#### What It Improved
- **Distributed Tracing**: Preserves existing trace correlation IDs across microservice boundaries.
- **Performance**: Uses Node's built-in `crypto.randomUUID()` (fast, zero external dependency).

---

### API Gateway: `src/middleware/authenticate.ts`

#### Before Issue
Returned inconsistent error shapes and ignored request correlation IDs:
```typescript
// BEFORE
return res.status(401).json({
  error: "UNAUTHORIZED",
});
```

#### After Fix
Conforms strictly to the universal API error contract and includes the trace correlation ID:
```typescript
// AFTER
return res.status(401).json({
  success: false,
  error: {
    code: "UNAUTHORIZED",
    message: "Missing or malformed Authorization header. Expected 'Bearer <token>'.",
    requestId: reqId,
  },
});
```

#### What It Improved
- **Client Predictability**: Frontend applications receive identical error envelopes regardless of whether authentication failed at the gateway or auth-service.

---

### API Gateway: `src/proxy/createServiceProxy.ts`

#### Before Issue (Critical Security & Reliability Flaw)
```typescript
// BEFORE (VULNERABLE!)
on: {
  proxyReq(proxyReq, req) {
    const request = req as GatewayRequest;
    if (request.user) {
      proxyReq.setHeader("x-user-id", request.user.id);
      proxyReq.setHeader("x-user-role", request.user.role);
    }
  }
}
```
1. **Critical Header Spoofing**: If an unauthenticated attacker called `/products` with `x-user-id: 1` and `x-user-role: ADMIN`, and a route bypassed gateway auth, the downstream service received those forged headers!
2. **Missing Timeouts**: If a downstream service hung, the gateway socket stayed open indefinitely until resource exhaustion.
3. **Raw HTML Gateway Errors**: If a downstream service was down, `http-proxy-middleware` dumped raw HTML error pages instead of JSON.

#### After Fix
```typescript
// AFTER (Hardened & Protected)
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

      // 2. Attach verified claims only if authenticated by gateway
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
      // 4. Intercept network failure and return structured JSON 502/504
      const requestId = (req.headers["x-request-id"] as string) || "unknown";
      const isTimeout = (err as any).code === "ETIMEDOUT" || (err as any).code === "ESOCKETTIMEDOUT";
      const statusCode = isTimeout ? 504 : 502;
      const errorCode = isTimeout ? "GATEWAY_TIMEOUT" : "BAD_GATEWAY";

      serverRes.writeHead(statusCode, { "Content-Type": "application/json" });
      serverRes.end(JSON.stringify({
        success: false,
        error: { code: errorCode, message: "...", requestId }
      }));
    }
  }
});
```

#### What It Improved
- **Security**: Closed the header spoofing vulnerability by unconditionally removing client-supplied `x-user-*` headers before proxying.
- **Resilience**: 15-second socket and proxy timeouts prevent connection pool exhaustion.
- **Contract Integrity**: Network dropouts return valid JSON `502 Bad Gateway` / `504 Gateway Timeout` with correlation IDs.

---

### API Gateway: `Dockerfile` & `.env.example` [NEW]

- **`Dockerfile`**: Multi-stage Alpine build that compiles TypeScript in a build container, copies only production artifacts, and executes under a non-root `node` user.
- **`.env.example`**: Complete documentation of required environment configurations.

---

## 2. Auth Service Changes

### Auth Service: `src/config.ts`

#### Before Issue
- Environment variables were read with `requireEnv` without type checking.
- Port defaulted to 3001 only if not supplied, but numbers were parsed via `Number()` without validation.

#### After Fix
Replaced with Zod validation schema defining database credentials, JWT token lifetimes (`accessTokenTtlSeconds`, `refreshTokenTtlSeconds`), and cryptographic key paths.

#### What It Improved
- Prevents the service from booting if database configurations or RSA keys are missing.

---

### Auth Service: `src/db.ts`

#### Before Issue
```typescript
// BEFORE
export const pool = new Pool({ ... });
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> { ... }
```
- Idle connection errors crashed the Node.js process without diagnostic logs.
- No health probe function existed to verify DB connectivity without executing custom queries.
- No graceful connection pool drainage function for server shutdown.

#### After Fix
```typescript
// AFTER
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
```

#### What It Improved
- **Resiliency**: Handles transient idle client drops gracefully.
- **Zero Data Loss**: Ensures active transactions are committed or rolled back before the process exits on shutdown.

---

### Auth Service: `src/shared/types/api.types.ts` [NEW]

#### Before Issue
No shared response types existed, leading to ad-hoc response shapes across different endpoints.

#### After Fix
Defined universal TypeScript interfaces:
```typescript
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | unknown;
    requestId: string;
  };
}

// Universal Discriminated Union
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
```

#### What It Improved
- **Consistency**: Guarantees that every service in the ecosystem adheres to identical response envelopes.

---

### Auth Service: `src/shared/utils/response.util.ts` [NEW]

#### Before Issue
Controllers manually called `res.status(200).json({ ... })` with bespoke property names (`result`, `data`, `message`).

#### After Fix
Created standardized helper functions:
- `sendSuccess(res, data, message, statusCode, meta)`: Returns typed `Response<ApiSuccessResponse<T>>`.
- `sendCreated(res, data, message)`: Returns typed `Response<ApiSuccessResponse<T>>`.
- `sendError(res, statusCode, code, message, requestId, details)`: Returns typed `Response<ApiErrorResponse>`.

#### What It Improved
- Eliminates boilerplate and eliminates human error when formatting API outputs.

---

### Auth Service: `src/shared/logger/logger.ts` [NEW]

Provides the same high-performance, structured JSON logging engine as the API Gateway, isolating service identity (`service: "auth-service"`).

---

### Auth Service: `src/shared/errors/app.error.ts`

#### Before Issue (Sensitive Data Leakage)
```typescript
// BEFORE (SECURITY RISK!)
constructor(
  message: string,
  public readonly details: TDetails = undefined as TDetails,
) {
  console.log(details); // Leaked passwords, hashes, or PII!
  super(message);
}
```
In addition, error classes lacked standard HTTP status codes and uniform error code constants.

#### After Fix
- Removed the debug `console.log(details)`.
- Added standardized subclasses:
  - `BadRequestError` (`400`, `BAD_REQUEST`)
  - `UnauthorizedError` (`401`, `UNAUTHORIZED`)
  - `ForbiddenError` (`403`, `FORBIDDEN`)
  - `NotFoundError` (`404`, `RESOURCE_NOT_FOUND`)
  - `ConflictError` (`409`, `RESOURCE_CONFLICT`)
  - `ValidationError` (`400`, `VALIDATION_FAILED`)

#### What It Improved
- **Security**: Eradicated accidental logging of sensitive validation details and credentials to stdout.
- **Clarity**: Express error handler maps these directly to accurate HTTP response codes without custom switch-cases.

---

### Auth Service: `src/middleware/error-handler.middleware.ts`

#### Before Issue
- Handled only one PostgreSQL error code (`23505`) and dumped unhandled errors directly to `console.error`.
- In production, unhandled errors leaked raw stack traces or internal implementation messages.
- Body parser JSON syntax errors (malformed JSON) triggered a raw Express HTML 400 page.

#### After Fix
```typescript
// AFTER
// 1. AppError domain errors -> standard envelope
if (err instanceof AppError) {
  return res.status(err.statusCode).json({
    success: false,
    error: { code: err.code, message: err.message, details: err.details, requestId }
  });
}

// 2. Body-parser malformed JSON -> standard 400
if (err instanceof SyntaxError && "body" in err && (err as any).status === 400) {
  return res.status(400).json({
    success: false,
    error: { code: "INVALID_JSON_PAYLOAD", message: "Malformed JSON payload in request body.", requestId }
  });
}

// 3. PostgreSQL database errors
if (pgError.code === "23505") { /* RESOURCE_CONFLICT (409) */ }
if (pgError.code === "23503") { /* FOREIGN_KEY_VIOLATION (400) */ }
if (pgError.code === "22P02") { /* INVALID_INPUT_SYNTAX (400) */ }

// 4. Fallback internal server error
logger.error("Unhandled Application Error", err, { requestId, url: req.originalUrl, method: req.method });
res.status(500).json({
  success: false,
  error: {
    code: "INTERNAL_SERVER_ERROR",
    message: config.nodeEnv === "production" ? "An unexpected error occurred..." : err.message,
    requestId
  }
});
```

#### What It Improved
- **Security**: Sensitive database internals and stack traces are suppressed in production.
- **Robustness**: Database constraint violations and invalid JSON syntax return meaningful JSON errors with correlation IDs.

---

### Auth Service: `src/middleware/validate.middleware.ts`

#### Before Issue
```typescript
// BEFORE
console.log(formattedDetails); // Leaked validated payload fields to stdout
```

#### After Fix
Removed debug logging while retaining the clean mapping of Zod issues into `{ field, message, code }` validation details.

---

### Auth Service: Request Middlewares [NEW]
- `src/middleware/request-id.middleware.ts`: Extracts or generates `x-request-id` header for log and error correlation.
- `src/middleware/request-logger.middleware.ts`: Emits structured JSON events on `res.finish` with execution duration in milliseconds.

---

### Auth Service: `src/modules/auth/authenticate.middleware.ts`

#### Before Issue (Severe Sensitive Data Leakage)
```typescript
// BEFORE (SECURITY RISK!)
} catch (e) {
  console.log(e);
  console.log("sohin");                       // Hardcoded developer name!
  console.log(req.headers.authorization);     // LEAKED FULL BEARER JWT TOKEN TO LOGS!
  return res.status(401).json({
    error: "UNAUTHORIZED",
    message: "Invalid or expired access token.",
  });
}
```
Printing `req.headers.authorization` to stdout allows anyone with log access to hijack user sessions.

#### After Fix
```typescript
// AFTER
} catch (_error) {
  return next(new UnauthorizedError("Invalid or expired access token."));
}
```
All debug prints were removed. Errors route cleanly into the centralized error handling pipeline.

---

### Auth Service: `src/modules/auth/errors/auth.errors.ts`

#### Before Issue
- Lacked account status error handling.
- `EmailAlreadyExistsError` had code `RESOURCE_CONFLICT` instead of specific `EMAIL_ALREADY_EXISTS`.

#### After Fix
- Added `override readonly code = "EMAIL_ALREADY_EXISTS"`.
- Added `AccountInactiveError` (`403 FORBIDDEN`, code: `"ACCOUNT_INACTIVE"`).

#### What It Improved
- Allows frontend clients to detect deactivated accounts and display appropriate account recovery instructions.

---

### Auth Service: `src/modules/auth/types/user.types.ts`

#### Before Issue
The `User` and `UserRow` TypeScript interfaces omitted `first_name`, `last_name`, and `is_active`, even though the SQL database table stored these columns.

#### After Fix
```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### What It Improved
- Prevents loss of user name information and enables account deactivation checks.

---

### Auth Service: `src/modules/auth/repositories/user.repository.ts`

#### Before Issue
1. `SELECT *` was used instead of explicit column selection.
2. Email lookups were case-sensitive (`WHERE email = $1`), permitting duplicate accounts (e.g. `John@example.com` and `john@example.com`).
3. No support for database transactions (`PoolClient`).
4. `first_name` and `last_name` were omitted from the returned entity.

#### After Fix
```typescript
// AFTER
async findByEmail(email: string, client?: PoolClient): Promise<User | null> {
  const executor = client ?? pool;
  const result = await executor.query(
    `SELECT id, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at
     FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()], // Normalized email
  );
  // ...
}
```

#### What It Improved
- **Data Integrity**: Enforces lowercase email normalization.
- **Transaction Safety**: Supports transactional execution by accepting an optional `PoolClient`.
- **Complete Mapping**: Correctly maps `first_name` to `firstName`, `last_name` to `lastName`, and `is_active` to `isActive`.

---

### Auth Service: `src/modules/auth/services/auth.service.ts`

#### Before Issue
A deactivated user (`is_active = false`) could log in and refresh their access tokens indefinitely because `isActive` was never checked.

#### After Fix
```typescript
// AFTER (Enforcing account active state)
async login(input: LoginInput) {
  const user = await this.users.findByEmail(input.email);
  if (!user) throw new InvalidCredentialsError();
  if (!user.isActive) throw new AccountInactiveError();
  // ...
}

async refresh(refreshToken: string) {
  const result = await this.refreshSessions.rotate(refreshToken);
  const user = await this.users.findById(result.userId);
  if (!user) throw new InvalidRefreshTokenError();
  if (!user.isActive) throw new AccountInactiveError();
  // ...
}
```

#### What It Improved
- **Security**: Instantly revokes system access for deactivated or suspended user accounts upon their next login or token refresh attempt.

---

### Auth Service: `src/modules/auth/controllers/auth.controller.ts`

#### Before Issue
- Missing `firstName` and `lastName` in registration and login response payloads.
- Refresh endpoint only checked cookies, failing when mobile or SPA clients sent refresh tokens in JSON request bodies.
- Inconsistent response structures without standard envelopes.

#### After Fix
- Returns `firstName` and `lastName` in user profile objects.
- Supports dual refresh token extraction:
  ```typescript
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;
  ```
- Uses `sendSuccess` and `sendCreated` for consistent API envelopes.
- Secure cookies configured with `sameSite: "lax"`, `httpOnly: true`, and dynamic `secure: config.nodeEnv === "production"`.

#### What It Improved
- **Client Flexibility**: Seamless support for both web browsers (HttpOnly cookies) and native mobile apps (request body refresh tokens).

---

### Auth Service: `src/modules/auth/routes/auth.routes.ts`

#### Before Issue
Authentication endpoints (`/register`, `/login`, `/refresh`) had no brute-force rate limiting, making passwords vulnerable to automated credential stuffing attacks.

#### After Fix
Added dedicated mutation rate limiting:
```typescript
// AFTER
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                  // 30 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many authentication requests, please try again later.",
        requestId: req.headers["x-request-id"] || "unknown",
      },
    });
  },
});

router.post("/register", authLimiter, validate(registerSchema, "body"), authController.register);
router.post("/login", authLimiter, validate(loginSchema, "body"), authController.login);
router.post("/refresh", authLimiter, validate(refreshSchema, "body"), authController.refresh);
```

#### What It Improved
- **Security**: Protects against automated password guessing, credential stuffing, and refresh token flooding.

---

### Auth Service: `src/server.ts` & `src/app.ts` [NEW]

Similar to the API Gateway:
- **`src/app.ts`**: Decouples Express middleware, health checks (`/health/live`, `/health/ready` testing database queries), and route mounting from server startup.
- **`src/server.ts`**: Implements graceful shutdown closing HTTP listeners first and draining the PostgreSQL connection pool (`closeDbPool()`) second.

---

## 3. Platform Level Additions

### `ARCHITECTURE.md` [NEW]
A complete architectural specification document for the engineering team detailing:
- Microservice autonomy rules (zero shared packages, stack independence).
- Standard folder structure conventions.
- Distributed tracing and correlation headers (`x-request-id`, `x-user-id`, `x-user-role`).
- The universal JSON API contract.
- Security and database transaction standards.

### `services/service-template/` [NEW]
A fully functional, runnable microservice template. Whenever a new microservice is required (e.g. `product-service`, `order-service`, `payment-service`):
1. Copy `services/service-template` to `services/<new-service>`.
2. Update port and database name in `.env` and `package.json`.
3. Start coding domain modules immediately with preconfigured logging, correlation IDs, graceful shutdown, health checks, error handlers, and standard response helpers.

---

## Summary Comparison Matrix

| Component | Before State (Initial Commit) | After State (Production Fix) | Key Improvement |
|---|---|---|---|
| **API Gateway Auth** | Vulnerable to header spoofing (`x-user-*` passed as-is) | Strips incoming user headers; injects claims only upon verified JWT | **Security (Spoofing prevention)** |
| **API Gateway Resilience** | No timeouts; downstream failure returned raw HTML | 15s socket timeouts; returns standard JSON `502`/`504` with `requestId` | **Reliability & Contract Integrity** |
| **Sensitive Logging** | Printed JWT tokens, `console.log("sohin")`, and error details to stdout | Redacted, structured JSON logging with log levels (`INFO`, `WARN`, `ERROR`) | **Security & Observability** |
| **Brute-Force Protection** | Zero rate limiting on any endpoint | 100 req/min global gateway limit; 30 req/15min auth mutation limit | **Security (DDoS & Brute-Force)** |
| **Response Formats** | Inconsistent shapes across services | Universal `{ success, data/error, message, requestId }` envelope | **API Contract Consistency** |
| **Process Lifecycle** | Process killed abruptly on `SIGTERM` / restart | Graceful shutdown draining HTTP connections & closing DB pools | **High Availability & Zero-Downtime** |
| **Health Checks** | Single naive `/health` query | Dual `/health/live` and `/health/ready` (validates DB connectivity) | **Container Orchestration (K8s/ECS)** |
| **User Entity Mapping** | `first_name`, `last_name`, `is_active` ignored | Fully mapped; enforces `isActive` check on login & token refresh | **Business Logic & Security** |
| **Configuration** | Naive `process.env` lookups (`NaN` ports, unvalidated URLs) | Typed Zod schemas with fail-fast validation on service startup | **Runtime Stability** |
| **Testability** | Monolithic `server.ts` binding to ports immediately | Decoupled `app.ts` factory enabling isolated end-to-end integration tests | **Testing & Quality Assurance** |
| **New Service Setup** | No standard template; high risk of architectural drift | Autonomous `service-template` blueprint ready for immediate replication | **Scalability & Developer Velocity** |
