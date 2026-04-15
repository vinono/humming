import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { logger } from '../logger';
import { requestIdMiddleware } from '../middleware/request-id';
import { markLocalDebugRuntimeApplied } from '../runtime/local-debug';
import type { AppBindings } from '../types';
import {
  createFetchForwardTransport,
  createForwardProxy,
  type ForwardProxyOptions,
} from './proxy';

const originalFetch = globalThis.fetch;
const originalLoggerInfo = logger.info;
const originalLoggerError = logger.error;

type FetchCall = {
  input: string | URL;
  init?: RequestInit;
};

function asFetch(fn: (input: string | URL, init?: RequestInit) => Promise<Response>): typeof fetch {
  return fn as unknown as typeof fetch;
}

async function readBodyText(body: RequestInit['body']) {
  if (!body) {
    return '';
  }

  return await new Response(body).text();
}

async function readBodyBytes(body: RequestInit['body']) {
  if (!body) {
    return new Uint8Array();
  }

  return new Uint8Array(await new Response(body).arrayBuffer());
}

function createTextStream(chunks: string[]) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });
}

function buildForwardApp(proxyOptions: ForwardProxyOptions) {
  const proxy = createForwardProxy(proxyOptions);
  const app = new Hono<AppBindings>();

  app.use('*', requestIdMiddleware);
  app.all('*', async (c) => {
    const forwardedResponse = await proxy.tryForwardRequest(c);
    if (forwardedResponse) {
      return forwardedResponse;
    }

    return c.json({ result: false, errorCode: 'NO_RULE', requestId: c.get('requestId') }, 404);
  });

  return app;
}

function defaultProxyOptions(rulesJson = '[]'): ForwardProxyOptions {
  return {
    enabled: true,
    defaultTimeoutMs: 5_000,
    blockPrivateIp: false,
    rulesJson,
  };
}

