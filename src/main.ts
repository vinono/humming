import { createAppSync } from './app';
import { parseEnv } from './config/env';
import { createLogger } from './logger';

const env = parseEnv(Bun.env);
const logger = createLogger({ level: env.LOG_LEVEL });
const app = createAppSync({ env, logger });

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info({
  port: server.port,
  env: env.NODE_ENV,
}, 'humming started');
