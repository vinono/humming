import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { AppBindings } from '../types';
import { requestIdMiddleware } from '../middleware/request-id';
import { healthRoutes } from './health';

type HealthBody = {
  result: boolean;
  data: {
    status: string;
  };
  requestId: string;
};

describe('health route', () => {
  it('returns status UP with requestId', async () => {
    const app = new Hono<AppBindings>();
    app.use('*', requestIdMiddleware);
    app.route('/', healthRoutes);

    const response = await app.request('/health');
    const body = (await response.json()) as HealthBody;

    const headerRequestId = response.headers.get('x-correlation-id');
    expect(headerRequestId).not.toBeNull();

    expect(response.status).toBe(200);
    expect(body.result).toBe(true);
    expect(body.data.status).toBe('UP');
    expect(body.requestId).toBe(headerRequestId as string);
  });
});
