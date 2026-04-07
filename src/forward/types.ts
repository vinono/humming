export type ForwardMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ForwardRule = {
  prefix: string;
  target: string;
  stripPrefix?: boolean;
  timeoutMs?: number;
  allowedMethods?: ForwardMethod[];
};
