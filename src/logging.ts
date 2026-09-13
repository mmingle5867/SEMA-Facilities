export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export interface LogEntry { timestamp: Date; level: LogLevel; message: string; context: Record<string, unknown>; }
export interface Logger { write(entry: LogEntry): void | Promise<void>; }

/** Structured logging port. Apps choose console, local file, database, or remote adapters. */
export function log(logger: Logger, level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  return logger.write({ timestamp: new Date(), level, message, context });
}
