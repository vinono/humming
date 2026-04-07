import { createAppSync } from './app';
import { env } from './config/env';
import { logger } from './logger';

const app = createAppSync();

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info({
  port: server.port,
  env: env.NODE_ENV,
}, 'humming started');
