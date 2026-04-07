import { describe, expect, it } from 'bun:test';
import { createHttpClient } from './client';
import { HttpClientError } from './types';

describe('http client', () => {
  it('sends request id and query params for json requests', async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const client = createHttpClient({
      fetchImpl: async (input, init) => {
        calls.push({ input: String(input), init });
        return new Response(JSON.stringify({ result: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    const data = await client.requestJson<{ result: boolean }>('https://api.example.com/users', {
      query: { page: 2, status: 'active' },
      requestId: 'req-http-1',
    });

    expect(data).toEqual({ result: true });
    expect(calls[0]?.input).toBe('https://api.example.com/users?page=2&status=active');
    expect(new Headers(calls[0]?.init?.headers).get('x-correlation-id')).toBe('req-http-1');
  });

  it('encodes object bodies as json', async () => {
    const client = createHttpClient({
      fetchImpl: async (_input, init) => {
        expect(init?.method).toBe('POST');
        expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
        expect(init?.body).toBe(JSON.stringify({ name: 'Humming' }));

        return new Response('created', { status: 201 });
      },
    });

    const response = await client.post('https://api.example.com/projects', {
      body: { name: 'Humming' },
    });

    expect(response.status).toBe(201);
  });

  it('retries retryable failures and eventually succeeds', async () => {
    const attempts: number[] = [];
    const sleeps: number[] = [];
    const client = createHttpClient({
      defaultRetry: 2,
      defaultRetryDelayMs: 50,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      fetchImpl: async () => {
        attempts.push(1);
        if (attempts.length < 3) {
          return new Response('bad gateway', { status: 502 });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    const data = await client.requestJson<{ ok: boolean }>('https://api.example.com/retry');

    expect(data).toEqual({ ok: true });
    expect(attempts.length).toBe(3);
    expect(sleeps).toEqual([50, 50]);
  });

  it('throws normalized timeout errors', async () => {
    const client = createHttpClient({
      fetchImpl: async (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason ?? new Error('aborted')), {
            once: true,
          });
        }),
    });

    await expect(
      client.request('https://api.example.com/slow', {
        timeoutMs: 5,
      })
    ).rejects.toMatchObject({
      code: 'HTTP_TIMEOUT',
    } satisfies Partial<HttpClientError>);
  });

  it('throws normalized upstream errors with status and body', async () => {
    const client = createHttpClient({
      fetchImpl: async () => new Response(JSON.stringify({ error: 'boom' }), { status: 503 }),
    });

    await expect(client.request('https://api.example.com/fail')).rejects.toMatchObject({
      code: 'HTTP_RESPONSE_ERROR',
      status: 503,
      responseBody: JSON.stringify({ error: 'boom' }),
    } satisfies Partial<HttpClientError>);
  });

  it('supports request hooks', async () => {
    const events: string[] = [];
    const client = createHttpClient({
      onRequestStart: (meta) => {
        events.push(`start:${meta.attempt}`);
      },
      onRequestSuccess: (meta) => {
        events.push(`success:${meta.status}`);
      },
      fetchImpl: async () => new Response('ok', { status: 200 }),
    });

    await client.get('https://api.example.com/hook');

    expect(events).toEqual(['start:1', 'success:200']);
  });
});
