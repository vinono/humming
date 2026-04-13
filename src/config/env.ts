import { z } from 'zod';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

const HttpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  }, 'must be a valid http(s) URL');

const booleanFromEnv = (defaultValue: boolean) =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return defaultValue;
      }

      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'number') {
        return value !== 0;
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (TRUE_VALUES.has(normalized)) {
          return true;
        }
        if (FALSE_VALUES.has(normalized)) {
          return false;
        }
      }

      return value;
    }, z.boolean())
    .default(defaultValue);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  OPTIONS_CONFIG: z.string().default('{}'),
  FORWARD_ENABLED: booleanFromEnv(true),
  FORWARD_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(15_000),
  FORWARD_BLOCK_PRIVATE_IP: booleanFromEnv(true),
  FORWARD_FALLBACK_TARGET: HttpUrlSchema.optional(),
  FORWARD_RULES: z.string().default('[]'),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function parseEnv(source: Record<string, unknown> = Bun.env): AppEnv {
  return EnvSchema.parse(source);
}
