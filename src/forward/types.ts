export type ForwardMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ForwardTransportErrorCategory = 'timeout' | 'dns' | 'tls' | 'connect' | 'network';

export type ForwardRule = {
  prefix: string;
  target: string;
  transport?: string;
  stripPrefix?: boolean;
  pathRewrite?: string;
  preserveHost?: boolean;
  followRedirect?: boolean;
  timeoutMs?: number;
  allowedMethods?: ForwardMethod[];
  stripRequestHeaders?: string[];
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  acceptStatuses?: number[];
};
