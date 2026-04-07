import type { Context } from 'hono';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../logger';
import type { AppBindings } from '../types';
import type { ForwardMethod, ForwardRule } from './types';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const ForwardMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const ForwardRuleSchema = z.object({
  prefix: z
    .string()
    .trim()
    .min(1)
    .refine((value) => value.startsWith('/'), 'prefix must start with /'),
  target: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    }, 'target must be a valid http(s) URL'),
  stripPrefix: z.boolean().optional(),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
  allowedMethods: z.array(ForwardMethodSchema).min(1).optional(),
}) satisfies z.ZodType<ForwardRule>;

const ForwardRulesSchema = z.array(ForwardRuleSchema);

export type ForwardProxyOptions = {
  enabled: boolean;
  defaultTimeoutMs: number;
  blockPrivateIp: boolean;
  fallbackTarget?: string;
  rulesJson: string;
};

type NormalizedForwardRule = {
  prefix: string;
  target: URL;
  stripPrefix: boolean;
  timeoutMs: number;
  allowedMethods: Set<ForwardMethod> | null;
};

type ForwardHookRule = {
  prefix: string;
  target: string;
  stripPrefix: boolean;
  timeoutMs: number;
  allowedMethods: ForwardMethod[] | null;
};

export type ForwardBeforeMatchHook = (input: {
  context: Context<AppBindings>;
  requestUrl: URL;
  requestMethod: string;
}) =>
  | void
  | {
      requestUrl?: URL;
      requestMethod?: string;
    }
  | Promise<
      | void
      | {
          requestUrl?: URL;
          requestMethod?: string;
        }
    >;

export type ForwardBeforeRequestHook = (input: {
  context: Context<AppBindings>;
  requestId: string;
  requestUrl: URL;
  requestMethod: string;
  rule: ForwardHookRule;
  upstreamUrl: URL;
  headers: Headers;
}) =>
  | void
  | {
      upstreamUrl?: URL;
      headers?: Headers;
      response?: Response;
    }
  | Promise<
      | void
      | {
          upstreamUrl?: URL;
          headers?: Headers;
          response?: Response;
        }
    >;

export type ForwardAfterResponseHook = (input: {
  context: Context<AppBindings>;
  requestId: string;
  requestUrl: URL;
  requestMethod: string;
  rule: ForwardHookRule;
  upstreamUrl: URL;
  response: Response;
}) => void | Response | Promise<void | Response>;

export type ForwardOnErrorHook = (input: {
  context: Context<AppBindings>;
  requestId: string;
  requestUrl: URL;
  requestMethod: string;
  rule: ForwardHookRule;
  upstreamUrl: URL;
  error: unknown;
}) => void | Response | Promise<void | Response>;

export type ForwardHookSet = {
  beforeMatch?: ForwardBeforeMatchHook;
  beforeRequest?: ForwardBeforeRequestHook;
  afterResponse?: ForwardAfterResponseHook;
  onError?: ForwardOnErrorHook;
};

