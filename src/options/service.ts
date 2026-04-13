import { z } from 'zod';
import { createHttpClient, httpClient } from '../http/client';
import type { FetchLike } from '../http/types';
import { createOptionSourceRegistry, type OptionSourceRegistry } from './registry';
import { registerHttpOptionSource } from './providers/http';
import { registerStaticOptionSource } from './providers/static';
import type { OptionRequest, OptionResponse, OptionRule, OptionRuntimeContext } from './types';

const OptionRuleSchema = z
  .object({
    type: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).optional(),
  })
  .catchall(z.unknown())
  .transform<OptionRule>((rule, ctx) => {
    const type = rule.type ?? rule.source;
    if (!type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'option rule must define type or source',
      });
      return z.NEVER;
    }

    return {
      ...rule,
      type,
    };
  });

const OptionsConfigSchema = z.record(z.string(), OptionRuleSchema);

export function createOptionsService(options?: {
  configJson?: string;
  fetchImpl?: FetchLike;
  registry?: OptionSourceRegistry;
}) {
  const config = OptionsConfigSchema.parse(JSON.parse(options?.configJson ?? '{}'));
  const client = options?.fetchImpl ? createInlineHttpClient(options.fetchImpl) : httpClient;
  const registry = options?.registry ?? createDefaultOptionSourceRegistry(client);

  async function resolveRule(rule: OptionRule, request: OptionRequest, runtime: OptionRuntimeContext) {
    const resolver = registry.resolve(rule.type);
    if (!resolver) {
      throw new Error(`Option source type is not registered: ${rule.type}`);
    }

    return resolver({
      rule,
      request,
      runtime,
    });
  }

  async function resolveMany(requests: OptionRequest[], runtime: OptionRuntimeContext): Promise<OptionResponse[]> {
    return Promise.all(
      requests.map(async (request) => {
        const key = request.key.trim();
        const rule = config[key];

        if (!rule) {
          return {
            key,
            val: null,
            params: request.params,
            error: `Option key not configured: ${key}`,
          };
        }

        try {
          const val = await resolveRule(rule, request, runtime);
          return {
            key,
            val,
            params: request.params,
          };
        } catch (error) {
          return {
            key,
            val: null,
            params: request.params,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );
  }

  return {
    resolveMany,
    registerSource: registry.register,
    registry,
  };
}

export type OptionsService = ReturnType<typeof createOptionsService>;

export const optionsService = createOptionsService();

function createInlineHttpClient(fetchImpl: FetchLike) {
  return createHttpClient({
    fetchImpl,
  });
}

function createDefaultOptionSourceRegistry(client: typeof httpClient) {
  const registry = createOptionSourceRegistry();
  registerStaticOptionSource(registry);
  registerHttpOptionSource(registry, client);
  return registry;
}
