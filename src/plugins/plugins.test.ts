import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { createAppSync, definePlugin } from '../core';
import { createOptionSourceRegistry } from '../options/registry';
import { createOptionsService } from '../options/service';
import type { AppBindings } from '../types';
import { createCorsPlugin } from './cors';
import { createOptionsHttpPlugin } from './options-http';
import { createOptionsStaticPlugin } from './options-static';
import { createRequestLoggerPlugin } from './request-logger';

const originalFetch = globalThis.fetch;

function createHelloPlugin() {
  return definePlugin({
    name: 'hello-route',
    setup({ route }) {
      const routes = new Hono<AppBindings>();
      routes.get('/hello', (c) => c.json({ ok: true }));
      route('/', routes);
    },
  });
}

describe('official plugins', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('cors plugin applies CORS headers and handles preflight', async () => {
    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        createCorsPlugin({
          allowOrigin: 'https://example.com',
          allowHeaders: ['content-type', 'x-correlation-id', 'x-tenant'],
        }),
        createHelloPlugin(),
      ],
    });

    const preflight = await app.request('/hello', {
      method: 'OPTIONS',
    });
    const response = await app.request('/hello');

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('https://example.com');
    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.com');
    expect(response.headers.get('access-control-allow-headers')).toContain('x-tenant');
  });

  it('request logger plugin writes request-start logs through the provided logger', async () => {
    const logs: Array<{ bindings: Record<string, unknown>; message?: string }> = [];
    const logger = {
      info(bindings: Record<string, unknown>, message?: string) {
        logs.push({ bindings, message });
      },
      error() {},
    };

    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      logger: logger as never,
      plugins: [createRequestLoggerPlugin({ message: 'request started' }), createHelloPlugin()],
    });

    const response = await app.request('/hello', {
      headers: {
        'x-correlation-id': 'req-plugin-log',
      },
    });

    expect(response.status).toBe(200);
    expect(logs).toContainEqual({
      bindings: {
        requestId: 'req-plugin-log',
        method: 'GET',
        path: '/hello',
      },
      message: 'request started',
    });
  });

  it('options static plugin registers the static source into an empty registry', async () => {
    const options = createOptionsService({
      configJson: JSON.stringify({
        status: {
          type: 'static',
          items: [{ value: 'UP', label: 'Up' }],
        },
      }),
      registry: createOptionSourceRegistry(),
    });

    const app = createAppSync({
      builtins: {
        health: false,
        options: true,
        forward: false,
      },
      services: {
        options,
      },
      plugins: [createOptionsStaticPlugin()],
    });

    const response = await app.request('/api/options?keys=status');
    const body = (await response.json()) as {
      data: Array<{ key: string; val: Array<{ value: string; label: string }> }>;
    };

    expect(response.status).toBe(200);
    expect(body.data[0]).toEqual({
      key: 'status',
      val: [{ value: 'UP', label: 'Up' }],
    });
  });

  it('options http plugin registers the http source into an empty registry', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          payload: {
            items: [{ id: 'u1', name: 'Ada' }],
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      )) as unknown as typeof fetch;

    const options = createOptionsService({
      configJson: JSON.stringify({
        users: {
          type: 'http',
          url: 'https://backend.example.com/users',
          responsePath: 'payload.items',
          valueField: 'id',
          labelField: 'name',
        },
      }),
      registry: createOptionSourceRegistry(),
    });

    const app = createAppSync({
      builtins: {
        health: false,
        options: true,
        forward: false,
      },
      services: {
        options,
      },
      plugins: [createOptionsHttpPlugin()],
    });

    const response = await app.request('/api/options?keys=users');
    const body = (await response.json()) as {
      data: Array<{ key: string; val: Array<{ value: string; label: string; id: string; name: string }> }>;
    };

    expect(response.status).toBe(200);
    expect(body.data[0]?.val).toEqual([{ id: 'u1', name: 'Ada', value: 'u1', label: 'Ada' }]);
  });
});
