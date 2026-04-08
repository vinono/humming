import type { RedisOptions } from 'bun';
import { RedisClient } from 'bun';
import type { Context, MiddlewareHandler } from 'hono';
import { definePlugin } from '../core';
import type { AppBindings } from '../types';

type PathPattern = string | RegExp;

export type CachedResponse = {
  status: number;
  headers: Array<[string, string]>;
  body: Uint8Array;
  expiresAt: number;
};

export type CacheStore = {
  get(key: string): Promise<CachedResponse | null>;
  set(key: string, value: CachedResponse, ttlMs: number): Promise<void>;
  delete?(key: string): Promise<void>;
};

export type CacheRedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'PX', ttlMs: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
};

export type CacheRedisStoreOptions = {
  client?: CacheRedisClient;
  url?: string;
  prefix?: string;
  redisOptions?: RedisOptions;
};

export type CachePluginKeyInput = {
  context: Context<AppBindings>;
  method: string;
  path: string;
  url: string;
};

export type CachePluginShouldCacheInput = {
  context: Context<AppBindings>;
  response: Response;
};

export type CachePluginOptions = {
  ttlMs?: number;
  methods?: string[];
  includePaths?: PathPattern[];
  excludePaths?: PathPattern[];
  statuses?: number[];
  key?: (input: CachePluginKeyInput) => string;
  shouldCache?: (input: CachePluginShouldCacheInput) => boolean | Promise<boolean>;
  store?: CacheStore;
};

type RedisCachedResponse = Omit<CachedResponse, 'body'> & {
  bodyBase64: string;
};

function cloneCachedResponse(value: CachedResponse): CachedResponse {
  return {
    status: value.status,
    headers: value.headers.map(([key, headerValue]) => [key, headerValue]),
    body: value.body.slice(),
    expiresAt: value.expiresAt,
  };
}

function toBase64(value: Uint8Array): string {
  let binary = '';

  for (let index = 0; index < value.length; index += 0x8000) {
    binary += String.fromCharCode(...value.subarray(index, index + 0x8000));
  }

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function serializeCachedResponse(value: CachedResponse): string {
  const payload: RedisCachedResponse = {
    status: value.status,
    headers: value.headers,
    expiresAt: value.expiresAt,
    bodyBase64: toBase64(value.body),
  };

  return JSON.stringify(payload);
}

function deserializeCachedResponse(value: string): CachedResponse | null {
  try {
    const parsed = JSON.parse(value) as Partial<RedisCachedResponse>;

    if (
      typeof parsed.status !== 'number' ||
      !Array.isArray(parsed.headers) ||
      typeof parsed.bodyBase64 !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }

    return {
      status: parsed.status,
      headers: parsed.headers.flatMap((entry) => {
        if (!Array.isArray(entry) || entry.length !== 2) {
          return [];
        }

        const [key, headerValue] = entry;
        if (typeof key !== 'string' || typeof headerValue !== 'string') {
          return [];
        }

        return [[key, headerValue] satisfies [string, string]];
      }),
      body: fromBase64(parsed.bodyBase64),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export function createMemoryCacheStore(): CacheStore {
  const entries = new Map<string, CachedResponse>();

  return {
    async get(key) {
      const cached = entries.get(key);
      if (!cached) {
        return null;
      }

      if (cached.expiresAt <= Date.now()) {
        entries.delete(key);
        return null;
      }

      return cloneCachedResponse(cached);
    },
    async set(key, value) {
      entries.set(key, cloneCachedResponse(value));
    },
    async delete(key) {
      entries.delete(key);
    },
  };
}

export function createRedisCacheStore(options: CacheRedisStoreOptions = {}): CacheStore {
  const prefix = options.prefix ?? 'humming:cache';
  const client = options.client ?? new RedisClient(options.url, options.redisOptions);
  const withPrefix = (key: string) => `${prefix}:${key}`;

  return {
    async get(key) {
      const serialized = await client.get(withPrefix(key));
      if (!serialized) {
        return null;
      }

      const cached = deserializeCachedResponse(serialized);
      if (!cached) {
        await client.del(withPrefix(key));
        return null;
      }

      if (cached.expiresAt <= Date.now()) {
        await client.del(withPrefix(key));
        return null;
      }

      return cloneCachedResponse(cached);
    },
    async set(key, value, ttlMs) {
      await client.set(withPrefix(key), serializeCachedResponse(value), 'PX', ttlMs);
    },
    async delete(key) {
      await client.del(withPrefix(key));
    },
  };
}

function isPathMatched(path: string, pattern: PathPattern): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path);
  }

  if (pattern.endsWith('*')) {
    return path.startsWith(pattern.slice(0, -1));
  }

  return path === pattern;
}

function matchesAny(path: string, patterns?: PathPattern[]): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => isPathMatched(path, pattern));
}

function canHandleRequest(path: string, method: string, options: Required<Pick<CachePluginOptions, 'methods'>>) {
  return options.methods.includes(method.toUpperCase()) && path.length > 0;
}

function isResponseCacheable(response: Response, statuses: Set<number>) {
  if (!statuses.has(response.status)) {
    return false;
  }

  const cacheControl = response.headers.get('cache-control')?.toLowerCase() ?? '';
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }

  if (response.headers.has('set-cookie')) {
    return false;
  }

  return true;
}

function createCacheMiddleware(options: CachePluginOptions = {}): MiddlewareHandler<AppBindings> {
  const ttlMs = options.ttlMs ?? 5_000;
  const methods = (options.methods ?? ['GET']).map((method) => method.toUpperCase());
  const statuses = new Set(options.statuses ?? [200]);
  const store = options.store ?? createMemoryCacheStore();

  return async (c, next) => {
    const method = c.req.method.toUpperCase();
    const path = c.req.path;

    if (!canHandleRequest(path, method, { methods })) {
      await next();
      return;
    }

    if (options.includePaths && options.includePaths.length > 0 && !matchesAny(path, options.includePaths)) {
      await next();
      return;
    }

    if (matchesAny(path, options.excludePaths)) {
      await next();
      return;
    }

    const key =
      options.key?.({
        context: c,
        method,
        path,
        url: c.req.url,
      }) ?? `${method}:${c.req.url}`;

    const cached = await store.get(key);

    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('x-humming-cache', 'HIT');

      return new Response(cached.body.slice(), {
        status: cached.status,
        headers,
      });
    }

    await next();

    const response = c.res;
    const shouldCache = options.shouldCache ? await options.shouldCache({ context: c, response }) : true;

    if (!shouldCache || !isResponseCacheable(response, statuses)) {
      return;
    }

    const cloned = response.clone();
    const body = new Uint8Array(await cloned.arrayBuffer());
    const headers = new Headers(response.headers);
    headers.set('x-humming-cache', 'MISS');

    await store.set(key, {
      status: response.status,
      headers: Array.from(headers.entries()),
      body,
      expiresAt: Date.now() + ttlMs,
    }, ttlMs);

    c.res = new Response(response.body, {
      status: response.status,
      headers,
    });
  };
}

export function createCachePlugin(options: CachePluginOptions = {}) {
  return definePlugin({
    name: 'cache',
    setup({ use }) {
      use('*', createCacheMiddleware(options));
    },
  });
}
