import { z } from 'zod';
import type { HttpClient } from '../../http/types';
import type { OptionSourceRegistry } from '../registry';
import { mapArrayToOptions } from './static';

const HttpOptionRuleSchema = z.object({
  type: z.literal('http'),
  url: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    }, 'http option url must be a valid http(s) URL'),
  method: z.enum(['GET', 'POST']).default('GET'),
  responsePath: z.string().trim().min(1).default('data'),
  valueField: z.string().trim().min(1).optional(),
  labelField: z.string().trim().min(1).optional(),
  headers: z.record(z.string(), z.string()).default({}),
  forwardHeaders: z.array(z.string().trim().min(1)).default([]),
});

function getByPath(value: unknown, path: string | undefined): unknown {
  if (!path) {
    return value;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, value);
}

export function registerHttpOptionSource(registry: OptionSourceRegistry, client: HttpClient) {
  registry.register('http', async ({ rule, request, runtime }) => {
    const parsedRule = HttpOptionRuleSchema.parse(rule);
    const headers = new Headers(parsedRule.headers);
    headers.set('x-correlation-id', runtime.requestId);

    for (const headerName of parsedRule.forwardHeaders) {
      const headerValue = runtime.headers.get(headerName);
      if (headerValue) {
        headers.set(headerName, headerValue);
      }
    }

    const method = parsedRule.method;
    const params = request.params ?? {};
    const requestHeaders = Object.fromEntries(headers.entries());

    const payload = await client.requestJson<unknown>(parsedRule.url, {
      method,
      headers: method === 'GET' ? requestHeaders : { ...requestHeaders, 'content-type': 'application/json' },
      query: method === 'GET' ? params : undefined,
      body: method === 'GET' ? undefined : params,
      requestId: runtime.requestId,
    });
    const data = getByPath(payload, parsedRule.responsePath);

    if (!Array.isArray(data)) {
      throw new Error(`Options upstream payload at ${parsedRule.responsePath} is not an array`);
    }

    return mapArrayToOptions(data, parsedRule.valueField, parsedRule.labelField);
  });
}
