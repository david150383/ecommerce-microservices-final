import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import {
  SimpleSpanProcessor,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  NoopSpanProcessor,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const serviceName = process.env.OTEL_SERVICE_NAME || "payment-service";

const spanProcessors: SpanProcessor[] = [];
const configuredExporters = (process.env.OTEL_TRACES_EXPORTER || "none")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

for (const exporter of configuredExporters) {
  if (exporter === "otlp") {
    // Reads OTEL_EXPORTER_OTLP_ENDPOINT (e.g. http://otel-collector:4318) automatically
    spanProcessors.push(new BatchSpanProcessor(new OTLPTraceExporter()));
  } else if (exporter === "console") {
    spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }
}

if (spanProcessors.length === 0) {
  // Default vendor-neutral mode: auto-instrumentation runs, context propagates,
  // active spans/traceIds are attached to logs, without external network exporter.
  spanProcessors.push(new NoopSpanProcessor());
}

export const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || "1.0.0",
    "deployment.environment": process.env.NODE_ENV || "development",
  }),
  spanProcessors,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown().catch((err) => console.error("Error shutting down OTel SDK", err));
});
