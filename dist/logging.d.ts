export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    context: Record<string, unknown>;
}
export interface Logger {
    write(entry: LogEntry): void | Promise<void>;
}
/** Structured logging port. Apps choose console, local file, database, or remote adapters. */
export declare function log(logger: Logger, level: LogLevel, message: string, context?: Record<string, unknown>): void | Promise<void>;
//# sourceMappingURL=logging.d.ts.map