# OpenTelemetry Telemetry & Collector Architecture

## Overview
This repository uses the [OpenTelemetry Collector Contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib) as the central telemetry gateway for all microservices in the system.

Each Node.js microservice runs OpenTelemetry SDK instrumentation (`src/instrumentation.ts`) via Node's `--import` flag, automatically capturing incoming HTTP requests, outgoing HTTP calls, database queries, and custom spans, and forwarding them over HTTP/OTLP to `http://otel-collector:4318/v1/traces`.

---

## 1. Viewing Traces in Local Development
By default, the collector is configured with the `debug` exporter set to `verbosity: detailed`. All spans received from microservices will be formatted and logged directly to the collector container logs.

To view traces in real time:
```bash
docker logs -f ecommerce-otel-collector
```

Each log block contains:
- `Trace ID` and `Span ID` (propagated across services via standard W3C `traceparent` headers)
- `Service Name` (e.g. `api-gateway`, `auth-service`, `product-service`)
- HTTP method, route, status code, and latency
- Attributes, events, and error status (if any)

---

## 2. Switching to Datadog (or Other APM Providers)
Because the collector runs the `otel/opentelemetry-collector-contrib` image, it includes built-in exporters for Datadog, Honeycomb, Dynatrace, New Relic, AWS X-Ray, Google Cloud, and more.

### Enabling Datadog
1. Open `infrastructure/otel/otel-collector-config.yaml`.
2. Under `exporters`, uncomment the `datadog` section:
   ```yaml
   exporters:
     datadog:
       api:
         key: ${env:DD_API_KEY}
         site: ${env:DD_SITE} # e.g. datadoghq.com
       traces:
         span_name_as_resource_name: true
   ```
3. Under `service.pipelines.traces.exporters`, add `datadog`:
   ```yaml
   service:
     pipelines:
       traces:
         receivers: [otlp]
         processors: [memory_limiter, batch]
         exporters: [debug, datadog] # You can keep or remove debug
   ```
4. Provide your Datadog credentials in `infrastructure/docker-compose.yml` under `otel-collector`'s `environment`:
   ```yaml
   environment:
     - DD_API_KEY=${DD_API_KEY}
     - DD_SITE=${DD_SITE:-datadoghq.com}
   ```
5. Restart the collector:
   ```bash
   docker compose -f infrastructure/docker-compose.yml restart otel-collector
   ```

---

## 3. Microservice Configuration
Each microservice is configured via its respective environment file in `infrastructure/env/<service>.env`:

| Variable | Description | Value |
|---|---|---|
| `OTEL_TRACES_EXPORTER` | Target exporter mechanism in NodeSDK | `otlp` (or `console`, `none`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector OTLP HTTP receiver endpoint | `http://otel-collector:4318` |
| `OTEL_SERVICE_NAME` | Logical service name for traces | e.g. `api-gateway` |
| `NODE_ENV` | Environment tag added to resource | e.g. `development` / `production` |
