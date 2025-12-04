/**
 * Development Logger Utility
 *
 * Only logs in development mode to keep production console clean.
 * Usage: import { logger } from './logger';
 *        logger.debug('message', data);
 */

const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  info: (...args) => {
    if (isDev) console.log('[INFO]', ...args);
  },
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },
  api: (...args) => {
    if (isDev) console.log('[API]', ...args);
  }
};

export default logger;
