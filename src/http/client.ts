import { logger } from '../logger';
import type {
  FetchLike,
  HttpClient,
  HttpClientErrorMeta,
  HttpClientHooks,
  HttpClientOptions,
  HttpRequestBody,
  HttpClientRequestMeta,
  HttpClientRequestOptions,
  HttpClientSuccessMeta,
  HttpMethod,
} from './types';
import { HttpClientError } from './types';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY = 0;
const DEFAULT_RETRY_DELAY_MS = 200;
const DEFAULT_RETRY_METHODS: HttpMethod[] = ['GET', 'HEAD', 'OPTIONS'];
const DEFAULT_RETRY_STATUS_CODES = [408, 425, 429, 500, 502, 503, 504];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBodyInit(value: unknown): value is Exclude<HttpRequestBody, Record<string, unknown> | unknown[]> {
  return (
    typeof value === 'string' ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ReadableStream
  );
}

function createRequestUrl(input: string, options: HttpClientRequestOptions): URL {
  const url = options.baseUrl ? new URL(input, options.baseUrl) : new URL(input);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          url.searchParams.append(key, String(item));
        }
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

function buildRequestInit(method: HttpMethod, options: HttpClientRequestOptions, signal: AbortSignal): RequestInit {
  const headers = new Headers(options.headers);
  if (options.requestId) {
    headers.set('x-correlation-id', options.requestId);
  }

  const init: RequestInit = {
    method,
    headers,
    signal,
  };

  if (options.body === undefined || method === 'GET' || method === 'HEAD') {
    return init;
  }

  if (isBodyInit(options.body)) {
    init.body = options.body;
    return init;
  }

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  init.body = JSON.stringify(options.body);
  return init;
}

function createAbortSignal(timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  const handleExternalAbort = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      handleExternalAbort();
    } else {
      externalSignal.addEventListener('abort', handleExternalAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timeout);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', handleExternalAbort);
      }
    },
  };
}

function shouldRetry(method: HttpMethod, error: HttpClientError, options: HttpClientRequestOptions, defaults: HttpClientOptions) {
  const retryMethods = new Set(options.retryMethods ?? defaults.retryMethods ?? DEFAULT_RETRY_METHODS);
  const retryStatusCodes = new Set(options.retryStatusCodes ?? defaults.retryStatusCodes ?? DEFAULT_RETRY_STATUS_CODES);

  if (!retryMethods.has(method)) {
    return false;
  }

  if (error.code === 'HTTP_TIMEOUT' || error.code === 'HTTP_NETWORK_ERROR') {
    return true;
  }

  return error.status !== undefined && retryStatusCodes.has(error.status);
}

function toHttpClientError(params: {
  error: unknown;
  method: HttpMethod;
  url: string;
  attempt: number;
  responseBody?: string;
}): HttpClientError {
  if (params.error instanceof HttpClientError) {
    return params.error;
  }

  return new HttpClientError({
    code: 'HTTP_NETWORK_ERROR',
    message: params.error instanceof Error ? params.error.message : String(params.error),
    method: params.method,
    url: params.url,
    attempt: params.attempt,
    retryable: true,
    responseBody: params.responseBody,
    cause: params.error,
  });
}

