export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
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

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      process.stdout.write(this.format("debug", message, context) + "\n");
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      process.stdout.write(this.format("info", message, context) + "\n");
    }
  }

  warn(message: string, context?: Record<string, unknown>, error?: unknown): void {
    if (this.shouldLog("warn")) {
      process.stderr.write(this.format("warn", message, context, error) + "\n");
    }
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      process.stderr.write(this.format("error", message, context, error) + "\n");
    }
  }
}

export const logger = new Logger("auth-service");
