# Microservices Architecture Blueprint

This document defines the production-grade architectural standards, API contracts, security practices, and operational patterns for all microservices in the platform.

Each service is **autonomous and self-contained** (no shared internal code packages), allowing individual services to be written in any technology stack (Node.js, Go, Python, Rust) while remaining 100% interoperable and following the same standards.

---

## 1. High-Level Architecture

```
                       [ Client / Web / Mobile ]
                                   │
                                   ▼
                      ┌─────────────────────────┐
                      │       API Gateway       │  (Port 3000)
                      │  - Helmet & CORS        │
                      │  - Rate Limiting        │
                      │  - Request Correlation  │
                      │  - Header Sanitization  │
                      │  - JWT Verification     │
                      └────────────┬────────────┘
                                   │
        ┌──────────────┬───────────┼───────────┬──────────────┬──────────────┐
        │              │           │           │              │              │
        ▼              ▼           ▼           ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────┐┌─────────────┐┌────────────┐┌─────────────────────┐
│ Auth Service ││Product Service│Order Svc ││Inventory Svc││Payment Svc ││Notification Service │
│ (Port 3001)  ││ (Port 3002)  │(Port 3003)│ (Port 3004)  │ (Port 3005) ││    (Port 8006)      │
│  - User Mgmt ││ - Catalog    │ - Orders  │ - Stock Res. │ - Stripe/Mock│ - Multi-channel (Email│
│  - RS256 JWT ││ - Pricing    │ - Sagas   │ - Inventory  │ - Refunds    │    SMS, Webhook)      │
└───────┬──────┘└──────┬───────┘└────┬─────┘└──────┬──────┘└─────┬──────┘└──────────┬──────────┘
        │              │             │             │             │                  │
        ▼              ▼             ▼             ▼             ▼                  ▼
┌──────────────┐┌──────────────┐┌──────────┐┌─────────────┐┌────────────┐┌─────────────────────┐
│  PostgreSQL  ││  PostgreSQL  │PostgreSQL││ PostgreSQL  ││ PostgreSQL ││    PostgreSQL       │
│  (auth_db)   ││ (product_db) │(order_db)││(inventory_db)│(payment_db)││ (notification_db)   │
└──────────────┘└──────────────┘└──────────┘└─────────────┘└────────────┘└─────────────────────┘
```��      └────────┬─────────┘      └────────┬─────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  PostgreSQL DB   │      │  PostgreSQL DB   │      │  PostgreSQL DB   │
│   (auth_db)      │      │   (product_db)   │      │    (order_db)    │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 2. Universal API Contract

All services, regardless of tech stack, must implement the exact same HTTP response envelope.

### A. Success Response Envelope
Status Code: `200 OK`, `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c1f77d33-d86b-4e8c-a1e4-85fd4d9c79ec",
      "email": "user@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "CUSTOMER"
    }
  },
  "message": "User registered successfully",
  "meta": {
    "limit": 50,
    "offset": 0,
    "total": 120
  }
}
```

- `success`: Always `true`.
- `data`: The primary payload object or array.
- `message`: Optional human-readable message.
- `meta`: Optional pagination or operation metadata.

