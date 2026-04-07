import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../types';
import { definePlugin } from '../core';

export type RequestLoggerPluginOptions = {
  message?: string;
};

export function createRequestLoggerPlugin(options: RequestLoggerPluginOptions = {}) {
  const message = options.message ?? 'request received';

  return definePlugin({
    name: 'request-logger',
    setup({ logger, use }) {
      const middleware: MiddlewareHandler<AppBindings> = async (c, next) => {
        logger.info(
          {
            requestId: c.get('requestId'),
            method: c.req.method,
            path: c.req.path,
          },
          message
        );
        await next();
      };

      use('*', middleware);
    },
  });
}
