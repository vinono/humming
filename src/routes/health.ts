import { Hono } from 'hono';
import type { AppBindings } from '../types';

export function createHealthRoutes() {
  const routes = new Hono<AppBindings>();

  routes.get('/health', (c) => {
    return c.json({
      result: true,
      data: { status: 'UP' },
      requestId: c.get('requestId'),
    });
  });

  return routes;
}

export const healthRoutes = createHealthRoutes();