### B. Error Response Envelope
Status Code: `400`, `401`, `403`, `404`, `409`, `429`, `500`, `502`, `504`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "password",
        "message": "Password must be at least 8 characters long",
        "code": "too_small"
      }
    ],
    "requestId": "61a29f8c-9b5b-4c07-bcae-21ef6d07d1cf"
  }
}
```

- `success`: Always `false`.
- `error.code`: Standard machine-readable UPPER_SNAKE_CASE string.
- `error.message`: Clear description for consumers.
- `error.details`: Optional array or object detailing specific field errors.
- `error.requestId`: Correlation ID matching the HTTP header `x-request-id`.

### Standard Error Code Registry

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `BAD_REQUEST` | Malformed request or illegal parameters |
| `400` | `VALIDATION_FAILED` | Input failed schema validation (Zod, etc.) |
| `400` | `INVALID_JSON_PAYLOAD` | Request body is not valid JSON |
| `401` | `UNAUTHORIZED` | Missing, expired, or invalid token |
| `401` | `INVALID_CREDENTIALS` | Invalid email/password combination |
| `401` | `INVALID_REFRESH_TOKEN` | Refresh token is invalid or expired |
| `401` | `REFRESH_TOKEN_REUSE_DETECTED` | Revoked token reuse; family invalidated |
| `403` | `FORBIDDEN` | Authenticated but lacks required role/permission |
| `403` | `ACCOUNT_INACTIVE` | User account is deactivated or banned |
| `404` | `RESOURCE_NOT_FOUND` | Requested entity does not exist |
| `404` | `ROUTE_NOT_FOUND` | HTTP route / endpoint does not exist |
| `409` | `RESOURCE_CONFLICT` | Unique violation (e.g. duplicate email) |
| `429` | `TOO_MANY_REQUESTS` | Rate limit threshold reached |
| `500` | `INTERNAL_SERVER_ERROR` | Unhandled server exception |
| `502` | `BAD_GATEWAY` | Downstream service is offline or unreachable |
| `504` | `GATEWAY_TIMEOUT` | Downstream service timed out |

---

## 3. Security & Authentication Architecture

### 1. Asymmetric Key Pair (RS256)
- The Auth Service signs access tokens using the **private key** (`keys/private.pem`).
- Downstream services and the API Gateway only possess the **public key** (`keys/public.pem`).
- This means downstream services can independently verify tokens without making network roundtrips to the Auth Service.

### 2. Gateway Header Sanitization
- External clients might maliciously inject `x-user-id: ...` or `x-user-role: ADMIN` headers.
- The API Gateway **always strips** `x-user-id` and `x-user-role` from incoming client requests.
- Only after successful JWT verification will the Gateway inject verified identity headers downstream:
  - `x-user-id`: Subject claim (`sub`)
  - `x-user-role`: User role (`role`)
  - `x-request-id`: Trace correlation ID

### 3. Dual-Mode Downstream Authentication
Downstream services support both:
1. **Gateway Forwarded**: Directly trust `x-user-id` and `x-user-role` (because the gateway strips untrusted headers).
2. **Direct Verification**: Verify Bearer token directly with the public key (for direct service-to-service calls or local development).

### 4. Refresh Token Family Rotation & Reuse Detection
- Refresh tokens are hashed using SHA-256 before storage.
- Each login generates a unique `family_id`.
- On `/auth/refresh`, the old refresh token is revoked, and a new one is issued in the same family.
- If an already revoked token is presented (indicating a replay attack), **all tokens in that family are immediately revoked**, locking out the attacker.

---

## 4. Standard Service Layer Structure

Every microservice follows this layered architecture:

```
src/
├── config.ts                  # Zod-validated environment config
├── db.ts                      # Connection pool, health check & transaction helper
├── logger/                    # Structured JSON logger
│   └── logger.ts
├── middleware/                # Standard middleware
│   ├── request-id.middleware.ts
│   ├── request-logger.middleware.ts
│   ├── validate.middleware.ts
│   ├── authenticate.middleware.ts
│   └── error-handler.middleware.ts
├── modules/                   # Domain features
│   └── <feature>/
│       ├── controllers/       # HTTP response & status formatting
│       ├── services/          # Pure business logic & transactions
│       ├── repositories/      # DB operations with PoolClient support
│       ├── schemas/           # Input validation schemas & types
│       ├── routes/            # Express route bindings
│       └── types/             # Domain entities
├── shared/
│   ├── errors/app.error.ts    # AppError hierarchy
│   ├── types/api.types.ts     # ApiResponse & ApiErrorResponse
│   └── utils/response.util.ts # sendSuccess, sendCreated helpers
├── app.ts                     # Express app setup (testable in isolation)
└── server.ts                  # Bootstrap & graceful shutdown
```

---

## 5. How to Create a New Microservice in 5 Minutes

To add a new service (e.g., `product-service`):

1. **Copy the Template**:
   ```bash
   cp -r services/service-template services/product-service
   ```

2. **Update `package.json`**:
   Change `"name": "service-template"` to `"name": "product-service"`.

3. **Configure `.env`**:
   ```bash
   cp services/product-service/.env.example services/product-service/.env
   ```
   Set `PORT=3002` and `DB_NAME=product_db`.

4. **Customize Domain Module**:
   Rename `src/modules/item` to `src/modules/product`, and update repository/service models.

5. **Register Route in API Gateway**:
   In `services/api-gateway/src/app.ts`:
   ```ts
   app.use(
     "/products",
     authenticate, // or public
     createServiceProxy(config.productServiceUrl, "products"),
   );
   ```

6. **Start Development**:
   ```bash
   cd services/product-service
   npm install
   npm run dev
   ```

---

## 6. Observability, Health Checks & Graceful Shutdown

### Health Checks
Every service exposes:
- `GET /health/live`: Liveness probe. Returns 200 if the process is responsive.
- `GET /health/ready`: Readiness probe. Executes `SELECT 1` to verify database health. Returns 200 if ready, 503 if database is disconnected.

### Graceful Shutdown
When Kubernetes or Docker sends `SIGTERM` or `SIGINT`:
1. Service stops accepting new HTTP connections (`server.close()`).
2. Ongoing requests have a 10-second drain period.
3. PostgreSQL connection pool is cleanly closed (`await pool.end()`).
4. Process exits with code 0 without dropped requests or broken database transactions.
