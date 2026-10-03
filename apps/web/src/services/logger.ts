/**
 * Lean structured logging for the browser: scope, level and context; `debug`/`info` are
 * suppressed in production builds, `warn`/`error` remain.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
const minLevel: LogLevel = import.meta.env?.PROD ? 'warn' : 'debug';

export interface Logger {
  child(scope: string): Logger;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

function create(scope: string): Logger {
  const emit = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    const entry = { scope, level, time: new Date().toISOString(), message, ...context };
    if (level === 'error') console.error(entry);
    else if (level === 'warn') console.warn(entry);
    // The logger is the one place that writes to the console.
    // eslint-disable-next-line no-console
    else console.debug(entry);
  };
  return {
    child: (child) => create(`${scope}.${child}`),
    debug: (m, c) => emit('debug', m, c),
    info: (m, c) => emit('info', m, c),
    warn: (m, c) => emit('warn', m, c),
    error: (m, c) => emit('error', m, c),
  };
}

export const logger = create('arda');
