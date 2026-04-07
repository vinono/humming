import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { createApp, createAppSync, definePlugin } from './app';
import { createForwardProxy } from '../forward/proxy';
import type { AppBindings } from '../types';

const originalFetch = globalThis.fetch;

describe('core app runtime', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('keeps health in core by default', async () => {
    const app = createAppSync({
      builtins: {
        options: false,
        forward: false,
      },
    });

    const response = await app.request('/health');
    const body = (await response.json()) as {
      result: boolean;
      data: { status: string };
    };

    expect(response.status).toBe(200);
    expect(body.result).toBe(true);
    expect(body.data.status).toBe('UP');
  });

  it('registers plugin routes before the forward terminal', async () => {
    const plugin = definePlugin({
      name: 'hello-plugin',
      setup({ route }) {
        const routes = new Hono<AppBindings>();
        routes.get('/hello', (c) => c.json({ ok: true }));
        route('/', routes);
      },
    });

    const app = createAppSync({
      builtins: {
        options: false,
        forward: false,
      },
      plugins: [plugin],
    });

    const response = await app.request('/hello');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('supports async plugins with createApp', async () => {
    const plugin = definePlugin({
      name: 'async-plugin',
      async setup({ route }) {
        const routes = new Hono<AppBindings>();
        routes.get('/async-ready', (c) => c.json({ ready: true }));
        route('/', routes);
      },
    });

    const app = await createApp({
      builtins: {
        options: false,
        forward: false,
      },
      plugins: [plugin],
    });

    const response = await app.request('/async-ready');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ready: true });
  });

  it('throws when async plugins are used with createAppSync', () => {
    const plugin = definePlugin({
      name: 'async-plugin',
      async setup() {},
    });

    expect(() =>
      createAppSync({
        builtins: {
          options: false,
          forward: false,
        },
        plugins: [plugin],
      })
    ).toThrow('use createApp() instead of createAppSync()');
  });

  it('lets plugins register forward hooks through core services', async () => {
    const calls: Array<{ input: string | URL; init?: RequestInit }> = [];
    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    const plugin = definePlugin({
      name: 'forward-hook-plugin',
      setup({ services }) {
        services.forwardProxy.registerBeforeRequest(({ headers }) => {
          const nextHeaders = new Headers(headers);
          nextHeaders.set('x-core-plugin', 'enabled');
          return { headers: nextHeaders };
        });
      },
    });

    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: true,
      },
      services: {
        forwardProxy: createForwardProxy({
          enabled: true,
          defaultTimeoutMs: 5_000,
          blockPrivateIp: false,
          rulesJson: JSON.stringify([{ prefix: '/api', target: 'https://backend.example.com' }]),
        }),
      },
      plugins: [plugin],
    });

    const response = await app.request('/api/ping');

    expect(response.status).toBe(200);
    expect(String(calls[0]?.input)).toBe('https://backend.example.com/api/ping');
    expect(new Headers(calls[0]?.init?.headers).get('x-core-plugin')).toBe('enabled');
  });
});
