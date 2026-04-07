import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../types';
import { definePlugin } from '../core';

export type CorsPluginOptions = {
  allowOrigin?: string;
  allowMethods?: string[];
  allowHeaders?: string[];
  exposeHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
};

function createCorsMiddleware(options: CorsPluginOptions): MiddlewareHandler<AppBindings> {
  const allowOrigin = options.allowOrigin ?? '*';
  const allowMethods = (options.allowMethods ?? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']).join(', ');
  const allowHeaders = (options.allowHeaders ?? ['content-type', 'x-correlation-id']).join(', ');
  const exposeHeaders = options.exposeHeaders?.join(', ');

  return async (c, next) => {
    c.header('access-control-allow-origin', allowOrigin);
    c.header('access-control-allow-methods', allowMethods);
    c.header('access-control-allow-headers', allowHeaders);

    if (exposeHeaders) {
      c.header('access-control-expose-headers', exposeHeaders);
    }

    if (options.allowCredentials) {
      c.header('access-control-allow-credentials', 'true');
    }

    if (typeof options.maxAge === 'number') {
      c.header('access-control-max-age', String(options.maxAge));
    }

    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }

    await next();
  };
}

export function createCorsPlugin(options: CorsPluginOptions = {}) {
  return definePlugin({
    name: 'cors',
    setup({ use }) {
      use('*', createCorsMiddleware(options));
    },
  });
}
