import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { requestIdMiddleware } from '../middleware/request-id';
import type { AppBindings } from '../types';
import { createOptionsRoutes } from './routes';

type OptionsBody = {
  result: boolean;
  data?: Array<{
    key: string;
    val: Array<{ value: string; label: string }> | null;
    params?: Record<string, unknown>;
    error?: string;
  }>;
  errorCode?: string;
  requestId: string;
};

describe('options routes', () => {
  it('returns option values for GET requests', async () => {
    const app = new Hono<AppBindings>();
    app.use('*', requestIdMiddleware);
    app.route(
      '/',
      createOptionsRoutes({
        resolveMany: async (requests) =>
          requests.map((request) => ({
            key: request.key,
            params: request.params,
            val: [{ value: request.key, label: request.key.toUpperCase() }],
          })),
      })
    );

    const response = await app.request('/api/options?keys=country,city');
    const body = (await response.json()) as OptionsBody;

    expect(response.status).toBe(200);
    expect(body.result).toBe(true);
    expect(body.data).toEqual([
      { key: 'country', params: undefined, val: [{ value: 'country', label: 'COUNTRY' }] },
      { key: 'city', params: undefined, val: [{ value: 'city', label: 'CITY' }] },
    ]);
  });

  it('returns 400 when GET keys are missing', async () => {
    const app = new Hono<AppBindings>();
    app.use('*', requestIdMiddleware);
    app.route('/', createOptionsRoutes());

    const response = await app.request('/api/options');
    const body = (await response.json()) as OptionsBody;

    expect(response.status).toBe(400);
    expect(body.result).toBe(false);
    expect(body.errorCode).toBe('OPTIONS_KEYS_REQUIRED');
  });

  it('accepts POST batch requests', async () => {
    const app = new Hono<AppBindings>();
    app.use('*', requestIdMiddleware);
    app.route(
      '/',
      createOptionsRoutes({
        resolveMany: async (requests) =>
          requests.map((request) => ({
            key: request.key,
            params: request.params,
            val: [{ value: 'ok', label: 'OK' }],
          })),
      })
    );

    const response = await app.request('/api/options', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify([{ key: 'teams', params: { page: 1 } }]),
    });
    const body = (await response.json()) as OptionsBody;

    expect(response.status).toBe(200);
    expect(body.result).toBe(true);
    expect(body.data).toEqual([
      {
        key: 'teams',
        params: { page: 1 },
        val: [{ value: 'ok', label: 'OK' }],
      },
    ]);
  });
});
