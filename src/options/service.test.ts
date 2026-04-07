import { describe, expect, it } from 'bun:test';
import { createOptionsService } from './service';

describe('options service', () => {
  it('resolves static and http option sources', async () => {
    const httpCalls: Array<{ input: string; init?: RequestInit }> = [];

    const service = createOptionsService({
      configJson: JSON.stringify({
        countries: {
          source: 'static',
          items: [
            { value: 'CN', label: 'China' },
            { value: 'US', label: 'United States' },
          ],
        },
        users: {
          source: 'http',
          url: 'https://backend.example.com/users',
          method: 'GET',
          responsePath: 'payload.items',
          valueField: 'id',
          labelField: 'name',
          forwardHeaders: ['tenant'],
        },
      }),
      fetchImpl: (async (input, init) => {
        httpCalls.push({
          input: String(input),
          init,
        });

        return new Response(
          JSON.stringify({
            payload: {
              items: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          }
        );
      }) as typeof fetch,
    });

    const data = await service.resolveMany(
      [
        { key: 'countries' },
        { key: 'users', params: { page: 2 } },
        { key: 'missing' },
      ],
      {
        requestId: 'req-opt-1',
        headers: new Headers({ tenant: 'acme' }),
      }
    );

    expect(data[0]).toEqual({
      key: 'countries',
      params: undefined,
      val: [
        { value: 'CN', label: 'China' },
        { value: 'US', label: 'United States' },
      ],
    });
    expect(data[1]).toEqual({
      key: 'users',
      params: { page: 2 },
      val: [
      { id: 1, name: 'Alice', value: 1, label: 'Alice' },
      { id: 2, name: 'Bob', value: 2, label: 'Bob' },
      ],
    });
    expect(data[2]).toEqual({
      key: 'missing',
      params: undefined,
      val: null,
      error: 'Option key not configured: missing',
    });

    expect(httpCalls.length).toBe(1);
    expect(httpCalls[0]?.input).toBe('https://backend.example.com/users?page=2');
    expect(new Headers(httpCalls[0]?.init?.headers).get('tenant')).toBe('acme');
    expect(new Headers(httpCalls[0]?.init?.headers).get('x-correlation-id')).toBe('req-opt-1');
  });

  it('maps object payloads from http responses to standard options', async () => {
    const service = createOptionsService({
      configJson: JSON.stringify({
        status: {
          source: 'http',
          url: 'https://backend.example.com/status',
          method: 'GET',
          responsePath: 'data',
          valueField: 'code',
          labelField: 'name',
        },
      }),
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({
            data: [{ active: true, code: 'A', name: 'Active' }],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          }
        )) as unknown as typeof fetch,
    });

    const data = await service.resolveMany(
      [{ key: 'status' }],
      {
        requestId: 'req-opt-2',
        headers: new Headers(),
      }
    );

    expect(data[0]?.val).toEqual([
      { active: true, code: 'A', name: 'Active', value: 'A', label: 'Active' },
    ]);
  });

  it('supports custom option source registration via registry', async () => {
    const service = createOptionsService({
      configJson: JSON.stringify({
        greeting: {
          type: 'custom',
          prefix: 'Hello',
        },
      }),
    });

    service.registerSource('custom', async ({ rule, request }) => {
      return [
        {
          value: String(request.params?.name ?? 'world'),
          label: `${String(rule.prefix)} ${String(request.params?.name ?? 'world')}`,
        },
      ];
    });

    const data = await service.resolveMany(
      [{ key: 'greeting', params: { name: 'Codex' } }],
      {
        requestId: 'req-opt-3',
        headers: new Headers(),
      }
    );

    expect(data[0]).toEqual({
      key: 'greeting',
      params: { name: 'Codex' },
      val: [{ value: 'Codex', label: 'Hello Codex' }],
    });
  });

  it('supports legacy source config by normalizing to type', async () => {
    const service = createOptionsService({
      configJson: JSON.stringify({
        countries: {
          source: 'static',
          items: [{ value: 'CN', label: 'China' }],
        },
      }),
    });

    const data = await service.resolveMany(
      [{ key: 'countries' }],
      {
        requestId: 'req-opt-4',
        headers: new Headers(),
      }
    );

    expect(data[0]?.val).toEqual([{ value: 'CN', label: 'China' }]);
  });
});
