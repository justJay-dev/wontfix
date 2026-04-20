/**
 * Structured JSON logger for Cloudflare Workers observability.
 *
 * All log output is JSON so Cloudflare's logging pipeline can parse,
 * filter, and alert on structured fields.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry): void {
  const output = JSON.stringify(entry);
  switch (entry.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    emit({ level: 'info', message, ...context });
  },
  warn(message: string, context?: Record<string, unknown>): void {
    emit({ level: 'warn', message, ...context });
  },
  error(message: string, context?: Record<string, unknown>): void {
    emit({ level: 'error', message, ...context });
  },
};

/** Extract a safe error message + name from an unknown error value. */
export function errorContext(error: unknown): { errorMessage: string; errorName: string } {
  if (error instanceof Error) {
    return { errorMessage: error.message, errorName: error.name };
  }
  return { errorMessage: String(error), errorName: 'UnknownError' };
}