function createDefaultHooks(): HttpClientHooks {
  return {
    onRequestSuccess(meta: HttpClientSuccessMeta) {
      logger.info(
        {
          method: meta.method,
          url: meta.url,
          status: meta.status,
          duration: meta.durationMs,
          requestId: meta.requestId,
          attempt: meta.attempt,
        },
        'http request completed'
      );
    },
    onRequestError(meta: HttpClientErrorMeta) {
      logger.warn(
        {
          method: meta.method,
          url: meta.url,
          status: meta.error.status,
          duration: meta.durationMs,
          requestId: meta.requestId,
          attempt: meta.attempt,
          code: meta.error.code,
          err: meta.error,
        },
        'http request failed'
      );
    },
  };
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const fetchImpl: FetchLike = options.fetchImpl ?? fetch;
  const hooks: HttpClientHooks = {
    ...createDefaultHooks(),
    ...options,
  };

  async function request(input: string, requestOptions: HttpClientRequestOptions = {}): Promise<Response> {
    const method = (requestOptions.method ?? 'GET').toUpperCase() as HttpMethod;
    const url = createRequestUrl(input, requestOptions);
    const maxRetries = requestOptions.retry ?? options.defaultRetry ?? DEFAULT_RETRY;
    const retryDelayMs = requestOptions.retryDelayMs ?? options.defaultRetryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    const timeoutMs = requestOptions.timeoutMs ?? options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;

    let attempt = 0;
    let lastError: HttpClientError | undefined;

    while (attempt <= maxRetries) {
      attempt += 1;
      const meta: HttpClientRequestMeta = {
        method,
        url: url.toString(),
        timeoutMs,
        requestId: requestOptions.requestId,
        attempt,
      };
      hooks.onRequestStart?.(meta);

      const startedAt = Date.now();
      const { signal, cleanup, didTimeout } = createAbortSignal(timeoutMs, requestOptions.signal);

      try {
        const response = await fetchImpl(url, buildRequestInit(method, requestOptions, signal));

        if (!response.ok) {
          const responseBody = await response.clone().text().catch(() => undefined);
          throw new HttpClientError({
            code: 'HTTP_RESPONSE_ERROR',
            message: `Upstream returned ${response.status}`,
            method,
            url: url.toString(),
            status: response.status,
            attempt,
            retryable: true,
            responseBody,
          });
        }

        hooks.onRequestSuccess?.({
          ...meta,
          status: response.status,
          durationMs: Date.now() - startedAt,
        });
        return response;
      } catch (error) {
        const normalizedError =
          error instanceof HttpClientError
            ? error
            : new HttpClientError({
                code: didTimeout() ? 'HTTP_TIMEOUT' : requestOptions.signal?.aborted ? 'HTTP_ABORTED' : 'HTTP_NETWORK_ERROR',
                message:
                  didTimeout()
                    ? `Request timed out after ${timeoutMs}ms`
                    : error instanceof Error
                      ? error.message
                      : String(error),
                method,
                url: url.toString(),
                attempt,
                retryable: didTimeout() || !requestOptions.signal?.aborted,
                cause: error,
              });

        hooks.onRequestError?.({
          ...meta,
          durationMs: Date.now() - startedAt,
          error: normalizedError,
        });

        lastError = normalizedError;
        if (attempt > maxRetries || !shouldRetry(method, normalizedError, requestOptions, options)) {
          throw normalizedError;
        }

        await (options.sleep ?? delay)(retryDelayMs);
      } finally {
        cleanup();
      }
    }

    throw toHttpClientError({
      error: lastError ?? new Error('Unknown HTTP client error'),
      method,
      url: url.toString(),
      attempt,
    });
  }

  async function requestJson<T>(input: string, requestOptions: HttpClientRequestOptions = {}): Promise<T> {
    const response = await request(input, requestOptions);

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new HttpClientError({
        code: 'HTTP_INVALID_JSON',
        message: 'Response body is not valid JSON',
        method: (requestOptions.method ?? 'GET').toUpperCase() as HttpMethod,
        url: createRequestUrl(input, requestOptions).toString(),
        attempt: 1,
        retryable: false,
        cause: error,
      });
    }
  }

  async function requestText(input: string, requestOptions: HttpClientRequestOptions = {}): Promise<string> {
    const response = await request(input, requestOptions);
    return response.text();
  }

  function withMethod(method: HttpMethod) {
    return (input: string, requestOptions: Omit<HttpClientRequestOptions, 'method'> = {}) =>
      request(input, {
        ...requestOptions,
        method,
      });
  }

  return {
    request,
    requestJson,
    requestText,
    get: withMethod('GET'),
    post: withMethod('POST'),
    put: withMethod('PUT'),
    patch: withMethod('PATCH'),
    delete: withMethod('DELETE'),
  };
}

export const httpClient = createHttpClient();
