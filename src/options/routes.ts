import { Hono } from 'hono';
import { z } from 'zod';
import type { AppBindings } from '../types';
import { optionsService } from './service';
import type { OptionRequest, OptionResponse, OptionRuntimeContext } from './types';

const OptionRequestSchema = z.object({
  key: z.string().trim().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

const OptionBatchSchema = z.array(OptionRequestSchema);

type OptionsRouteService = {
  resolveMany: (requests: OptionRequest[], runtime: OptionRuntimeContext) => Promise<OptionResponse[]>;
};

function toKeyRequests(keys: string | undefined): OptionRequest[] {
  if (!keys) {
    return [];
  }

  return keys
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0)
    .map((key) => ({ key }));
}

export function createOptionsRoutes(service: OptionsRouteService = optionsService) {
  const routes = new Hono<AppBindings>();

  routes.get('/api/options', async (c) => {
    const requests = toKeyRequests(c.req.query('keys'));
    if (requests.length === 0) {
      return c.json(
        {
          result: false,
          errorCode: 'OPTIONS_KEYS_REQUIRED',
          errorMsg: 'Query parameter keys is required',
          requestId: c.get('requestId'),
        },
        400
      );
    }

    const data = await service.resolveMany(requests, {
      requestId: c.get('requestId'),
      headers: c.req.raw.headers,
    });

    return c.json({
      result: true,
      data,
      requestId: c.get('requestId'),
    });
  });

  routes.post('/api/options', async (c) => {
    const payload = await c.req.json();
    const requests = OptionBatchSchema.parse(payload);

    const data = await service.resolveMany(requests, {
      requestId: c.get('requestId'),
      headers: c.req.raw.headers,
    });

    return c.json({
      result: true,
      data,
      requestId: c.get('requestId'),
    });
  });

  return routes;
}

export const optionsRoutes = createOptionsRoutes();
