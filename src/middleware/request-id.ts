import type { MiddlewareHandler } from 'hono';
import { logger } from '../logger';
import type { AppBindings } from '../types';

const HEADER_KEY = 'x-correlation-id';

export const requestIdMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const requestId = c.req.header(HEADER_KEY) || crypto.randomUUID();
  const startAt = Date.now();

  c.set('requestId', requestId);
  c.set('startAt', startAt);
  c.set('authUser', null);

  await next();

  const duration = Date.now() - startAt;
  c.header(HEADER_KEY, requestId);

  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  }, 'request completed');
};
