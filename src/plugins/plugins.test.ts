import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { createAppSync, definePlugin } from '../core';
import { createOptionSourceRegistry } from '../options/registry';
import { createOptionsService } from '../options/service';
import type { AppBindings } from '../types';
import { createCorsPlugin } from './cors';
import { createAuthPlugin } from './auth';
import { createCachePlugin, createMemoryCacheStore, createRedisCacheStore, type CacheStore } from './cache';
import { createOptionsHttpPlugin } from './options-http';
import { createOptionsStaticPlugin } from './options-static';
import {
  createMetricsPlugin,
  createMetricsRegistry,
  type MetricsObserveInput,
  type MetricsRegistry,
} from './metrics';
import {
  createMemoryRateLimitStore,
  createRateLimitPlugin,
  createRedisRateLimitStore,
} from './rate-limit';
import { createRequestLoggerPlugin } from './request-logger';

const originalFetch = globalThis.fetch;

async function createJwtToken(payload: Record<string, unknown>, secret: string) {
  const encoder = new TextEncoder();
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodeSection = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

  const headerSegment = encodeSection(header);
  const payloadSegment = encodeSection(payload);
  const signingInput = `${headerSegment}.${payloadSegment}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput)));
  const binary = Array.from(signature, (byte) => String.fromCharCode(byte)).join('');
  const signatureSegment = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

  return `${signingInput}.${signatureSegment}`;
}

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

  it('auth plugin protects routes and keeps health public by default', async () => {
    const app = createAppSync({
      builtins: {
        health: true,
        options: false,
        forward: false,
      },
      plugins: [
        createAuthPlugin({
          validate({ token }) {
            return token === 'secret-token';
          },
        }),
        createHelloPlugin(),
      ],
    });

    const unauthorized = await app.request('/hello');
    const health = await app.request('/health');
    const authorized = await app.request('/hello', {
      headers: {
        authorization: 'Bearer secret-token',
      },
    });

    const unauthorizedBody = (await unauthorized.json()) as { errorCode: string };

    expect(unauthorized.status).toBe(401);
    expect(unauthorizedBody.errorCode).toBe('AUTH_TOKEN_REQUIRED');
    expect(health.status).toBe(200);
    expect(authorized.status).toBe(200);
  });

  it('auth plugin supports JWT user context and role checks', async () => {
    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        createAuthPlugin({
          jwt: {
            secret: 'jwt-secret',
          },
          roleRules: [
            {
              paths: ['/admin'],
              roles: ['admin'],
            },
          ],
        }),
        definePlugin({
          name: 'auth-context',
          setup({ route }) {
            const routes = new Hono<AppBindings>();
            routes.get('/me', (c) =>
              c.json({
                id: c.get('authUser')?.id,
                subject: c.get('authUser')?.subject,
                roles: c.get('authUser')?.roles ?? [],
              })
            );
            routes.get('/admin', (c) =>
              c.json({
                ok: true,
                roles: c.get('authUser')?.roles ?? [],
              })
            );
            route('/', routes);
          },
        }),
      ],
    });

    const userToken = await createJwtToken(
      {
        sub: 'user-1',
        roles: ['viewer'],
      },
      'jwt-secret'
    );
    const adminToken = await createJwtToken(
      {
        sub: 'admin-1',
        roles: ['admin'],
      },
      'jwt-secret'
    );

    const me = await app.request('/me', {
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });
    const forbidden = await app.request('/admin', {
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });
    const allowed = await app.request('/admin', {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    const meBody = (await me.json()) as { id?: string; subject?: string; roles: string[] };
    const forbiddenBody = (await forbidden.json()) as { errorCode: string };

    expect(me.status).toBe(200);
    expect(meBody.subject).toBe('user-1');
    expect(meBody.id).toBe('user-1');
    expect(meBody.roles).toEqual(['viewer']);
    expect(forbidden.status).toBe(403);
    expect(forbiddenBody.errorCode).toBe('AUTH_FORBIDDEN');
    expect(allowed.status).toBe(200);
  });

  it('cache plugin caches GET responses in memory', async () => {
    let hits = 0;

    const counterPlugin = definePlugin({
      name: 'counter-route',
      setup({ route }) {
        const routes = new Hono<AppBindings>();
        routes.get('/counter', (c) => {
          hits += 1;
          return c.json({
            result: true,
            data: {
              hits,
            },
          });
        });
        route('/', routes);
      },
    });

    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [createCachePlugin({ ttlMs: 30_000 }), counterPlugin],
    });

    const first = await app.request('/counter');
    const second = await app.request('/counter');

    const firstBody = (await first.json()) as { data: { hits: number } };
    const secondBody = (await second.json()) as { data: { hits: number } };

    expect(first.status).toBe(200);
    expect(first.headers.get('x-humming-cache')).toBe('MISS');
    expect(firstBody.data.hits).toBe(1);
    expect(second.status).toBe(200);
    expect(second.headers.get('x-humming-cache')).toBe('HIT');
    expect(secondBody.data.hits).toBe(1);
    expect(hits).toBe(1);
  });

  it('cache plugin supports custom cache stores', async () => {
    let hits = 0;
    let getCalls = 0;
    let setCalls = 0;
    const entries = new Map<string, Parameters<NonNullable<CacheStore['set']>>[1]>();

    const store: CacheStore = {
      async get(key) {
        getCalls += 1;
        return entries.get(key) ?? null;
      },
      async set(key, value) {
        setCalls += 1;
        entries.set(key, value);
      },
      async delete(key) {
        entries.delete(key);
      },
    };

    const counterPlugin = definePlugin({
      name: 'custom-store-counter',
      setup({ route }) {
        const routes = new Hono<AppBindings>();
        routes.get('/counter', (c) => {
          hits += 1;
          return c.json({
            result: true,
            data: {
              hits,
            },
          });
        });
        route('/', routes);
      },
    });

    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [createCachePlugin({ ttlMs: 30_000, store }), counterPlugin],
    });

    const first = await app.request('/counter');
    const second = await app.request('/counter');

    const firstBody = (await first.json()) as { data: { hits: number } };
    const secondBody = (await second.json()) as { data: { hits: number } };

    expect(first.status).toBe(200);
    expect(firstBody.data.hits).toBe(1);
    expect(first.headers.get('x-humming-cache')).toBe('MISS');
    expect(second.status).toBe(200);
    expect(secondBody.data.hits).toBe(1);
    expect(second.headers.get('x-humming-cache')).toBe('HIT');
    expect(getCalls).toBe(2);
    expect(setCalls).toBe(1);
    expect(hits).toBe(1);
  });

  it('memory cache store evicts expired entries', async () => {
    const store = createMemoryCacheStore();

    await store.set(
      'hello',
      {
        status: 200,
        headers: [['content-type', 'application/json']],
        body: new TextEncoder().encode('{"ok":true}'),
        expiresAt: Date.now() - 100,
      },
      5_000
    );

    const cached = await store.get('hello');

    expect(cached).toBeNull();
  });

  it('redis cache store serializes and reads cached responses through the redis client contract', async () => {
    const backing = new Map<string, string>();
    const calls = {
      get: [] as string[],
      set: [] as Array<{ key: string; value: string; mode: string; ttlMs: number }>,
      del: [] as string[],
    };

    const client = {
      async get(key: string) {
        calls.get.push(key);
        return backing.get(key) ?? null;
      },
      async set(key: string, value: string, mode: 'PX', ttlMs: number) {
        calls.set.push({ key, value, mode, ttlMs });
        backing.set(key, value);
        return 'OK' as const;
      },
      async del(...keys: string[]) {
        calls.del.push(...keys);
        for (const key of keys) {
          backing.delete(key);
        }
        return keys.length;
      },
    };

    const store = createRedisCacheStore({
      client,
      prefix: 'test-cache',
    });

    const entry = {
      status: 201,
      headers: [
        ['content-type', 'application/json'],
        ['x-humming-cache', 'MISS'],
      ] as Array<[string, string]>,
      body: new TextEncoder().encode('{"ok":true}'),
      expiresAt: Date.now() + 30_000,
    };

    await store.set('users:list', entry, 30_000);
    const cached = await store.get('users:list');

    expect(calls.set).toHaveLength(1);
    expect(calls.set[0]).toMatchObject({
      key: 'test-cache:users:list',
      mode: 'PX',
      ttlMs: 30_000,
    });
    expect(cached).toEqual(entry);

    backing.set(
      'test-cache:users:list',
      JSON.stringify({
        status: 200,
        headers: [['content-type', 'application/json']],
        bodyBase64: btoa('{"stale":true}'),
        expiresAt: Date.now() - 10,
      })
    );

    const expired = await store.get('users:list');

    expect(expired).toBeNull();
    expect(calls.del).toContain('test-cache:users:list');
  });

  it('rate limit plugin rejects requests after the configured limit', async () => {
    let hits = 0;

    const limitedPlugin = definePlugin({
      name: 'limited-route',
      setup({ route }) {
        const routes = new Hono<AppBindings>();
        routes.get('/limited', (c) => {
          hits += 1;
          return c.json({
            result: true,
            data: {
              hits,
            },
          });
        });
        route('/', routes);
      },
    });

    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        createRateLimitPlugin({
          includePaths: ['/limited'],
          limit: 2,
          windowMs: 30_000,
        }),
        limitedPlugin,
      ],
    });

    const requestInit = {
      headers: {
        'x-real-ip': '127.0.0.1',
      },
    };

    const first = await app.request('/limited', requestInit);
    const second = await app.request('/limited', requestInit);
    const third = await app.request('/limited', requestInit);

    const thirdBody = (await third.json()) as {
      errorCode: string;
      data: { limit: number; remaining: number; totalHits: number };
    };

    expect(first.status).toBe(200);
    expect(first.headers.get('ratelimit-limit')).toBe('2');
    expect(first.headers.get('ratelimit-remaining')).toBe('1');
    expect(second.status).toBe(200);
    expect(second.headers.get('ratelimit-remaining')).toBe('0');
    expect(third.status).toBe(429);
    expect(third.headers.get('retry-after')).not.toBeNull();
    expect(thirdBody.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(thirdBody.data.limit).toBe(2);
    expect(thirdBody.data.remaining).toBe(0);
    expect(thirdBody.data.totalHits).toBe(3);
    expect(hits).toBe(2);
  });

  it('rate limit plugin supports custom key functions for separate buckets', async () => {
    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        createRateLimitPlugin({
          includePaths: ['/tenant'],
          limit: 1,
          windowMs: 30_000,
          key({ context }) {
            return context.req.header('x-tenant') ?? 'default';
          },
        }),
        definePlugin({
          name: 'tenant-route',
          setup({ route }) {
            const routes = new Hono<AppBindings>();
            routes.get('/tenant', (c) =>
              c.json({
                result: true,
                data: {
                  tenant: c.req.header('x-tenant') ?? 'default',
                },
              })
            );
            route('/', routes);
          },
        }),
      ],
    });

    const tenantAFirst = await app.request('/tenant', {
      headers: {
        'x-tenant': 'team-a',
      },
    });
    const tenantB = await app.request('/tenant', {
      headers: {
        'x-tenant': 'team-b',
      },
    });
    const tenantASecond = await app.request('/tenant', {
      headers: {
        'x-tenant': 'team-a',
      },
    });

    expect(tenantAFirst.status).toBe(200);
    expect(tenantB.status).toBe(200);
    expect(tenantASecond.status).toBe(429);
  });

  it('memory rate limit store resets counters after the window expires', async () => {
    const store = createMemoryRateLimitStore();

    const first = await store.consume({
      key: 'client:1',
      windowMs: 5_000,
      now: 1_000,
    });
    const second = await store.consume({
      key: 'client:1',
      windowMs: 5_000,
      now: 2_000,
    });
    const third = await store.consume({
      key: 'client:1',
      windowMs: 5_000,
      now: 7_000,
    });

    expect(first).toEqual({
      totalHits: 1,
      resetAt: 6_000,
    });
    expect(second).toEqual({
      totalHits: 2,
      resetAt: 6_000,
    });
    expect(third).toEqual({
      totalHits: 1,
      resetAt: 12_000,
    });
  });

  it('redis rate limit store uses redis ttl operations to track counters', async () => {
    const counts = new Map<string, number>();
    const expiresAt = new Map<string, number>();
    const calls = {
      incr: [] as string[],
      pexpire: [] as Array<{ key: string; ttlMs: number }>,
      pttl: [] as string[],
      del: [] as string[],
    };

    const client = {
      async incr(key: string) {
        calls.incr.push(key);
        const current = counts.get(key) ?? 0;
        const next = current + 1;
        counts.set(key, next);
        return next;
      },
      async pexpire(key: string, ttlMs: number) {
        calls.pexpire.push({ key, ttlMs });
        expiresAt.set(key, ttlMs);
        return 1;
      },
      async pttl(key: string) {
        calls.pttl.push(key);
        return expiresAt.get(key) ?? -2;
      },
      async del(...keys: string[]) {
        calls.del.push(...keys);
        for (const key of keys) {
          counts.delete(key);
          expiresAt.delete(key);
        }
        return keys.length;
      },
    };

    const store = createRedisRateLimitStore({
      client,
      prefix: 'rate-test',
    });

    const first = await store.consume({
      key: 'tenant-a',
      windowMs: 10_000,
      now: 1_000,
    });
    const second = await store.consume({
      key: 'tenant-a',
      windowMs: 10_000,
      now: 2_000,
    });

    await store.reset?.('tenant-a');

    expect(first).toEqual({
      totalHits: 1,
      resetAt: 11_000,
    });
    expect(second).toEqual({
      totalHits: 2,
      resetAt: 12_000,
    });
    expect(calls.pexpire).toEqual([
      {
        key: 'rate-test:tenant-a',
        ttlMs: 10_000,
      },
    ]);
    expect(calls.del).toContain('rate-test:tenant-a');
  });

  it('metrics plugin exposes prometheus metrics for observed requests', async () => {
    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        createMetricsPlugin(),
        definePlugin({
          name: 'metrics-routes',
          setup({ route }) {
            const routes = new Hono<AppBindings>();
            routes.get('/hello', (c) =>
              c.json({
                result: true,
              })
            );
            routes.get('/boom', () => new Response('boom', { status: 503 }));
            route('/', routes);
          },
        }),
      ],
    });

    await app.request('/hello');
    await app.request('/hello');
    await app.request('/boom');

    const response = await app.request('/metrics');
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(body).toContain('humming_http_in_flight_requests 0');
    expect(body).toContain('humming_http_requests_total{method="GET",path="/hello",status="200"} 2');
    expect(body).toContain('humming_http_requests_total{method="GET",path="/boom",status="503"} 1');
    expect(body).toContain('humming_http_request_duration_ms_count{method="GET",path="/hello"} 2');
    expect(body).not.toContain('path="/metrics"');
  });

  it('metrics plugin supports custom registries and label shaping', async () => {
    const observed: MetricsObserveInput[] = [];
    let inFlight = 0;
    const registry: MetricsRegistry = {
      incrementInFlight() {
        inFlight += 1;
      },
      decrementInFlight() {
        inFlight -= 1;
      },
      observe(input) {
        observed.push(input);
      },
      render() {
        return `custom_in_flight ${inFlight}\ncustom_observed ${observed.length}\n`;
      },
    };

    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        createMetricsPlugin({
          registry,
          labelPath({ path }) {
            if (path.startsWith('/users/')) {
              return '/users/:id';
            }

            return path;
          },
        }),
        definePlugin({
          name: 'custom-metrics-routes',
          setup({ route }) {
            const routes = new Hono<AppBindings>();
            routes.get('/users/42', (c) => c.json({ ok: true }));
            route('/', routes);
          },
        }),
      ],
    });

    await app.request('/users/42');
    const metrics = await app.request('/metrics');

    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      method: 'GET',
      path: '/users/:id',
      status: 200,
    });
    expect(await metrics.text()).toContain('custom_observed 1');
  });

  it('metrics registry can be reset between test runs', async () => {
    const registry = createMetricsRegistry();

    await registry.incrementInFlight();
    await registry.observe({
      method: 'GET',
      path: '/hello',
      status: 200,
      durationMs: 12,
    });
    await registry.decrementInFlight();
    await registry.reset?.();

    const output = await registry.render();

    expect(output).toContain('humming_http_in_flight_requests 0');
    expect(output).not.toContain('path="/hello"');
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
