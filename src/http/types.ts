export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type HttpHeadersInit = Headers | Record<string, string> | string[][];
export type HttpRequestBody = Exclude<RequestInit['body'], null | undefined> | Record<string, unknown> | unknown[];

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type HttpClientErrorCode =
  | 'HTTP_TIMEOUT'
  | 'HTTP_ABORTED'
  | 'HTTP_NETWORK_ERROR'
  | 'HTTP_RESPONSE_ERROR'
  | 'HTTP_INVALID_JSON';

export type HttpClientRequestOptions = {
  method?: HttpMethod;
  baseUrl?: string;
  headers?: HttpHeadersInit;
  query?: Record<string, unknown>;
  body?: HttpRequestBody;
  timeoutMs?: number;
  retry?: number;
  retryDelayMs?: number;
  retryMethods?: HttpMethod[];
  retryStatusCodes?: number[];
  parseAs?: 'json' | 'text' | 'response';
  requestId?: string;
  signal?: AbortSignal;
};

export type HttpClientRequestMeta = {
  method: HttpMethod;
  url: string;
  timeoutMs: number;
  requestId?: string;
  attempt: number;
};

export type HttpClientSuccessMeta = HttpClientRequestMeta & {
  status: number;
  durationMs: number;
};

export type HttpClientErrorMeta = HttpClientRequestMeta & {
  durationMs: number;
  error: HttpClientError;
};

export type HttpClientHooks = {
  onRequestStart?: (meta: HttpClientRequestMeta) => void;
  onRequestSuccess?: (meta: HttpClientSuccessMeta) => void;
  onRequestError?: (meta: HttpClientErrorMeta) => void;
};

export type HttpClientOptions = HttpClientHooks & {
  fetchImpl?: FetchLike;
  defaultTimeoutMs?: number;
  defaultRetry?: number;
  defaultRetryDelayMs?: number;
  retryMethods?: HttpMethod[];
  retryStatusCodes?: number[];
  sleep?: (ms: number) => Promise<void>;
};

export class HttpClientError extends Error {
  code: HttpClientErrorCode;
  method: HttpMethod;
  url: string;
  status?: number;
  attempt: number;
  retryable: boolean;
  responseBody?: string;

  constructor(params: {
    code: HttpClientErrorCode;
    message: string;
    method: HttpMethod;
    url: string;
    attempt: number;
    status?: number;
    retryable: boolean;
    responseBody?: string;
    cause?: unknown;
  }) {
    super(params.message, params.cause ? { cause: params.cause } : undefined);
    this.name = 'HttpClientError';
    this.code = params.code;
    this.method = params.method;
    this.url = params.url;
    this.status = params.status;
    this.attempt = params.attempt;
    this.retryable = params.retryable;
    this.responseBody = params.responseBody;
  }
}

export type HttpClient = {
  request: (input: string, options?: HttpClientRequestOptions) => Promise<Response>;
  requestJson: <T>(input: string, options?: HttpClientRequestOptions) => Promise<T>;
  requestText: (input: string, options?: HttpClientRequestOptions) => Promise<string>;
  get: (input: string, options?: Omit<HttpClientRequestOptions, 'method'>) => Promise<Response>;
  post: (input: string, options?: Omit<HttpClientRequestOptions, 'method'>) => Promise<Response>;
  put: (input: string, options?: Omit<HttpClientRequestOptions, 'method'>) => Promise<Response>;
  patch: (input: string, options?: Omit<HttpClientRequestOptions, 'method'>) => Promise<Response>;
  delete: (input: string, options?: Omit<HttpClientRequestOptions, 'method'>) => Promise<Response>;
};
