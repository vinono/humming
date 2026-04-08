import type { RedisOptions } from 'bun';
import { RedisClient } from 'bun';
import type { Context, MiddlewareHandler } from 'hono';
import { definePlugin } from '../core';
import type { AppBindings, AuthUser } from '../types';

type PathPattern = string | RegExp;

export type RateLimitStoreState = {
  totalHits: number;
  resetAt: number;
};

export type RateLimitStoreConsumeInput = {
  key: string;
  windowMs: number;
  now: number;
};

export type RateLimitStore = {
  consume(input: RateLimitStoreConsumeInput): Promise<RateLimitStoreState>;
  reset?(key: string): Promise<void>;
};

export type RateLimitRedisClient = {
  incr(key: string): Promise<number>;
  pexpire(key: string, ttlMs: number): Promise<number>;
  pttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<number>;
};

export type RateLimitRedisStoreOptions = {
  client?: RateLimitRedisClient;
  url?: string;
  prefix?: string;
  redisOptions?: RedisOptions;
};

export type RateLimitPluginKeyInput = {
  context: Context<AppBindings>;
  requestId: string;
  method: string;
  path: string;
  authUser: AuthUser | null;
};

export type RateLimitPluginSkipInput = {
  context: Context<AppBindings>;
  requestId: string;
  method: string;
  path: string;
  authUser: AuthUser | null;
};

export type RateLimitPluginRejectInput = {
  context: Context<AppBindings>;
  requestId: string;
  method: string;
  path: string;
  key: string;
  authUser: AuthUser | null;
  limit: number;
  remaining: number;
  totalHits: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export type RateLimitPluginOptions = {
  limit?: number;
  windowMs?: number;
  methods?: string[];
  includePaths?: PathPattern[];
  excludePaths?: PathPattern[];
  key?: (input: RateLimitPluginKeyInput) => string | Promise<string>;
  skip?: (input: RateLimitPluginSkipInput) => boolean | Promise<boolean>;
  store?: RateLimitStore;
  message?: string;
  onRejected?: (input: RateLimitPluginRejectInput) => Response | Promise<Response>;
};

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

function createRateLimitHeaders(input: {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}) {
  const headers = new Headers();
  const resetSeconds = Math.max(Math.ceil((input.resetAt - Date.now()) / 1000), 0);

  headers.set('ratelimit-limit', String(input.limit));
  headers.set('ratelimit-remaining', String(input.remaining));
  headers.set('ratelimit-reset', String(resetSeconds));
  headers.set('x-ratelimit-limit', String(input.limit));
  headers.set('x-ratelimit-remaining', String(input.remaining));
  headers.set('x-ratelimit-reset', String(resetSeconds));

  if (input.retryAfterSeconds > 0) {
    headers.set('retry-after', String(input.retryAfterSeconds));
  }

  return headers;
}

function applyHeaders(response: Response, headers: Headers): Response {
  const nextHeaders = new Headers(response.headers);

  headers.forEach((value, key) => {
    nextHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders,
  });
}

function defaultRateLimitKey(c: Context<AppBindings>): string {
  const authUser = c.get('authUser');
  const userId = authUser?.id ?? authUser?.subject;
  if (userId) {
    return `user:${userId}`;
  }

  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return `ip:${firstIp}`;
    }
  }

  const realIp = c.req.header('cf-connecting-ip') ?? c.req.header('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }

  const authorization = c.req.header('authorization');
  if (authorization) {
    return `auth:${authorization}`;
  }

  return 'global';
}

function canHandleRequest(path: string, method: string, methods: string[]) {
  return methods.includes(method.toUpperCase()) && path.length > 0;
}

