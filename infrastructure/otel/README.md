# OpenTelemetry Telemetry & Collector Architecture

## Overview
This repository uses the [OpenTelemetry Collector Contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib) as the central telemetry gateway for all microservices in the system.

Each Node.js microservice runs OpenTelemetry SDK instrumentation (`src/instrumentation.ts`) via Node's `--import` flag, automatically capturing incoming HTTP requests, outgoing HTTP calls, database queries, and custom spans, and forwarding them over HTTP/OTLP to `http://otel-collector:4318/v1/traces`.

---

## 1. Datadog APM Integration (Enabled)
The collector pipeline is configured with both the `datadog` and `debug` exporters:
- **`datadog`**: Sends traces and APM telemetry to the Datadog intake backend.
- **`debug`**: Formats and prints traces to container stdout for local visibility (`docker logs -f ecommerce-otel-collector`).

### Setting your Datadog API Key & Site
Edit [infrastructure/env/otel-collector.env](file:///Users/sohin/new-rnd/ecommerce3/infrastructure/env/otel-collector.env):
```env
DD_API_KEY=your_32_character_datadog_api_key_here
DD_SITE=datadoghq.com
```

> **Supported Datadog Sites**:
> - `datadoghq.com` (US1 - default)
> - `us3.datadoghq.com` (US3)
> - `us5.datadoghq.com` (US5)
> - `datadoghq.eu` (EU)
> - `ap1.datadoghq.com` (AP1)

You can also export them in your terminal before running docker compose:
```bash
export DD_API_KEY="your_api_key"
export DD_SITE="datadoghq.com"
```

### Restarting the Collector
After saving your `DD_API_KEY`, restart the collector:
```bash
docker compose -f infrastructure/docker-compose.yml up -d otel-collector
```

To verify that Datadog exporter connected cleanly:
```bash
docker logs -f ecommerce-otel-collector
```

---

## 2. Viewing Traces in Local Development
To view traces in real time directly in the collector logs:
```bash
docker logs -f ecommerce-otel-collector
```

Each log block contains:
- `Trace ID` and `Span ID` (propagated across services via standard W3C `traceparent` headers)
- `Service Name` (e.g. `api-gateway`, `auth-service`, `product-service`)
- HTTP method, route, status code, and latency
- Attributes, events, exception stack traces, and database queries

---

## 3. Microservice Configuration
Each microservice is configured via its respective environment file in `infrastructure/env/<service>.env`:

| Variable | Description | Value |
|---|---|---|
| `OTEL_TRACES_EXPORTER` | Target exporter mechanism in NodeSDK | `otlp` (or `console`, `none`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector OTLP HTTP receiver endpoint | `http://otel-collector:4318` |
| `OTEL_SERVICE_NAME` | Logical service name for traces | e.g. `api-gateway` |
| `NODE_ENV` | Environment tag added to resource | e.g. `development` / `production` |
