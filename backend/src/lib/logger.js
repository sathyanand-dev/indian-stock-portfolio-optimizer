import { env } from '../config/env.js';

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = levels[env.LOG_LEVEL] ?? 2;

function log(level, message, meta) {
  if ((levels[level] ?? 2) > current) return;
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](JSON.stringify(entry));
}

export const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};
