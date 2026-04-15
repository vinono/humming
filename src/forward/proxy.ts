import type { Context } from 'hono';
import { z } from 'zod';
import { logger } from '../logger';
import { isLocalDebugRuntimeApplied } from '../runtime/local-debug';
import type { AppBindings } from '../types';
import type { ForwardMethod, ForwardRule, ForwardTransportErrorCategory } from './types';

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
const ForwardHeaderMapSchema = z.record(z.string().trim().min(1), z.string());
const ForwardHeaderListSchema = z.array(z.string().trim().min(1)).min(1);
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
  transport: z.string().trim().min(1).optional(),
  stripPrefix: z.boolean().optional(),
  pathRewrite: z
    .string()
    .trim()
    .min(1)
    .refine((value) => value.startsWith('/'), 'pathRewrite must start with /')
    .optional(),
  preserveHost: z.boolean().optional(),
  followRedirect: z.boolean().optional(),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
  allowedMethods: z.array(ForwardMethodSchema).min(1).optional(),
  stripRequestHeaders: ForwardHeaderListSchema.optional(),
  requestHeaders: ForwardHeaderMapSchema.optional(),
  responseHeaders: ForwardHeaderMapSchema.optional(),
  acceptStatuses: z.array(z.number().int().min(100).max(599)).min(1).optional(),
})
  .refine((value) => !(value.stripPrefix && value.pathRewrite), {
    message: 'pathRewrite cannot be combined with stripPrefix',
    path: ['pathRewrite'],
  }) satisfies z.ZodType<ForwardRule>;

const ForwardRulesSchema = z.array(ForwardRuleSchema);

export type ForwardProxyOptions = {
  enabled: boolean;
  defaultTimeoutMs: number;
  blockPrivateIp: boolean;
  fallbackTarget?: string;
  rulesJson: string;
  defaultTransport?: string;
  transports?: Record<string, ForwardTransport>;
};

type NormalizedForwardRule = {
  prefix: string;
  target: URL;
  transport: string;
  stripPrefix: boolean;
  pathRewrite: string | null;
  preserveHost: boolean;
  followRedirect: boolean;
  timeoutMs: number;
  allowedMethods: Set<ForwardMethod> | null;
  stripRequestHeaders: Set<string> | null;
  requestHeaders: Record<string, string> | null;
  responseHeaders: Record<string, string> | null;
  acceptStatuses: Set<number> | null;
};

type ForwardHookRule = {
  prefix: string;
  target: string;
  transport: string;
  stripPrefix: boolean;
  pathRewrite: string | null;
  preserveHost: boolean;
  followRedirect: boolean;
  timeoutMs: number;
  allowedMethods: ForwardMethod[] | null;
  stripRequestHeaders: string[] | null;
  requestHeaders: Record<string, string> | null;
  responseHeaders: Record<string, string> | null;
  acceptStatuses: number[] | null;
};

export type ForwardExecutionStage = 'beforeMatch' | 'beforeRequest' | 'upstream' | 'afterResponse';

type ForwardPhaseTimings = {
  beforeMatch: number;
  beforeRequest: number;
  upstream: number;
  afterResponse: number;
  onError: number;
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
  stage: ForwardExecutionStage;
  error: unknown;
}) => void | Response | Promise<void | Response>;

export type ForwardHookSet = {
  beforeMatch?: ForwardBeforeMatchHook;
  beforeRequest?: ForwardBeforeRequestHook;
  afterResponse?: ForwardAfterResponseHook;
  onError?: ForwardOnErrorHook;
};

export type ForwardTransportRequest = {
  context: Context<AppBindings>;
  requestId: string;
  requestUrl: URL;
  requestMethod: string;
  rule: ForwardHookRule;
  upstreamUrl: URL;
  headers: Headers;
  body?: RequestInit['body'];
  redirect: NonNullable<RequestInit['redirect']>;
  timeoutMs: number;
  signal: AbortSignal;
};

export type ForwardTransportResult = {
  response: Response;
  attempts: number;
};

export type ForwardTransport = {
  execute(input: ForwardTransportRequest): Promise<ForwardTransportResult>;
};

export type ForwardFetchTransportRetryBackoff = 'fixed' | 'linear' | 'exponential';

export type ForwardFetchTransportRetryContext = {
  request: ForwardTransportRequest;
  attempt: number;
  maxAttempts: number;
  bodyIsReplayable: boolean;
  response?: Response;
  error?: unknown;
  errorCategory?: ForwardTransportErrorCategory | null;
  errorCode?: string | null;
  defaultShouldRetry: boolean;
  defaultDelayMs: number;
};

