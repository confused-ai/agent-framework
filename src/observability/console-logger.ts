/**
 * Console Logger Implementation
 *
 * Simple console-based logging for development and debugging
 */

import { Logger, LogLevel, LogEntry, LogContext } from './types.js';

/**
 * Console logger configuration
 */
export interface ConsoleLoggerConfig {
    readonly minLevel?: LogLevel;
    readonly includeTimestamp?: boolean;
    readonly prefix?: string;
}

/**
 * Console logger implementation
 */
export class ConsoleLogger implements Logger {
    private minLevel: LogLevel;
    private includeTimestamp: boolean;
    private prefix: string;
    private context: Partial<LogContext> = {};

    private static readonly LEVEL_PRIORITY: Record<LogLevel, number> = {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 1,
        [LogLevel.WARN]: 2,
        [LogLevel.ERROR]: 3,
        [LogLevel.FATAL]: 4,
    };

    constructor(config: ConsoleLoggerConfig = {}) {
        this.minLevel = config.minLevel ?? LogLevel.INFO;
        this.includeTimestamp = config.includeTimestamp ?? true;
        this.prefix = config.prefix ?? '[AgentFramework]';
    }

    debug(message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.DEBUG, message, context, metadata);
    }

    info(message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, message, context, metadata);
    }

    warn(message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, message, context, metadata);
    }

    error(message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, message, context, metadata);
    }

    fatal(message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.FATAL, message, context, metadata);
    }

    log(level: LogLevel, message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const entry: LogEntry = {
            id: this.generateId(),
            timestamp: new Date(),
            level,
            message,
            source: this.prefix,
            context: { ...this.context, ...context },
            metadata,
        };

        this.output(entry);
    }

    child(additionalContext: Partial<LogContext>): Logger {
        const childLogger = new ConsoleLogger({
            minLevel: this.minLevel,
            includeTimestamp: this.includeTimestamp,
            prefix: this.prefix,
        });
        childLogger.context = { ...this.context, ...additionalContext };
        return childLogger;
    }

    private shouldLog(level: LogLevel): boolean {
        return ConsoleLogger.LEVEL_PRIORITY[level] >= ConsoleLogger.LEVEL_PRIORITY[this.minLevel];
    }

    private output(entry: LogEntry): void {
        const timestamp = this.includeTimestamp
            ? `[${entry.timestamp.toISOString()}]`
            : '';
        const level = `[${entry.level.toUpperCase()}]`;
        const prefix = entry.source;

        const parts = [timestamp, prefix, level, entry.message].filter(Boolean);
        const formattedMessage = parts.join(' ');

        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(formattedMessage, entry.metadata ?? '');
                break;
            case LogLevel.INFO:
                console.info(formattedMessage, entry.metadata ?? '');
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, entry.metadata ?? '');
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(formattedMessage, entry.metadata ?? '');
                break;
        }
    }

    private generateId(): string {
        return `log-${crypto.randomUUID()}`;
    }
}
