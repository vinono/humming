import pino from 'pino';
import { env } from './config/env';

export function createLogger(options?: {
  level?: pino.LevelWithSilent;
}) {
  return pino({
    level: options?.level ?? env.LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: undefined,
  });
}

export type AppLogger = ReturnType<typeof createLogger>;

export const logger = createLogger();
