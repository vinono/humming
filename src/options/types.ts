export type OptionItem = {
  value: string | number | boolean;
  label: string | number | boolean;
  [key: string]: unknown;
};

export type OptionRequest = {
  key: string;
  params?: Record<string, unknown>;
};

export type OptionRuntimeContext = {
  requestId: string;
  headers: Headers;
};

export type OptionRule = {
  type: string;
  [key: string]: unknown;
};

export type OptionResponse = {
  key: string;
  val: OptionItem[] | null;
  params?: Record<string, unknown>;
  error?: string;
};