describe('forward proxy', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
    logger.info = originalLoggerInfo;
    logger.error = originalLoggerError;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    logger.info = originalLoggerInfo;
    logger.error = originalLoggerError;
  });

  it('forwards request using longest prefix and preserves query', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: {
          'content-type': 'application/json',
          connection: 'keep-alive',
        },
      });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          { prefix: '/api', target: 'https://base.example.com' },
          { prefix: '/api/internal', target: 'https://internal.example.com' },
        ])
      )
    );

    const response = await app.request('/api/internal/users?id=9', {
      headers: {
        'x-correlation-id': 'req-123',
      },
    });

    expect(response.status).toBe(201);
    expect(response.headers.get('x-humming-proxy')).toBe('1');
    expect(calls.length).toBe(1);
    expect(String(calls[0]?.input)).toBe('https://internal.example.com/api/internal/users?id=9');

    const forwardedHeaders = new Headers(calls[0]?.init?.headers);
    expect(forwardedHeaders.get('x-correlation-id')).toBe('req-123');
    expect(forwardedHeaders.get('host')).toBeNull();
    expect(forwardedHeaders.get('connection')).toBeNull();
  });

  it('does not match similar prefix boundary', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    const response = await app.request('/api2/users');
    expect(response.status).toBe(404);
    expect(calls.length).toBe(0);
  });

  it('supports stripPrefix and method allowlist', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/openapi',
            target: 'https://gateway.example.com/v1',
            stripPrefix: true,
            allowedMethods: ['GET'],
          },
        ])
      )
    );

    const getResponse = await app.request('/openapi/users');
    expect(getResponse.status).toBe(200);
    expect(String(calls[0]?.input)).toBe('https://gateway.example.com/v1/users');

    const postResponse = await app.request('/openapi/users', { method: 'POST' });
    expect(postResponse.status).toBe(404);
    expect(calls.length).toBe(1);
  });

  it('supports pathRewrite while preserving suffix and query', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/api/backend',
            target: 'https://gateway.example.com',
            pathRewrite: '/v2',
          },
        ])
      )
    );

    const response = await app.request('/api/backend/users?id=9');

    expect(response.status).toBe(200);
    expect(String(calls[0]?.input)).toBe('https://gateway.example.com/v2/users?id=9');
  });

  it('rewrites exact prefix matches without forcing a trailing slash', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/api/backend',
            target: 'https://gateway.example.com',
            pathRewrite: '/v2',
          },
        ])
      )
    );

    const response = await app.request('/api/backend?mode=full');

    expect(response.status).toBe(200);
    expect(String(calls[0]?.input)).toBe('https://gateway.example.com/v2?mode=full');
  });

  it('does not append a trailing slash when stripPrefix matches the full path exactly', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/openapi/users',
            target: 'https://gateway.example.com/v1',
            stripPrefix: true,
          },
        ])
      )
    );

    const response = await app.request('/openapi/users?mode=full');

    expect(response.status).toBe(200);
    expect(String(calls[0]?.input)).toBe('https://gateway.example.com/v1?mode=full');
  });

  it('preserves a trailing slash when stripPrefix forwards a nested root path', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/openapi',
            target: 'https://gateway.example.com/v1',
            stripPrefix: true,
          },
        ])
      )
    );

    const response = await app.request('/openapi/?tag=a&tag=b');

    expect(response.status).toBe(200);
    expect(String(calls[0]?.input)).toBe('https://gateway.example.com/v1/?tag=a&tag=b');
  });

  it('preserves multiple set-cookie headers from upstream', async () => {
    globalThis.fetch = asFetch(async () => {
      const headers = new Headers();
      headers.append('set-cookie', 'session=abc; Path=/; HttpOnly');
      headers.append('set-cookie', 'tenant=cn; Path=/; Secure');

      return new Response('ok', {
        status: 200,
        headers,
      });
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    const response = await app.request('/api/cookies');

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([
      'session=abc; Path=/; HttpOnly',
      'tenant=cn; Path=/; Secure',
    ]);
  });

  it('passes through text request bodies and content-type headers', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('accepted', { status: 202 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    const response = await app.request('/api/echo', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
      body: 'hello humming',
    });

    const forwardedHeaders = new Headers(calls[0]?.init?.headers);
    const bodyText = await readBodyText(calls[0]?.init?.body);

    expect(response.status).toBe(202);
    expect(forwardedHeaders.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(bodyText).toBe('hello humming');
  });

  it('passes through multipart form uploads', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('uploaded', { status: 201 });
    });

    const formData = new FormData();
    formData.append('name', 'humming');
    formData.append('file', new Blob(['demo-content'], { type: 'text/plain' }), 'demo.txt');

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/upload', target: 'https://files.example.com' }]))
    );

    const response = await app.request('/upload', {
      method: 'POST',
      body: formData,
    });

    const forwardedHeaders = new Headers(calls[0]?.init?.headers);
    const bodyText = await readBodyText(calls[0]?.init?.body);

    expect(response.status).toBe(201);
    expect(forwardedHeaders.get('content-type')).toContain('multipart/form-data; boundary=');
    expect(bodyText).toContain('name="name"');
    expect(bodyText).toContain('humming');
    expect(bodyText).toContain('name="file"');
    expect(bodyText).toContain('filename="demo.txt"');
    expect(bodyText).toContain('demo-content');
  });

  it('applies static request and response headers from forward rules', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', {
        status: 200,
        headers: {
          'cache-control': 'private',
          'x-upstream': '1',
        },
      });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/api',
            target: 'https://base.example.com',
            requestHeaders: {
              'x-service-name': 'humming',
            },
            responseHeaders: {
              'cache-control': 'no-store',
              'x-response-mode': 'rule',
            },
          },
        ])
      )
    );

    const response = await app.request('/api/users');
    const forwardedHeaders = new Headers(calls[0]?.init?.headers);

    expect(response.status).toBe(200);
    expect(forwardedHeaders.get('x-service-name')).toBe('humming');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-response-mode')).toBe('rule');
    expect(response.headers.get('x-upstream')).toBe('1');
  });

  it('preserves the original host header when preserveHost is enabled', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/api',
            target: 'https://base.example.com',
            preserveHost: true,
          },
        ])
      )
    );

    const response = await app.request('http://frontend.local/api/users', {
      headers: {
        host: 'frontend.local',
      },
    });

    const forwardedHeaders = new Headers(calls[0]?.init?.headers);

    expect(response.status).toBe(200);
    expect(forwardedHeaders.get('host')).toBe('frontend.local');
    expect(forwardedHeaders.get('x-forwarded-host')).toBe('frontend.local');
  });

  it('passes follow redirect to fetch when enabled', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/api',
            target: 'https://base.example.com',
            followRedirect: true,
          },
        ])
      )
    );

    const response = await app.request('/api/users');

    expect(response.status).toBe(200);
    expect(calls[0]?.init?.redirect).toBe('follow');
  });

  it('uses the configured default transport strategy', async () => {
    const transportCalls: string[] = [];
    const app = buildForwardApp({
      ...defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }])),
      defaultTransport: 'test-transport',
      transports: {
        'test-transport': {
          async execute(input) {
            transportCalls.push(input.upstreamUrl.toString());
            return {
              response: new Response('ok', {
                status: 202,
                headers: {
                  'x-transport-name': 'test-transport',
                },
              }),
              attempts: 1,
            };
          },
        },
      },
    });

    const response = await app.request('/api/users');

    expect(response.status).toBe(202);
    expect(response.headers.get('x-transport-name')).toBe('test-transport');
    expect(transportCalls).toEqual(['https://base.example.com/api/users']);
  });

  it('supports the built-in keepalive-fetch transport strategy', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp({
      ...defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }])),
      defaultTransport: 'keepalive-fetch',
    });

    const response = await app.request('/api/users');

    expect(response.status).toBe(200);
    expect(calls.length).toBe(1);
    expect(calls[0]?.init?.keepalive).toBe(true);
  });

  it('supports per-rule transport selection', async () => {
    const transportCalls: string[] = [];
    const app = buildForwardApp({
      ...defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/api',
            target: 'https://base.example.com',
            transport: 'custom-transport',
          },
        ])
      ),
      transports: {
        'custom-transport': {
          async execute(input) {
            transportCalls.push(input.rule.transport);
            return {
              response: new Response('custom', { status: 203 }),
              attempts: 1,
            };
          },
        },
      },
    });

    const response = await app.request('/api/users');

    expect(response.status).toBe(203);
    expect(await response.text()).toBe('custom');
    expect(transportCalls).toEqual(['custom-transport']);
  });

  it('strips configured request headers before forwarding', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/api',
            target: 'https://base.example.com',
            stripRequestHeaders: ['authorization', 'x-tenant'],
          },
        ])
      )
    );

    const response = await app.request('/api/users', {
      headers: {
        authorization: 'Bearer secret-token',
        'x-tenant': 'cn',
        'x-keep': '1',
      },
    });

    const forwardedHeaders = new Headers(calls[0]?.init?.headers);

    expect(response.status).toBe(200);
    expect(forwardedHeaders.get('authorization')).toBeNull();
    expect(forwardedHeaders.get('x-tenant')).toBeNull();
    expect(forwardedHeaders.get('x-keep')).toBe('1');
  });

  it('uses fallback target when rule is not matched', async () => {
    const calls: FetchCall[] = [];
    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('fallback', { status: 200 });
    });

    const app = buildForwardApp({
      ...defaultProxyOptions('[]'),
      fallbackTarget: 'https://fallback.example.com',
    });

    const response = await app.request('/anything/here');
    expect(response.status).toBe(200);
    expect(String(calls[0]?.input)).toBe('https://fallback.example.com/anything/here');
  });

  it('allows beforeRequest hooks to rewrite upstream requests', async () => {
    const calls: FetchCall[] = [];
    const proxy = createForwardProxy(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    proxy.registerBeforeRequest(({ upstreamUrl, headers }) => {
      const nextUrl = new URL(upstreamUrl.toString());
      nextUrl.pathname = '/rewritten';

      const nextHeaders = new Headers(headers);
      nextHeaders.set('x-plugin-hook', 'enabled');

      return {
        upstreamUrl: nextUrl,
        headers: nextHeaders,
      };
    });

    globalThis.fetch = asFetch(async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    });

    const app = new Hono<AppBindings>();
    app.use('*', requestIdMiddleware);
    app.all('*', async (c) => {
      const forwardedResponse = await proxy.tryForwardRequest(c);
      return forwardedResponse ?? c.notFound();
    });

    const response = await app.request('/api/users');

    expect(response.status).toBe(200);
    expect(String(calls[0]?.input)).toBe('https://base.example.com/rewritten');
    expect(new Headers(calls[0]?.init?.headers).get('x-plugin-hook')).toBe('enabled');
  });

  it('logs split phase timings for forwarded requests', async () => {
    const infoLogs: Array<{ payload: unknown; message?: string }> = [];
    logger.info = ((payload: unknown, message?: string) => {
      infoLogs.push({ payload, message });
      return logger;
    }) as typeof logger.info;

    const proxy = createForwardProxy(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    proxy.registerBeforeMatch(({ requestUrl }) => {
      const nextUrl = new URL(requestUrl.toString());
      nextUrl.searchParams.set('hooked', '1');
      return { requestUrl: nextUrl };
    });

    proxy.registerBeforeRequest(({ context, headers }) => {
      markLocalDebugRuntimeApplied(context);
      const nextHeaders = new Headers(headers);
      nextHeaders.set('x-observed', '1');
      return { headers: nextHeaders };
    });

    proxy.registerAfterResponse(({ response }) => {
      const nextHeaders = new Headers(response.headers);
      nextHeaders.set('x-after-response', '1');
      return new Response(response.body, {
        status: response.status,
        headers: nextHeaders,
      });
    });

    globalThis.fetch = asFetch(async () => new Response('ok', { status: 200 }));

    const app = new Hono<AppBindings>();
    app.use('*', requestIdMiddleware);
    app.all('*', async (c) => {
      const forwardedResponse = await proxy.tryForwardRequest(c);
      return forwardedResponse ?? c.notFound();
    });

    const response = await app.request('/api/users');

    expect(response.status).toBe(200);
    expect(response.headers.get('x-after-response')).toBe('1');

    const forwardedLog = infoLogs.find((entry) => entry.message === 'request forwarded') as
      | {
          payload: {
            localDebugRuntimeApplied: boolean;
            hookCounts: Record<string, number>;
            phaseTimingsMs: Record<string, number>;
            transportStrategy: string;
            transportAttempts: number;
          };
        }
      | undefined;

    expect(forwardedLog).toBeDefined();
    expect(forwardedLog?.payload.localDebugRuntimeApplied).toBe(true);
    expect(forwardedLog?.payload.transportStrategy).toBe('fetch');
    expect(forwardedLog?.payload.transportAttempts).toBe(1);
    expect(forwardedLog?.payload.hookCounts).toEqual({
      beforeMatch: 1,
      beforeRequest: 1,
      afterResponse: 1,
      onError: 0,
    });
    expect(typeof forwardedLog?.payload.phaseTimingsMs.beforeMatch).toBe('number');
    expect(typeof forwardedLog?.payload.phaseTimingsMs.beforeRequest).toBe('number');
    expect(typeof forwardedLog?.payload.phaseTimingsMs.upstream).toBe('number');
    expect(typeof forwardedLog?.payload.phaseTimingsMs.afterResponse).toBe('number');
    expect(forwardedLog?.payload.phaseTimingsMs.onError).toBe(0);
    expect(typeof forwardedLog?.payload.phaseTimingsMs.total).toBe('number');
  });

  it('retries retryable upstream statuses with a retry transport strategy', async () => {
    const calls: FetchCall[] = [];
    const retryTransport = createFetchForwardTransport({
      fetchImpl: asFetch(async (input: string | URL, init?: RequestInit) => {
        calls.push({ input, init });

        if (calls.length === 1) {
          return new Response('temporary unavailable', { status: 503 });
        }

        return new Response('ok', { status: 200 });
      }),
      retry: {
        maxAttempts: 2,
        statuses: [503],
      },
    });

    const app = buildForwardApp({
      ...defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }])),
      defaultTransport: 'retry-fetch',
      transports: {
        'retry-fetch': retryTransport,
      },
    });

    const response = await app.request('/api/users');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
    expect(calls.length).toBe(2);
  });

  it('supports retry backoff and status-specific delay overrides', async () => {
    const sleepCalls: number[] = [];
    let attempts = 0;
    const transport = createFetchForwardTransport({
      fetchImpl: asFetch(async () => {
        attempts += 1;

        if (attempts < 3) {
          return new Response('busy', { status: 503 });
        }

        return new Response('ok', { status: 200 });
      }),
      retry: {
        maxAttempts: 3,
        statuses: [503],
        delayMs: 10,
        statusDelayMs: {
          503: 20,
        },
        backoff: 'linear',
      },
      sleep: async (ms) => {
        sleepCalls.push(ms);
      },
    });

    const app = buildForwardApp({
      ...defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }])),
      defaultTransport: 'custom-retry',
      transports: {
        'custom-retry': transport,
      },
    });

    const response = await app.request('/api/users');

    expect(response.status).toBe(200);
    expect(sleepCalls).toEqual([20, 40]);
  });

  it('allows retry policy callbacks to override retry decisions and delays', async () => {
    const sleepCalls: number[] = [];
    let attempts = 0;
    const transport = createFetchForwardTransport({
      fetchImpl: asFetch(async () => {
        attempts += 1;

        if (attempts === 1) {
          return new Response('retry-me', { status: 418 });
        }

        return new Response('ok', { status: 200 });
      }),
      retry: {
        maxAttempts: 2,
        statuses: [],
        shouldRetry(context) {
          return context.response?.status === 418 || context.defaultShouldRetry;
        },
        getDelayMs(context) {
          if (context.response?.status === 418) {
            return 7;
          }

          return context.defaultDelayMs;
        },
      },
      sleep: async (ms) => {
        sleepCalls.push(ms);
      },
    });

    const app = buildForwardApp({
      ...defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }])),
      defaultTransport: 'callback-retry',
      transports: {
        'callback-retry': transport,
      },
    });

    const response = await app.request('/api/users');

    expect(response.status).toBe(200);
    expect(sleepCalls).toEqual([7]);
  });

  it('allows onError hooks to override default upstream errors', async () => {
    const proxy = createForwardProxy(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    proxy.registerOnError(({ context }) => {
      return context.json(
        {
          result: false,
          errorCode: 'PLUGIN_FORWARD_ERROR',
          requestId: context.get('requestId'),
        },
        418
      );
    });

    globalThis.fetch = asFetch(async () => {
      throw new Error('boom');
    });

    const app = new Hono<AppBindings>();
    app.use('*', requestIdMiddleware);
    app.all('*', async (c) => {
      const forwardedResponse = await proxy.tryForwardRequest(c);
      return forwardedResponse ?? c.notFound();
    });

    const response = await app.request('/api/users');
    const body = (await response.json()) as { errorCode: string };

    expect(response.status).toBe(418);
    expect(body.errorCode).toBe('PLUGIN_FORWARD_ERROR');
  });

  it('returns 504 when upstream request times out', async () => {
    globalThis.fetch = asFetch(async () => {
      const error = new Error('timeout');
      (error as Error & { name: string }).name = 'AbortError';
      throw error;
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    const response = await app.request('/api/users');
    const body = (await response.json()) as { errorCode: string; errorStage: string };

    expect(response.status).toBe(504);
    expect(body.errorCode).toBe('UPSTREAM_TIMEOUT');
    expect(body.errorStage).toBe('upstream');
  });

  it('returns 502 when upstream request fails', async () => {
    globalThis.fetch = asFetch(async () => {
      throw new Error('boom');
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    const response = await app.request('/api/users');
    const body = (await response.json()) as {
      errorCode: string;
      errorStage: string;
      transportErrorCategory: string;
    };

    expect(response.status).toBe(502);
    expect(body.errorCode).toBe('UPSTREAM_NETWORK_ERROR');
    expect(body.errorStage).toBe('upstream');
    expect(body.transportErrorCategory).toBe('network');
  });

  it('classifies DNS failures from upstream fetch', async () => {
    globalThis.fetch = asFetch(async () => {
      const error = new Error('getaddrinfo ENOTFOUND api.example.com') as Error & { code?: string };
      error.code = 'ENOTFOUND';
      throw error;
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    const response = await app.request('/api/users');
    const body = (await response.json()) as {
      errorCode: string;
      transportErrorCategory: string;
      transportErrorCode: string | null;
    };

    expect(response.status).toBe(502);
    expect(body.errorCode).toBe('UPSTREAM_DNS_ERROR');
    expect(body.transportErrorCategory).toBe('dns');
    expect(body.transportErrorCode).toBe('ENOTFOUND');
  });

  it('classifies connection failures from upstream fetch', async () => {
    globalThis.fetch = asFetch(async () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:443') as Error & { code?: string };
      error.code = 'ECONNREFUSED';
      throw error;
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    const response = await app.request('/api/users');
    const body = (await response.json()) as {
      errorCode: string;
      transportErrorCategory: string;
      transportErrorCode: string | null;
    };

    expect(response.status).toBe(502);
    expect(body.errorCode).toBe('UPSTREAM_CONNECT_ERROR');
    expect(body.transportErrorCategory).toBe('connect');
    expect(body.transportErrorCode).toBe('ECONNREFUSED');
  });

  it('preserves redirect status and location header from upstream', async () => {
    globalThis.fetch = asFetch(async () => {
      return new Response(null, {
        status: 307,
        headers: {
          location: 'https://login.example.com/callback',
        },
      });
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    const response = await app.request('/api/users');

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://login.example.com/callback');
    expect(response.headers.get('x-humming-proxy')).toBe('1');
  });

  it('accepts configured non-2xx upstream statuses', async () => {
    globalThis.fetch = asFetch(async () => {
      return new Response(JSON.stringify({ error: 'missing' }), {
        status: 404,
        headers: {
          'content-type': 'application/json',
        },
      });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/api',
            target: 'https://base.example.com',
            acceptStatuses: [200, 404],
          },
        ])
      )
    );

    const response = await app.request('/api/users');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'missing' });
  });

  it('rejects upstream statuses outside acceptStatuses', async () => {
    globalThis.fetch = asFetch(async () => {
      return new Response(JSON.stringify({ error: 'missing' }), {
        status: 404,
        headers: {
          'content-type': 'application/json',
        },
      });
    });

    const app = buildForwardApp(
      defaultProxyOptions(
        JSON.stringify([
          {
            prefix: '/api',
            target: 'https://base.example.com',
            acceptStatuses: [200],
          },
        ])
      )
    );

    const response = await app.request('/api/users');
    const body = (await response.json()) as {
      errorCode: string;
      errorStage: string;
      upstreamStatus: number;
    };

    expect(response.status).toBe(502);
    expect(body.errorCode).toBe('UPSTREAM_STATUS_NOT_ACCEPTED');
    expect(body.errorStage).toBe('upstream');
    expect(body.upstreamStatus).toBe(404);
  });

  it('preserves binary downloads and content-disposition headers', async () => {
    const payload = new Uint8Array([0, 1, 2, 3, 255]);
    globalThis.fetch = asFetch(async () => {
      return new Response(payload, {
        status: 200,
        headers: {
          'content-type': 'application/octet-stream',
          'content-disposition': 'attachment; filename="demo.bin"',
        },
      });
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/download', target: 'https://files.example.com' }]))
    );

    const response = await app.request('/download/report.bin');
    const bytes = await readBodyBytes(response.body);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="demo.bin"');
    expect(Array.from(bytes)).toEqual([0, 1, 2, 3, 255]);
  });

  it('preserves streamed upstream response bodies', async () => {
    globalThis.fetch = asFetch(async () => {
      return new Response(createTextStream(['chunk-1', '|chunk-2', '|chunk-3']), {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      });
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/stream', target: 'https://stream.example.com' }]))
    );

    const response = await app.request('/stream/events');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toBe('chunk-1|chunk-2|chunk-3');
  });

  it('preserves larger upstream response bodies and content-length headers', async () => {
    const payloadSize = 512 * 1024;
    const payload = new Uint8Array(payloadSize);

    for (let index = 0; index < payload.length; index += 1) {
      payload[index] = index % 251;
    }

    globalThis.fetch = asFetch(async () => {
      return new Response(payload, {
        status: 200,
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': String(payload.length),
        },
      });
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/large', target: 'https://files.example.com' }]))
    );

    const response = await app.request('/large/blob.bin');
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-length')).toBe(String(payload.length));
    expect(bytes.length).toBe(payload.length);
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(1);
    expect(bytes[250]).toBe(250);
    expect(bytes[251]).toBe(0);
    expect(bytes[payload.length - 1]).toBe(payload[payload.length - 1]);
  });

  it('returns a forward hook error when a beforeRequest hook throws', async () => {
    const errorLogs: Array<{ payload: unknown; message?: string }> = [];
    logger.error = ((payload: unknown, message?: string) => {
      errorLogs.push({ payload, message });
      return logger;
    }) as typeof logger.error;

    const proxy = createForwardProxy(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    proxy.registerBeforeRequest(() => {
      throw new Error('broken hook');
    });

    const app = new Hono<AppBindings>();
    app.use('*', requestIdMiddleware);
    app.all('*', async (c) => {
      const forwardedResponse = await proxy.tryForwardRequest(c);
      return forwardedResponse ?? c.notFound();
    });

    const response = await app.request('/api/users');
    const body = (await response.json()) as { errorCode: string; errorStage: string; errorMsg: string };

    expect(response.status).toBe(500);
    expect(body.errorCode).toBe('FORWARD_HOOK_ERROR');
    expect(body.errorStage).toBe('beforeRequest');
    expect(body.errorMsg).toContain('beforeRequest');

    const forwardErrorLog = errorLogs.find((entry) => entry.message === 'forward request failed') as
      | {
          payload: {
            stage: string;
            hookCounts: Record<string, number>;
            phaseTimingsMs: Record<string, number>;
          };
        }
      | undefined;

    expect(forwardErrorLog).toBeDefined();
    expect(forwardErrorLog?.payload.stage).toBe('beforeRequest');
    expect(forwardErrorLog?.payload.hookCounts.beforeRequest).toBe(1);
    expect(typeof forwardErrorLog?.payload.phaseTimingsMs.beforeRequest).toBe('number');
    expect(typeof forwardErrorLog?.payload.phaseTimingsMs.total).toBe('number');
  });

  it('returns a forward hook error when a beforeMatch hook throws', async () => {
    const proxy = createForwardProxy(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    proxy.registerBeforeMatch(() => {
      throw new Error('broken beforeMatch hook');
    });

    const app = new Hono<AppBindings>();
    app.use('*', requestIdMiddleware);
    app.all('*', async (c) => {
      const forwardedResponse = await proxy.tryForwardRequest(c);
      return forwardedResponse ?? c.notFound();
    });

    const response = await app.request('/api/users');
    const body = (await response.json()) as { errorCode: string; errorStage: string };

    expect(response.status).toBe(500);
    expect(body.errorCode).toBe('FORWARD_HOOK_ERROR');
    expect(body.errorStage).toBe('beforeMatch');
  });

  it('blocks localhost/private targets by default', () => {
    expect(() =>
      createForwardProxy({
        enabled: true,
        defaultTimeoutMs: 5_000,
        blockPrivateIp: true,
        rulesJson: JSON.stringify([{ prefix: '/api', target: 'http://127.0.0.1:9000' }]),
      })
    ).toThrow('Forbidden forward target host');
  });

  it('rejects rules that combine stripPrefix and pathRewrite', () => {
    expect(() =>
      createForwardProxy({
        enabled: true,
        defaultTimeoutMs: 5_000,
        blockPrivateIp: false,
        rulesJson: JSON.stringify([
          {
            prefix: '/api',
            target: 'https://base.example.com',
            stripPrefix: true,
            pathRewrite: '/v2',
          },
        ]),
      })
    ).toThrow('pathRewrite cannot be combined with stripPrefix');
  });

  it('rejects unknown default transport strategies', () => {
    expect(() =>
      createForwardProxy({
        enabled: true,
        defaultTimeoutMs: 5_000,
        blockPrivateIp: false,
        defaultTransport: 'missing-transport',
        rulesJson: JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]),
      })
    ).toThrow('Unknown forward transport "missing-transport" configured for default transport');
  });

  it('rejects unknown per-rule transport strategies', () => {
    expect(() =>
      createForwardProxy({
        enabled: true,
        defaultTimeoutMs: 5_000,
        blockPrivateIp: false,
        rulesJson: JSON.stringify([
          {
            prefix: '/api',
            target: 'https://base.example.com',
            transport: 'missing-transport',
          },
        ]),
      })
    ).toThrow('Unknown forward transport "missing-transport" configured for rule prefix "/api"');
  });
});