export function createMemoryRateLimitStore(): RateLimitStore {
  const entries = new Map<string, RateLimitStoreState>();

  return {
    async consume({ key, windowMs, now }) {
      const current = entries.get(key);

      if (!current || current.resetAt <= now) {
        const next = {
          totalHits: 1,
          resetAt: now + windowMs,
        };
        entries.set(key, next);
        return next;
      }

      const next = {
        totalHits: current.totalHits + 1,
        resetAt: current.resetAt,
      };
      entries.set(key, next);
      return next;
    },
    async reset(key) {
      entries.delete(key);
    },
  };
}

export function createRedisRateLimitStore(options: RateLimitRedisStoreOptions = {}): RateLimitStore {
  const prefix = options.prefix ?? 'humming:rate-limit';
  const client =
    options.client ??
    new RedisClient(options.url, options.redisOptions);
  const withPrefix = (key: string) => `${prefix}:${key}`;

  return {
    async consume({ key, windowMs, now }) {
      const storageKey = withPrefix(key);
      const totalHits = await client.incr(storageKey);

      if (totalHits === 1) {
        await client.pexpire(storageKey, windowMs);
      }

      let ttlMs = await client.pttl(storageKey);
      if (ttlMs < 0) {
        await client.pexpire(storageKey, windowMs);
        ttlMs = windowMs;
      }

      return {
        totalHits,
        resetAt: now + ttlMs,
      };
    },
    async reset(key) {
      await client.del(withPrefix(key));
    },
  };
}

function createRejectedResponse(input: RateLimitPluginRejectInput, message: string): Response {
  return input.context.json(
    {
      result: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      errorMsg: message,
      requestId: input.requestId,
      data: {
        limit: input.limit,
        remaining: input.remaining,
        totalHits: input.totalHits,
        resetAt: input.resetAt,
        retryAfter: input.retryAfterSeconds,
      },
    },
    429
  );
}

function createRateLimitMiddleware(options: RateLimitPluginOptions = {}): MiddlewareHandler<AppBindings> {
  const limit = options.limit ?? 60;
  const windowMs = options.windowMs ?? 60_000;
  const methods = (options.methods ?? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).map((method) => method.toUpperCase());
  const store = options.store ?? createMemoryRateLimitStore();
  const message = options.message ?? 'Too many requests';

  return async (c, next) => {
    const method = c.req.method.toUpperCase();
    const path = c.req.path;
    const requestId = c.get('requestId');
    const authUser = c.get('authUser');

    if (!canHandleRequest(path, method, methods)) {
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

    const shouldSkip = options.skip
      ? await options.skip({
          context: c,
          requestId,
          method,
          path,
          authUser,
        })
      : false;

    if (shouldSkip) {
      await next();
      return;
    }

    const key = options.key
      ? await options.key({
          context: c,
          requestId,
          method,
          path,
          authUser,
        })
      : defaultRateLimitKey(c);

    const now = Date.now();
    const state = await store.consume({
      key,
      windowMs,
      now,
    });
    const remaining = Math.max(limit - state.totalHits, 0);
    const retryAfterSeconds = Math.max(Math.ceil((state.resetAt - now) / 1000), 0);
    const headers = createRateLimitHeaders({
      limit,
      remaining,
      resetAt: state.resetAt,
      retryAfterSeconds,
    });

    if (state.totalHits > limit) {
      const rejectionInput: RateLimitPluginRejectInput = {
        context: c,
        requestId,
        method,
        path,
        key,
        authUser,
        limit,
        remaining,
        totalHits: state.totalHits,
        resetAt: state.resetAt,
        retryAfterSeconds,
      };

      const response = options.onRejected
        ? await options.onRejected(rejectionInput)
        : createRejectedResponse(rejectionInput, message);

      return applyHeaders(response, headers);
    }

    await next();
    c.res = applyHeaders(c.res, headers);
  };
}

export function createRateLimitPlugin(options: RateLimitPluginOptions = {}) {
  return definePlugin({
    name: 'rate-limit',
    setup({ use }) {
      use('*', createRateLimitMiddleware(options));
    },
  });
}
