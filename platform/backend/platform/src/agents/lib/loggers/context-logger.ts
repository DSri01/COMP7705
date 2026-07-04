import pino, { type Logger } from 'pino';

let contextLogger: Logger | undefined;

/**
 * Shared pino logger for {@link AgentContextManager} (compact, truncate, tool ingest).
 * Uses `LOG_LEVEL` (default `info`). Works in Nest server and standalone CLIs without DI.
 */
export function getContextLogger(): Logger {
    if (!contextLogger) {
        contextLogger = pino({
            name: 'context',
            level: process.env['LOG_LEVEL'] ?? 'info',
        });
    }
    return contextLogger;
}

/** @internal Reset singleton between tests. */
export function resetContextLoggerForTests(): void {
    contextLogger = undefined;
}
