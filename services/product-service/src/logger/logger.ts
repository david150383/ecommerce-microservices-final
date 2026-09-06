import { trace } from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SEVERITY_MAP: Record<LogLevel, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

export class Logger {
  private serviceName: string;
  private currentLevel: LogLevel;

  constructor(serviceName: string, level?: LogLevel) {
    this.serviceName = serviceName;
    this.currentLevel = level || (process.env.NODE_ENV === "production" ? "info" : "debug");
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
  }

  private format(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: unknown,
  ): string {
    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.serviceName,
      message,
    };

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (spanContext && trace.isSpanContextValid(spanContext)) {
        payload.trace_id = spanContext.traceId;
        payload.span_id = spanContext.spanId;
        payload.trace_flags = spanContext.traceFlags;
      }
    }

    if (context && Object.keys(context).length > 0) {
      payload.context = context;
    }

    if (error) {
      if (error instanceof Error) {
        payload.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(typeof (error as any).code === "string" ? { code: (error as any).code } : {}),
        };
      } else {
        payload.error = error;
      }
    }

    return JSON.stringify(payload);
  }

  private emitOtelLog(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: unknown,
  ): void {
    try {
      const otelLogger = logs.getLogger(this.serviceName);
      const attributes: Record<string, string> = {
        "service.name": this.serviceName,
      };

      if (context) {
        for (const [k, v] of Object.entries(context)) {
          if (v !== undefined && v !== null) {
            attributes[`context.${k}`] = typeof v === "object" ? JSON.stringify(v) : String(v);
          }
        }
      }

      if (error) {
        if (error instanceof Error) {
          attributes["error.name"] = error.name;
          attributes["error.message"] = error.message;
          if (error.stack) attributes["error.stack"] = error.stack;
        } else {
          attributes["error.raw"] = typeof error === "object" ? JSON.stringify(error) : String(error);
        }
      }

      otelLogger.emit({
        severityNumber: SEVERITY_MAP[level],
        severityText: level.toUpperCase(),
        body: message,
        attributes,
      });
    } catch {
      // Fail-safe: OTel logging must never throw or break application flow
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      process.stdout.write(this.format("debug", message, context) + "\n");
      this.emitOtelLog("debug", message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      process.stdout.write(this.format("info", message, context) + "\n");
      this.emitOtelLog("info", message, context);
    }
  }

  warn(message: string, context?: Record<string, unknown>, error?: unknown): void {
    if (this.shouldLog("warn")) {
      process.stderr.write(this.format("warn", message, context, error) + "\n");
      this.emitOtelLog("warn", message, context, error);
    }
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      process.stderr.write(this.format("error", message, context, error) + "\n");
      this.emitOtelLog("error", message, context, error);
    }
  }
}

export const logger = new Logger("product-service");
