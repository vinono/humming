import pino from 'pino';

export function createLogger(options?: {
  level?: pino.LevelWithSilent;
}) {
  return pino({
    level: options?.level ?? 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    base: undefined,
  });
}

export type AppLogger = ReturnType<typeof createLogger>;

export const logger = createLogger();
