import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { AppBindings } from '../types';
import { requestIdMiddleware } from './request-id';

type EchoBody = {
  requestId: string;
};

function createApp() {
  const app = new Hono<AppBindings>();
  app.use('*', requestIdMiddleware);

  app.get('/echo', (c) => {
    return c.json({ requestId: c.get('requestId') });
  });

  return app;
}

describe('requestIdMiddleware', () => {
  it('generates correlation id and echoes it in response header', async () => {
    const app = createApp();
    const response = await app.request('/echo');
    const body = (await response.json()) as EchoBody;

    const headerRequestId = response.headers.get('x-correlation-id');
    expect(headerRequestId).not.toBeNull();
    expect(body.requestId).toBe(headerRequestId as string);
  });

  it('uses caller correlation id if provided', async () => {
    const app = createApp();
    const requestId = 'req-fixed-001';

    const response = await app.request('/echo', {
      headers: {
        'x-correlation-id': requestId,
      },
    });
    const body = (await response.json()) as EchoBody;

    expect(response.headers.get('x-correlation-id')).toBe(requestId);
    expect(body.requestId).toBe(requestId);
  });
});
