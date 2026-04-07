import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { requestIdMiddleware } from '../middleware/request-id';
import type { AppBindings } from '../types';
import { createForwardProxy, type ForwardProxyOptions } from './proxy';

const originalFetch = globalThis.fetch;

type FetchCall = {
  input: string | URL;
  init?: RequestInit;
};

function asFetch(fn: (input: string | URL, init?: RequestInit) => Promise<Response>): typeof fetch {
  return fn as unknown as typeof fetch;
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
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
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
    const body = (await response.json()) as { errorCode: string };

    expect(response.status).toBe(504);
    expect(body.errorCode).toBe('UPSTREAM_TIMEOUT');
  });

  it('returns 502 when upstream request fails', async () => {
    globalThis.fetch = asFetch(async () => {
      throw new Error('boom');
    });

    const app = buildForwardApp(
      defaultProxyOptions(JSON.stringify([{ prefix: '/api', target: 'https://base.example.com' }]))
    );

    const response = await app.request('/api/users');
    const body = (await response.json()) as { errorCode: string };

    expect(response.status).toBe(502);
    expect(body.errorCode).toBe('UPSTREAM_ERROR');
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
});