function parseForwardRules(raw: string): ForwardRule[] {
  try {
    const parsed = JSON.parse(raw);
    return ForwardRulesSchema.parse(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid FORWARD_RULES: ${message}`);
  }
}

function normalizePrefix(prefix: string): string {
  if (prefix === '/') {
    return '/';
  }
  return prefix.replace(/\/+$/g, '');
}

function isPathMatched(pathname: string, prefix: string): boolean {
  if (prefix === '/') {
    return true;
  }
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPrivateIpv4Host(hostname: string): boolean {
  const segments = hostname.split('.');
  if (segments.length !== 4) {
    return false;
  }

  const octets = segments.map((segment) => Number(segment));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const first = octets[0];
  const second = octets[1];

  if (first === undefined || second === undefined) {
    return false;
  }

  if (first === 10 || first === 127 || first === 0) {
    return true;
  }

  if (first === 169 && second === 254) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  return false;
}

function isPrivateIpv6Host(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (normalized === '::1') {
    return true;
  }

  if (normalized.startsWith('fe80:')) {
    return true;
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  if (normalized.includes('.') && normalized.includes(':')) {
    const ipv4Part = normalized.split(':').pop();
    if (ipv4Part && isPrivateIpv4Host(ipv4Part)) {
      return true;
    }
  }

  return false;
}

function assertTargetSafety(target: URL, blockPrivateIp: boolean): void {
  if (!blockPrivateIp) {
    return;
  }

  const hostname = target.hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error(`Forbidden forward target host: ${target.host}`);
  }

  if (isPrivateIpv4Host(hostname) || isPrivateIpv6Host(hostname)) {
    throw new Error(`Forbidden forward target host: ${target.host}`);
  }
}

function buildNormalizedRule(
  rule: ForwardRule,
  defaultTimeoutMs: number,
  blockPrivateIp: boolean
): NormalizedForwardRule {
  const target = new URL(rule.target);
  assertTargetSafety(target, blockPrivateIp);

  return {
    prefix: normalizePrefix(rule.prefix),
    target,
    stripPrefix: rule.stripPrefix ?? false,
    timeoutMs: rule.timeoutMs ?? defaultTimeoutMs,
    allowedMethods: rule.allowedMethods ? new Set(rule.allowedMethods) : null,
  };
}

function toForwardHookRule(rule: NormalizedForwardRule): ForwardHookRule {
  return {
    prefix: rule.prefix,
    target: rule.target.toString(),
    stripPrefix: rule.stripPrefix,
    timeoutMs: rule.timeoutMs,
    allowedMethods: rule.allowedMethods ? Array.from(rule.allowedMethods) : null,
  };
}

function normalizeForwardRules(
  rulesJson: string,
  defaultTimeoutMs: number,
  blockPrivateIp: boolean
): NormalizedForwardRule[] {
  return parseForwardRules(rulesJson)
    .map((rule) => buildNormalizedRule(rule, defaultTimeoutMs, blockPrivateIp))
    .sort((a, b) => b.prefix.length - a.prefix.length);
}

function stripHopByHopHeaders(headers: Headers): void {
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
}

function buildUpstreamUrl(rule: NormalizedForwardRule, requestUrl: URL): URL {
  let forwardPath = requestUrl.pathname;

  if (rule.stripPrefix && rule.prefix !== '/') {
    forwardPath = requestUrl.pathname.slice(rule.prefix.length);
    if (!forwardPath.startsWith('/')) {
      forwardPath = `/${forwardPath}`;
    }
    if (forwardPath === '') {
      forwardPath = '/';
    }
  }

  const basePath = rule.target.pathname === '/' ? '' : rule.target.pathname.replace(/\/+$/g, '');
  const normalizedForwardPath = forwardPath.startsWith('/') ? forwardPath : `/${forwardPath}`;
  const mergedPath = `${basePath}${normalizedForwardPath}`.replace(/\/{2,}/g, '/');

  const upstreamUrl = new URL(rule.target.toString());
  upstreamUrl.pathname = mergedPath || '/';
  upstreamUrl.search = requestUrl.search;
  return upstreamUrl;
}

function buildForwardHeaders(c: Context<AppBindings>): Headers {
  const headers = new Headers(c.req.raw.headers);
  stripHopByHopHeaders(headers);

  headers.delete('host');
  headers.delete('content-length');

  const requestId = c.get('requestId');
  headers.set('x-correlation-id', requestId);

  const requestUrl = new URL(c.req.url);
  headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''));

  const host = c.req.header('host');
  if (host) {
    headers.set('x-forwarded-host', host);
  }

  const forwardedFor = c.req.header('x-forwarded-for');
  const realIp = c.req.header('x-real-ip');
  if (forwardedFor && realIp) {
    headers.set('x-forwarded-for', `${forwardedFor}, ${realIp}`);
  } else if (!forwardedFor && realIp) {
    headers.set('x-forwarded-for', realIp);
  }

  return headers;
}

function shouldSendRequestBody(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD';
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const name = 'name' in error ? String(error.name) : '';
  return name === 'AbortError' || name === 'TimeoutError';
}

export function createForwardProxy(options: ForwardProxyOptions) {
  const beforeMatchHooks: ForwardBeforeMatchHook[] = [];
  const beforeRequestHooks: ForwardBeforeRequestHook[] = [];
  const afterResponseHooks: ForwardAfterResponseHook[] = [];
  const onErrorHooks: ForwardOnErrorHook[] = [];
  const forwardRules = normalizeForwardRules(
    options.rulesJson,
    options.defaultTimeoutMs,
    options.blockPrivateIp
  );

  const fallbackRule = options.fallbackTarget
    ? buildNormalizedRule(
        {
          prefix: '/',
          target: options.fallbackTarget,
          stripPrefix: false,
          timeoutMs: options.defaultTimeoutMs,
        },
        options.defaultTimeoutMs,
        options.blockPrivateIp
      )
    : null;

  function resolveForwardRule(pathname: string, method: string): NormalizedForwardRule | null {
    for (const rule of forwardRules) {
      if (!isPathMatched(pathname, rule.prefix)) {
        continue;
      }

      if (rule.allowedMethods && !rule.allowedMethods.has(method as ForwardMethod)) {
        continue;
      }

      return rule;
    }

    return fallbackRule;
  }

  async function runBeforeMatchHooks(input: {
    context: Context<AppBindings>;
    requestUrl: URL;
    requestMethod: string;
  }) {
    let currentRequestUrl = new URL(input.requestUrl.toString());
    let currentRequestMethod = input.requestMethod;

    for (const hook of beforeMatchHooks) {
      const result = await hook({
        context: input.context,
        requestUrl: new URL(currentRequestUrl.toString()),
        requestMethod: currentRequestMethod,
      });

      if (result?.requestUrl) {
        currentRequestUrl = new URL(result.requestUrl.toString());
      }

      if (result?.requestMethod) {
        currentRequestMethod = result.requestMethod.toUpperCase();
      }
    }

    return {
      requestUrl: currentRequestUrl,
      requestMethod: currentRequestMethod,
    };
  }

  async function tryForwardRequest(c: Context<AppBindings>): Promise<Response | null> {
    if (!options.enabled) {
      return null;
    }

    const matchState = await runBeforeMatchHooks({
      context: c,
      requestUrl: new URL(c.req.url),
      requestMethod: c.req.method.toUpperCase(),
    });
    const requestUrl = matchState.requestUrl;
    const requestMethod = matchState.requestMethod;
    const rule = resolveForwardRule(requestUrl.pathname, requestMethod);

    if (!rule) {
      return null;
    }

    const requestId = c.get('requestId');
    let upstreamUrl = buildUpstreamUrl(rule, requestUrl);
    let headers = buildForwardHeaders(c);
    const startAt = Date.now();
    const timeout = createTimeoutSignal(rule.timeoutMs);
    const hookRule = toForwardHookRule(rule);

    try {
      for (const hook of beforeRequestHooks) {
        const result = await hook({
          context: c,
          requestId,
          requestUrl,
          requestMethod,
          rule: hookRule,
          upstreamUrl: new URL(upstreamUrl.toString()),
          headers: new Headers(headers),
        });

        if (result?.response) {
          return result.response;
        }

        if (result?.upstreamUrl) {
          upstreamUrl = new URL(result.upstreamUrl.toString());
        }

        if (result?.headers) {
          headers = new Headers(result.headers);
        }
      }

      const upstreamResponse = await fetch(upstreamUrl, {
        method: c.req.method,
        headers,
        body: shouldSendRequestBody(requestMethod) ? (c.req.raw.body ?? undefined) : undefined,
        redirect: 'manual',
        signal: timeout.signal,
      });

      const responseHeaders = new Headers(upstreamResponse.headers);
      stripHopByHopHeaders(responseHeaders);
      responseHeaders.set('x-correlation-id', requestId);
      responseHeaders.set('x-humming-proxy', '1');

      logger.info(
        {
          requestId,
          path: requestUrl.pathname,
          method: requestMethod,
          upstream: upstreamUrl.toString(),
          status: upstreamResponse.status,
          duration: Date.now() - startAt,
        },
        'request forwarded'
      );

      let response = new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });

      for (const hook of afterResponseHooks) {
        const maybeResponse = await hook({
          context: c,
          requestId,
          requestUrl,
          requestMethod,
          rule: hookRule,
          upstreamUrl: new URL(upstreamUrl.toString()),
          response,
        });

        if (maybeResponse instanceof Response) {
          response = maybeResponse;
        }
      }

      return response;
    } catch (error) {
      const timeoutTriggered = isTimeoutError(error);

      logger.error(
        {
          requestId,
          path: requestUrl.pathname,
          method: requestMethod,
          upstream: upstreamUrl.toString(),
          duration: Date.now() - startAt,
          err: error,
        },
        'forward request failed'
      );

      for (const hook of onErrorHooks) {
        const maybeResponse = await hook({
          context: c,
          requestId,
          requestUrl,
          requestMethod,
          rule: hookRule,
          upstreamUrl: new URL(upstreamUrl.toString()),
          error,
        });

        if (maybeResponse instanceof Response) {
          return maybeResponse;
        }
      }

      if (timeoutTriggered) {
        return c.json(
          {
            result: false,
            errorCode: 'UPSTREAM_TIMEOUT',
            errorMsg: 'Upstream request timed out',
            requestId,
          },
          504
        );
      }

      return c.json(
        {
          result: false,
          errorCode: 'UPSTREAM_ERROR',
          errorMsg: 'Upstream request failed',
          requestId,
        },
        502
      );
    } finally {
      timeout.clear();
    }
  }

  return {
    tryForwardRequest,
    registerBeforeMatch(hook: ForwardBeforeMatchHook) {
      beforeMatchHooks.push(hook);
    },
    registerBeforeRequest(hook: ForwardBeforeRequestHook) {
      beforeRequestHooks.push(hook);
    },
    registerAfterResponse(hook: ForwardAfterResponseHook) {
      afterResponseHooks.push(hook);
    },
    registerOnError(hook: ForwardOnErrorHook) {
      onErrorHooks.push(hook);
    },
    registerHooks(hooks: ForwardHookSet) {
      if (hooks.beforeMatch) {
        beforeMatchHooks.push(hooks.beforeMatch);
      }
      if (hooks.beforeRequest) {
        beforeRequestHooks.push(hooks.beforeRequest);
      }
      if (hooks.afterResponse) {
        afterResponseHooks.push(hooks.afterResponse);
      }
      if (hooks.onError) {
        onErrorHooks.push(hooks.onError);
      }
    },
  };
}

export type ForwardProxy = ReturnType<typeof createForwardProxy>;

const defaultForwardProxy = createForwardProxy({
  enabled: env.FORWARD_ENABLED,
  defaultTimeoutMs: env.FORWARD_TIMEOUT_MS,
  blockPrivateIp: env.FORWARD_BLOCK_PRIVATE_IP,
  fallbackTarget: env.FORWARD_FALLBACK_TARGET,
  rulesJson: env.FORWARD_RULES,
});

export const tryForwardRequest = defaultForwardProxy.tryForwardRequest;