export type ForwardFetchTransportRetryOptions = {
  maxAttempts?: number;
  delayMs?: number;
  maxDelayMs?: number;
  backoff?: ForwardFetchTransportRetryBackoff;
  methods?: ForwardMethod[];
  statuses?: number[];
  categories?: ForwardTransportErrorCategory[];
  statusDelayMs?: Partial<Record<number, number>>;
  categoryDelayMs?: Partial<Record<ForwardTransportErrorCategory, number>>;
  shouldRetry?: (context: ForwardFetchTransportRetryContext) => boolean;
  getDelayMs?: (context: ForwardFetchTransportRetryContext) => number;
};

export type CreateFetchForwardTransportOptions = {
  fetchImpl?: typeof fetch;
  keepalive?: boolean;
  retry?: ForwardFetchTransportRetryOptions;
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_FORWARD_PROXY_OPTIONS: ForwardProxyOptions = {
  enabled: true,
  defaultTimeoutMs: 15_000,
  blockPrivateIp: true,
  rulesJson: '[]',
  defaultTransport: 'fetch',
};

type ForwardRejectedStatusError = Error & {
  code: 'UPSTREAM_STATUS_NOT_ACCEPTED';
  status: number;
};

type ForwardTransportFailure = {
  responseStatus: 502 | 504;
  errorCode:
    | 'UPSTREAM_TIMEOUT'
    | 'UPSTREAM_DNS_ERROR'
    | 'UPSTREAM_TLS_ERROR'
    | 'UPSTREAM_CONNECT_ERROR'
    | 'UPSTREAM_NETWORK_ERROR';
  errorMsg: string;
  transportErrorCategory: ForwardTransportErrorCategory;
  transportErrorCode: string | null;
};

function nowMs() {
  return performance.now();
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function elapsedMs(startAt: number) {
  return Number((nowMs() - startAt).toFixed(3));
}

function createForwardPhaseTimings(): ForwardPhaseTimings {
  return {
    beforeMatch: 0,
    beforeRequest: 0,
    upstream: 0,
    afterResponse: 0,
    onError: 0,
  };
}

function buildForwardTimingSummary(timings: ForwardPhaseTimings, requestStartAt: number) {
  return {
    ...timings,
    total: elapsedMs(requestStartAt),
  };
}

function createFallbackHookRule(timeoutMs: number, transport: string): ForwardHookRule {
  return {
    prefix: '',
    target: '',
    transport,
    stripPrefix: false,
    pathRewrite: null,
    preserveHost: false,
    followRedirect: false,
    timeoutMs,
    allowedMethods: null,
    stripRequestHeaders: null,
    requestHeaders: null,
    responseHeaders: null,
    acceptStatuses: null,
  };
}

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
  blockPrivateIp: boolean,
  defaultTransport: string
): NormalizedForwardRule {
  const target = new URL(rule.target);
  assertTargetSafety(target, blockPrivateIp);

  return {
    prefix: normalizePrefix(rule.prefix),
    target,
    transport: rule.transport?.trim() || defaultTransport,
    stripPrefix: rule.stripPrefix ?? false,
    pathRewrite: rule.pathRewrite ? normalizePrefix(rule.pathRewrite) : null,
    preserveHost: rule.preserveHost ?? false,
    followRedirect: rule.followRedirect ?? false,
    timeoutMs: rule.timeoutMs ?? defaultTimeoutMs,
    allowedMethods: rule.allowedMethods ? new Set(rule.allowedMethods) : null,
    stripRequestHeaders: rule.stripRequestHeaders
      ? new Set(rule.stripRequestHeaders.map((header) => header.toLowerCase()))
      : null,
    requestHeaders: rule.requestHeaders ?? null,
    responseHeaders: rule.responseHeaders ?? null,
    acceptStatuses: rule.acceptStatuses ? new Set(rule.acceptStatuses) : null,
  };
}

function toForwardHookRule(rule: NormalizedForwardRule): ForwardHookRule {
  return {
    prefix: rule.prefix,
    target: rule.target.toString(),
    transport: rule.transport,
    stripPrefix: rule.stripPrefix,
    pathRewrite: rule.pathRewrite,
    preserveHost: rule.preserveHost,
    followRedirect: rule.followRedirect,
    timeoutMs: rule.timeoutMs,
    allowedMethods: rule.allowedMethods ? Array.from(rule.allowedMethods) : null,
    stripRequestHeaders: rule.stripRequestHeaders ? Array.from(rule.stripRequestHeaders) : null,
    requestHeaders: rule.requestHeaders ? { ...rule.requestHeaders } : null,
    responseHeaders: rule.responseHeaders ? { ...rule.responseHeaders } : null,
    acceptStatuses: rule.acceptStatuses ? Array.from(rule.acceptStatuses) : null,
  };
}

function normalizeForwardRules(
  rulesJson: string,
  defaultTimeoutMs: number,
  blockPrivateIp: boolean,
  defaultTransport: string
): NormalizedForwardRule[] {
  return parseForwardRules(rulesJson)
    .map((rule) => buildNormalizedRule(rule, defaultTimeoutMs, blockPrivateIp, defaultTransport))
    .sort((a, b) => b.prefix.length - a.prefix.length);
}

function stripHopByHopHeaders(headers: Headers): void {
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
}

function extractMatchedSuffix(pathname: string, prefix: string) {
  if (prefix === '/') {
    return pathname;
  }

  const suffix = pathname.slice(prefix.length);
  if (suffix === '') {
    return '';
  }

  return suffix.startsWith('/') ? suffix : `/${suffix}`;
}

function mergePath(basePath: string, suffix: string) {
  if (suffix === '') {
    return basePath || '/';
  }

  if (basePath === '' || basePath === '/') {
    return suffix;
  }

  return `${basePath}${suffix}`.replace(/\/{2,}/g, '/');
}

function buildUpstreamUrl(rule: NormalizedForwardRule, requestUrl: URL): URL {
  let forwardPath = requestUrl.pathname;
  const matchedSuffix = extractMatchedSuffix(requestUrl.pathname, rule.prefix);

  if (rule.pathRewrite) {
    forwardPath = mergePath(rule.pathRewrite, matchedSuffix);
  } else if (rule.stripPrefix && rule.prefix !== '/') {
    forwardPath = matchedSuffix;
  }

  const basePath = rule.target.pathname === '/' ? '' : rule.target.pathname.replace(/\/+$/g, '');
  const normalizedForwardPath =
    forwardPath === '' ? '' : forwardPath.startsWith('/') ? forwardPath : `/${forwardPath}`;
  const mergedPath = `${basePath}${normalizedForwardPath}`.replace(/\/{2,}/g, '/');

  const upstreamUrl = new URL(rule.target.toString());
  upstreamUrl.pathname = mergedPath || '/';
  upstreamUrl.search = requestUrl.search;
  return upstreamUrl;
}

function stripConfiguredRequestHeaders(headers: Headers, headersToStrip: Set<string> | null): void {
  if (!headersToStrip) {
    return;
  }

  for (const header of headersToStrip) {
    headers.delete(header);
  }
}

function buildForwardHeaders(c: Context<AppBindings>, rule: NormalizedForwardRule): Headers {
  const headers = new Headers(c.req.raw.headers);
  stripHopByHopHeaders(headers);
  headers.delete('content-length');
  stripConfiguredRequestHeaders(headers, rule.stripRequestHeaders);

  const requestId = c.get('requestId');
  headers.set('x-correlation-id', requestId);

  const requestUrl = new URL(c.req.url);
  headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''));

  const host = c.req.header('host');
  if (host) {
    headers.set('x-forwarded-host', host);
    if (!rule.preserveHost) {
      headers.delete('host');
    }
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

function applyStaticHeaders(headers: Headers, configuredHeaders: Record<string, string> | null): Headers {
  if (!configuredHeaders) {
    return headers;
  }

  const nextHeaders = new Headers(headers);

  for (const [key, value] of Object.entries(configuredHeaders)) {
    nextHeaders.set(key, value);
  }

  return nextHeaders;
}

function buildRejectedStatusError(status: number): ForwardRejectedStatusError {
  const error = new Error(`Upstream response status ${status} is not accepted`) as ForwardRejectedStatusError;
  error.code = 'UPSTREAM_STATUS_NOT_ACCEPTED';
  error.status = status;
  return error;
}

function isRejectedStatusError(error: unknown): error is ForwardRejectedStatusError {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'UPSTREAM_STATUS_NOT_ACCEPTED' &&
    'status' in error &&
    typeof error.status === 'number'
  );
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
  let current: unknown = error;

  while (current && typeof current === 'object') {
    const name = 'name' in current ? String(current.name) : '';
    if (name === 'AbortError' || name === 'TimeoutError') {
      return true;
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return false;
}

function extractErrorCode(error: unknown): string | null {
  let current: unknown = error;

  while (current && typeof current === 'object') {
    if ('code' in current && typeof current.code === 'string' && current.code.trim() !== '') {
      return current.code;
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return null;
}

function createTransportRegistry(
  transports: Record<string, ForwardTransport> | undefined
): Record<string, ForwardTransport> {
  return {
    fetch: createFetchForwardTransport(),
    'keepalive-fetch': createKeepAliveForwardTransport(),
    'retry-fetch': createFetchForwardTransport({
      retry: {
        maxAttempts: 3,
        delayMs: 100,
      },
    }),
    ...transports,
  };
}

function validateTransportName(name: string, transports: Record<string, ForwardTransport>, source: string) {
  if (!transports[name]) {
    throw new Error(`Unknown forward transport "${name}" configured for ${source}.`);
  }
}

function validateForwardTransports(
  rules: NormalizedForwardRule[],
  fallbackRule: NormalizedForwardRule | null,
  transports: Record<string, ForwardTransport>,
  defaultTransport: string
) {
  validateTransportName(defaultTransport, transports, 'default transport');

  for (const rule of rules) {
    validateTransportName(rule.transport, transports, `rule prefix "${rule.prefix}"`);
  }

  if (fallbackRule) {
    validateTransportName(fallbackRule.transport, transports, 'fallback target');
  }
}

function isReplayableRequestBody(body: RequestInit['body'] | undefined) {
  return !(body instanceof ReadableStream);
}

function decorateTransportError(error: unknown, attempts: number) {
  const nextError =
    error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Forward transport failed');

  (nextError as Error & { transportAttempts?: number }).transportAttempts = attempts;
  return nextError;
}

function extractTransportAttempts(error: unknown): number | null {
  let current: unknown = error;

  while (current && typeof current === 'object') {
    if ('transportAttempts' in current && typeof current.transportAttempts === 'number') {
      return current.transportAttempts;
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return null;
}

async function waitForRetryDelay(
  delayMs: number,
  signal: AbortSignal,
  sleepImpl: ((ms: number) => Promise<void>) | undefined
) {
  if (delayMs <= 0) {
    if (signal.aborted) {
      throw signal.reason ?? new Error('Forward transport aborted');
    }
    return;
  }

  if (signal.aborted) {
    throw signal.reason ?? new Error('Forward transport aborted');
  }

  await (sleepImpl ?? delay)(delayMs);

  if (signal.aborted) {
    throw signal.reason ?? new Error('Forward transport aborted');
  }
}

function resolveConfiguredDelay(
  retryOptions: ForwardFetchTransportRetryOptions | undefined,
  responseStatus: number | null,
  errorCategory: ForwardTransportErrorCategory | null
) {
  if (responseStatus !== null) {
    const statusDelay = retryOptions?.statusDelayMs?.[responseStatus];
    if (typeof statusDelay === 'number') {
      return statusDelay;
    }
  }

  if (errorCategory) {
    const categoryDelay = retryOptions?.categoryDelayMs?.[errorCategory];
    if (typeof categoryDelay === 'number') {
      return categoryDelay;
    }
  }

  return retryOptions?.delayMs ?? 0;
}

function applyRetryBackoff(
  delayMs: number,
  attempt: number,
  backoff: ForwardFetchTransportRetryBackoff,
  maxDelayMs?: number
) {
  if (delayMs <= 0) {
    return 0;
  }

  const multiplier =
    backoff === 'linear' ? attempt : backoff === 'exponential' ? 2 ** (attempt - 1) : 1;
  const nextDelay = Math.max(0, Math.round(delayMs * multiplier));

  if (typeof maxDelayMs === 'number') {
    return Math.min(nextDelay, maxDelayMs);
  }

  return nextDelay;
}

function buildRetryContext(input: {
  request: ForwardTransportRequest;
  attempt: number;
  maxAttempts: number;
  bodyIsReplayable: boolean;
  response?: Response;
  error?: unknown;
  errorCategory?: ForwardTransportErrorCategory | null;
  errorCode?: string | null;
  defaultShouldRetry: boolean;
  defaultDelayMs: number;
}): ForwardFetchTransportRetryContext {
  return {
    request: input.request,
    attempt: input.attempt,
    maxAttempts: input.maxAttempts,
    bodyIsReplayable: input.bodyIsReplayable,
    response: input.response,
    error: input.error,
    errorCategory: input.errorCategory ?? null,
    errorCode: input.errorCode ?? null,
    defaultShouldRetry: input.defaultShouldRetry,
    defaultDelayMs: input.defaultDelayMs,
  };
}

function shouldRetryTransportResponse(params: {
  attempt: number;
  maxAttempts: number;
  request: ForwardTransportRequest;
  response: Response;
  retryMethods: Set<ForwardMethod>;
  retryStatuses: Set<number>;
  bodyIsReplayable: boolean;
  retryOptions?: ForwardFetchTransportRetryOptions;
}) {
  if (params.attempt >= params.maxAttempts) {
    return {
      shouldRetry: false,
      delayMs: 0,
    };
  }

  if (!params.retryMethods.has(params.request.requestMethod as ForwardMethod)) {
    return {
      shouldRetry: false,
      delayMs: 0,
    };
  }

  if (
    shouldSendRequestBody(params.request.requestMethod) &&
    !params.bodyIsReplayable &&
    params.request.body !== undefined
  ) {
    return {
      shouldRetry: false,
      delayMs: 0,
    };
  }

  const defaultDelayMs = applyRetryBackoff(
    resolveConfiguredDelay(params.retryOptions, params.response.status, null),
    params.attempt,
    params.retryOptions?.backoff ?? 'fixed',
    params.retryOptions?.maxDelayMs
  );
  const retryContext = buildRetryContext({
    request: params.request,
    attempt: params.attempt,
    maxAttempts: params.maxAttempts,
    bodyIsReplayable: params.bodyIsReplayable,
    response: params.response,
    defaultShouldRetry: params.retryStatuses.has(params.response.status),
    defaultDelayMs,
  });
  const shouldRetry = params.retryOptions?.shouldRetry
    ? params.retryOptions.shouldRetry(retryContext)
    : retryContext.defaultShouldRetry;
  const delayMs =
    params.retryOptions?.getDelayMs?.(retryContext) ?? retryContext.defaultDelayMs;

  return {
    shouldRetry,
    delayMs: shouldRetry ? Math.max(0, delayMs) : 0,
  };
}

function shouldRetryTransportError(params: {
  attempt: number;
  maxAttempts: number;
  request: ForwardTransportRequest;
  error: unknown;
  retryMethods: Set<ForwardMethod>;
  retryCategories: Set<ForwardTransportErrorCategory>;
  bodyIsReplayable: boolean;
  signal: AbortSignal;
  retryOptions?: ForwardFetchTransportRetryOptions;
}) {
  if (params.attempt >= params.maxAttempts) {
    return {
      shouldRetry: false,
      delayMs: 0,
    };
  }

  if (params.signal.aborted) {
    return {
      shouldRetry: false,
      delayMs: 0,
    };
  }

  if (!params.retryMethods.has(params.request.requestMethod as ForwardMethod)) {
    return {
      shouldRetry: false,
      delayMs: 0,
    };
  }

  if (
    shouldSendRequestBody(params.request.requestMethod) &&
    !params.bodyIsReplayable &&
    params.request.body !== undefined
  ) {
    return {
      shouldRetry: false,
      delayMs: 0,
    };
  }

  const failure = classifyForwardTransportFailure(params.error);
  const defaultShouldRetry = params.retryCategories.has(failure.transportErrorCategory);
  const defaultDelayMs = applyRetryBackoff(
    resolveConfiguredDelay(params.retryOptions, null, failure.transportErrorCategory),
    params.attempt,
    params.retryOptions?.backoff ?? 'fixed',
    params.retryOptions?.maxDelayMs
  );
  const retryContext = buildRetryContext({
    request: params.request,
    attempt: params.attempt,
    maxAttempts: params.maxAttempts,
    bodyIsReplayable: params.bodyIsReplayable,
    error: params.error,
    errorCategory: failure.transportErrorCategory,
    errorCode: failure.transportErrorCode,
    defaultShouldRetry,
    defaultDelayMs,
  });
  const shouldRetry = params.retryOptions?.shouldRetry
    ? params.retryOptions.shouldRetry(retryContext)
    : retryContext.defaultShouldRetry;
  const delayMs =
    params.retryOptions?.getDelayMs?.(retryContext) ?? retryContext.defaultDelayMs;

  return {
    shouldRetry,
    delayMs: shouldRetry ? Math.max(0, delayMs) : 0,
  };
}

export function createKeepAliveForwardTransport(
  options: Omit<CreateFetchForwardTransportOptions, 'keepalive'> = {}
): ForwardTransport {
  return createFetchForwardTransport({
    ...options,
    keepalive: true,
  });
}

export function createFetchForwardTransport(
  options: CreateFetchForwardTransportOptions = {}
): ForwardTransport {
  const maxAttempts = Math.max(1, options.retry?.maxAttempts ?? 1);
  const retryMethods = new Set<ForwardMethod>(options.retry?.methods ?? ['GET', 'HEAD', 'OPTIONS']);
  const retryStatuses = new Set(options.retry?.statuses ?? [408, 425, 429, 500, 502, 503, 504]);
  const retryCategories = new Set<ForwardTransportErrorCategory>(
    options.retry?.categories ?? ['timeout', 'dns', 'connect', 'network']
  );

  return {
    async execute(input) {
      const bodyIsReplayable = isReplayableRequestBody(input.body);
      let attempt = 0;

      while (attempt < maxAttempts) {
        attempt += 1;

        try {
          const fetchImpl = options.fetchImpl ?? globalThis.fetch;
          const response = await fetchImpl(input.upstreamUrl, {
            method: input.requestMethod,
            headers: input.headers,
            body: input.body,
            keepalive: options.keepalive,
            redirect: input.redirect,
            signal: input.signal,
          });

          const responseRetry = shouldRetryTransportResponse({
            attempt,
            maxAttempts,
            request: input,
            response,
            retryMethods,
            retryStatuses,
            bodyIsReplayable,
            retryOptions: options.retry,
          });

          if (responseRetry.shouldRetry) {
            await waitForRetryDelay(responseRetry.delayMs, input.signal, options.sleep);
            continue;
          }

          return {
            response,
            attempts: attempt,
          };
        } catch (error) {
          const errorRetry = shouldRetryTransportError({
            attempt,
            maxAttempts,
            request: input,
            error,
            retryMethods,
            retryCategories,
            bodyIsReplayable,
            signal: input.signal,
            retryOptions: options.retry,
          });

          if (errorRetry.shouldRetry) {
            await waitForRetryDelay(errorRetry.delayMs, input.signal, options.sleep);
            continue;
          }

          throw decorateTransportError(error, attempt);
        }
      }

      throw decorateTransportError(new Error('Forward transport exhausted all attempts'), maxAttempts);
    },
  };
}

function classifyForwardTransportFailure(error: unknown): ForwardTransportFailure {
  if (isTimeoutError(error)) {
    return {
      responseStatus: 504,
      errorCode: 'UPSTREAM_TIMEOUT',
      errorMsg: 'Upstream request timed out',
      transportErrorCategory: 'timeout',
      transportErrorCode: extractErrorCode(error),
    };
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  const normalizedCode = extractErrorCode(error)?.toUpperCase() ?? null;
  const normalizedMessage = rawMessage.toUpperCase();

  if (
    normalizedCode === 'ENOTFOUND' ||
    normalizedCode === 'EAI_AGAIN' ||
    normalizedMessage.includes('ENOTFOUND') ||
    normalizedMessage.includes('DNS')
  ) {
    return {
      responseStatus: 502,
      errorCode: 'UPSTREAM_DNS_ERROR',
      errorMsg: 'Upstream DNS lookup failed',
      transportErrorCategory: 'dns',
      transportErrorCode: normalizedCode,
    };
  }

  if (
    normalizedCode?.startsWith('ERR_TLS') ||
    normalizedCode === 'CERT_HAS_EXPIRED' ||
    normalizedCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    normalizedCode === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    normalizedMessage.includes('TLS') ||
    normalizedMessage.includes('CERTIFICATE')
  ) {
    return {
      responseStatus: 502,
      errorCode: 'UPSTREAM_TLS_ERROR',
      errorMsg: 'Upstream TLS handshake failed',
      transportErrorCategory: 'tls',
      transportErrorCode: normalizedCode,
    };
  }

  if (
    normalizedCode === 'ECONNREFUSED' ||
    normalizedCode === 'ECONNRESET' ||
    normalizedCode === 'ECONNABORTED' ||
    normalizedCode === 'EHOSTUNREACH' ||
    normalizedCode === 'ENETUNREACH' ||
    normalizedCode === 'EPIPE' ||
    normalizedMessage.includes('ECONNREFUSED') ||
    normalizedMessage.includes('ECONNRESET') ||
    normalizedMessage.includes('CONNECTION REFUSED') ||
    normalizedMessage.includes('NETWORK UNREACHABLE')
  ) {
    return {
      responseStatus: 502,
      errorCode: 'UPSTREAM_CONNECT_ERROR',
      errorMsg: 'Upstream connection failed',
      transportErrorCategory: 'connect',
      transportErrorCode: normalizedCode,
    };
  }

  return {
    responseStatus: 502,
    errorCode: 'UPSTREAM_NETWORK_ERROR',
    errorMsg: 'Upstream network request failed',
    transportErrorCategory: 'network',
    transportErrorCode: normalizedCode,
  };
}

export function createForwardProxy(options: ForwardProxyOptions) {
  const beforeMatchHooks: ForwardBeforeMatchHook[] = [];
  const beforeRequestHooks: ForwardBeforeRequestHook[] = [];
  const afterResponseHooks: ForwardAfterResponseHook[] = [];
  const onErrorHooks: ForwardOnErrorHook[] = [];
  const defaultTransport = options.defaultTransport ?? DEFAULT_FORWARD_PROXY_OPTIONS.defaultTransport ?? 'fetch';
  const transports = createTransportRegistry(options.transports);
  const forwardRules = normalizeForwardRules(
    options.rulesJson,
    options.defaultTimeoutMs,
    options.blockPrivateIp,
    defaultTransport
  );

  const fallbackRule = options.fallbackTarget
    ? buildNormalizedRule(
        {
          prefix: '/',
          target: options.fallbackTarget,
          stripPrefix: false,
          transport: defaultTransport,
          timeoutMs: options.defaultTimeoutMs,
        },
        options.defaultTimeoutMs,
        options.blockPrivateIp,
        defaultTransport
      )
    : null;

  validateForwardTransports(forwardRules, fallbackRule, transports, defaultTransport);

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

    const requestId = c.get('requestId');
    const requestStartAt = nowMs();
    const phaseTimings = createForwardPhaseTimings();
    const hookCounts = {
      beforeMatch: beforeMatchHooks.length,
      beforeRequest: beforeRequestHooks.length,
      afterResponse: afterResponseHooks.length,
      onError: onErrorHooks.length,
    };
    let requestUrl = new URL(c.req.url);
    let requestMethod = c.req.method.toUpperCase();
    let rule: NormalizedForwardRule | null = null;
    let hookRule: ForwardHookRule | null = null;
    let upstreamUrl: URL | null = null;
    let headers: Headers | null = null;
    let timeout: ReturnType<typeof createTimeoutSignal> | null = null;
    let transportName: string | null = null;
    let transportAttempts: number | null = null;
    let stage: ForwardExecutionStage = 'beforeMatch';

    try {
      const beforeMatchStartAt = nowMs();
      const matchState = await runBeforeMatchHooks({
        context: c,
        requestUrl: new URL(c.req.url),
        requestMethod,
      });
      phaseTimings.beforeMatch = elapsedMs(beforeMatchStartAt);
      requestUrl = matchState.requestUrl;
      requestMethod = matchState.requestMethod;
      rule = resolveForwardRule(requestUrl.pathname, requestMethod);

      if (!rule) {
        return null;
      }

      hookRule = toForwardHookRule(rule);
      upstreamUrl = buildUpstreamUrl(rule, requestUrl);
      headers = buildForwardHeaders(c, rule);
      headers = applyStaticHeaders(headers, rule.requestHeaders);
      stripHopByHopHeaders(headers);
      headers.delete('content-length');
      headers.set('x-correlation-id', requestId);
      timeout = createTimeoutSignal(rule.timeoutMs);
      transportName = rule.transport;

      stage = 'beforeRequest';
      const beforeRequestStartAt = nowMs();
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
          phaseTimings.beforeRequest = elapsedMs(beforeRequestStartAt);
          return result.response;
        }

        if (result?.upstreamUrl) {
          upstreamUrl = new URL(result.upstreamUrl.toString());
        }

        if (result?.headers) {
          headers = new Headers(result.headers);
        }
      }
      phaseTimings.beforeRequest = elapsedMs(beforeRequestStartAt);

      stage = 'upstream';
      const upstreamStartAt = nowMs();
      const transport = transports[rule.transport]!;
      const transportResult = await transport.execute({
        context: c,
        requestId,
        requestUrl: new URL(requestUrl.toString()),
        requestMethod,
        rule: hookRule,
        upstreamUrl: new URL(upstreamUrl.toString()),
        headers: new Headers(headers),
        body: shouldSendRequestBody(requestMethod) ? (c.req.raw.body ?? undefined) : undefined,
        redirect: rule.followRedirect ? 'follow' : 'manual',
        timeoutMs: rule.timeoutMs,
        signal: timeout.signal,
      });
      const upstreamResponse = transportResult.response;
      transportAttempts = transportResult.attempts;
      phaseTimings.upstream = elapsedMs(upstreamStartAt);

      if (rule.acceptStatuses && !rule.acceptStatuses.has(upstreamResponse.status)) {
        throw buildRejectedStatusError(upstreamResponse.status);
      }

      let responseHeaders = new Headers(upstreamResponse.headers);
      stripHopByHopHeaders(responseHeaders);
      responseHeaders = applyStaticHeaders(responseHeaders, rule.responseHeaders);
      stripHopByHopHeaders(responseHeaders);
      responseHeaders.set('x-correlation-id', requestId);
      responseHeaders.set('x-humming-proxy', '1');

      let response = new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });

      stage = 'afterResponse';
      const afterResponseStartAt = nowMs();
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
      phaseTimings.afterResponse = elapsedMs(afterResponseStartAt);

      logger.info(
        {
          requestId,
          path: requestUrl.pathname,
          method: requestMethod,
          rulePrefix: rule.prefix,
          stripPrefix: rule.stripPrefix,
          followRedirect: rule.followRedirect,
          upstream: upstreamUrl.toString(),
          upstreamPath: upstreamUrl.pathname,
          transportStrategy: transportName,
          transportAttempts,
          upstreamStatus: upstreamResponse.status,
          status: response.status,
          localDebugRuntimeApplied: isLocalDebugRuntimeApplied(c),
          hookCounts,
          phaseTimingsMs: buildForwardTimingSummary(phaseTimings, requestStartAt),
        },
        'request forwarded'
      );

      return response;
    } catch (error) {
      const transportFailure =
        stage === 'upstream' && !isRejectedStatusError(error)
          ? classifyForwardTransportFailure(error)
          : null;
      const resolvedTransportAttempts =
        extractTransportAttempts(error) ?? transportAttempts ?? (stage === 'upstream' ? 1 : null);
      let handledByOnErrorHook = false;
      let onErrorResponse: Response | null = null;

      const onErrorStartAt = nowMs();
      for (const hook of onErrorHooks) {
        const maybeResponse = await hook({
          context: c,
          requestId,
          requestUrl,
          requestMethod,
          rule: hookRule ?? createFallbackHookRule(options.defaultTimeoutMs, transportName ?? defaultTransport),
          upstreamUrl: new URL((upstreamUrl ?? requestUrl).toString()),
          stage,
          error,
        });

        if (maybeResponse instanceof Response) {
          handledByOnErrorHook = true;
          onErrorResponse = maybeResponse;
          break;
        }
      }
      phaseTimings.onError = elapsedMs(onErrorStartAt);

      logger.error(
        {
          requestId,
          path: requestUrl.pathname,
          method: requestMethod,
          rulePrefix: rule?.prefix ?? null,
          stripPrefix: rule?.stripPrefix ?? null,
          followRedirect: rule?.followRedirect ?? null,
          upstream: upstreamUrl?.toString() ?? null,
          upstreamPath: upstreamUrl?.pathname ?? null,
          transportStrategy: transportName,
          transportAttempts: resolvedTransportAttempts,
          stage,
          transportErrorCategory: transportFailure?.transportErrorCategory ?? null,
          transportErrorCode: transportFailure?.transportErrorCode ?? null,
          localDebugRuntimeApplied: isLocalDebugRuntimeApplied(c),
          hookCounts,
          handledByOnErrorHook,
          handledStatus: onErrorResponse?.status ?? null,
          phaseTimingsMs: buildForwardTimingSummary(phaseTimings, requestStartAt),
          err: error,
        },
        'forward request failed'
      );

      if (onErrorResponse) {
        return onErrorResponse;
      }

      if (isRejectedStatusError(error)) {
        return c.json(
          {
            result: false,
            errorCode: 'UPSTREAM_STATUS_NOT_ACCEPTED',
            errorMsg: error.message,
            errorStage: stage,
            upstreamStatus: error.status,
            requestId,
          },
          502
        );
      }

      if (stage !== 'upstream') {
        return c.json(
          {
            result: false,
            errorCode: 'FORWARD_HOOK_ERROR',
            errorMsg: `Forward ${stage} hook failed`,
            errorStage: stage,
            requestId,
          },
          500
        );
      }

      if (transportFailure) {
        return c.json(
          {
            result: false,
            errorCode: transportFailure.errorCode,
            errorMsg: transportFailure.errorMsg,
            errorStage: stage,
            transportErrorCategory: transportFailure.transportErrorCategory,
            transportErrorCode: transportFailure.transportErrorCode,
            transportStrategy: transportName,
            transportAttempts: resolvedTransportAttempts,
            requestId,
          },
          transportFailure.responseStatus
        );
      }

      return c.json(
        {
          result: false,
          errorCode: 'UPSTREAM_ERROR',
          errorMsg: 'Upstream request failed',
          errorStage: stage,
          requestId,
        },
        502
      );
    } finally {
      timeout?.clear();
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
  enabled: DEFAULT_FORWARD_PROXY_OPTIONS.enabled,
  defaultTimeoutMs: DEFAULT_FORWARD_PROXY_OPTIONS.defaultTimeoutMs,
  blockPrivateIp: DEFAULT_FORWARD_PROXY_OPTIONS.blockPrivateIp,
  fallbackTarget: DEFAULT_FORWARD_PROXY_OPTIONS.fallbackTarget,
  rulesJson: DEFAULT_FORWARD_PROXY_OPTIONS.rulesJson,
});

export const tryForwardRequest = defaultForwardProxy.tryForwardRequest;
