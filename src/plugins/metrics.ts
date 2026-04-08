import type { Context, MiddlewareHandler } from 'hono';
import { Hono } from 'hono';
import { definePlugin } from '../core';
import type { AppBindings, AuthUser } from '../types';

type PathPattern = string | RegExp;

export type MetricsObserveInput = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
};

export type MetricsRegistry = {
  incrementInFlight(): void | Promise<void>;
  decrementInFlight(): void | Promise<void>;
  observe(input: MetricsObserveInput): void | Promise<void>;
  render(): string | Promise<string>;
  reset?(): void | Promise<void>;
};

export type MetricsRegistryOptions = {
  prefix?: string;
  durationBucketsMs?: number[];
};

export type MetricsPluginLabelInput = {
  context: Context<AppBindings>;
  requestId: string;
  method: string;
  path: string;
  authUser: AuthUser | null;
};

export type MetricsPluginSkipInput = MetricsPluginLabelInput;

export type MetricsPluginOptions = {
  path?: string;
  includePaths?: PathPattern[];
  excludePaths?: PathPattern[];
  labelPath?: (input: MetricsPluginLabelInput) => string | Promise<string>;
  skip?: (input: MetricsPluginSkipInput) => boolean | Promise<boolean>;
  registry?: MetricsRegistry;
  registryOptions?: MetricsRegistryOptions;
};

type RequestCounterKey = `${string}|${string}|${string}`;
type DurationKey = `${string}|${string}`;

const DEFAULT_DURATION_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000];

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

function escapeLabelValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function toLabels(labels: Record<string, string>) {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return '';
  }

  return `{${entries
    .map(([key, value]) => `${key}="${escapeLabelValue(value)}"`)
    .join(',')}}`;
}

function createRequestCounterKey(method: string, path: string, status: number): RequestCounterKey {
  return `${method}|${path}|${status}`;
}

function createDurationKey(method: string, path: string): DurationKey {
  return `${method}|${path}`;
}

export function createMetricsRegistry(options: MetricsRegistryOptions = {}): MetricsRegistry {
  const prefix = options.prefix ?? 'humming';
  const durationBucketsMs = [...(options.durationBucketsMs ?? DEFAULT_DURATION_BUCKETS_MS)].sort((left, right) => left - right);
  const requestTotals = new Map<RequestCounterKey, number>();
  const durationSums = new Map<DurationKey, number>();
  const durationCounts = new Map<DurationKey, number>();
  const durationBuckets = new Map<DurationKey, number[]>();
  let inFlight = 0;

  return {
    incrementInFlight() {
      inFlight += 1;
    },
    decrementInFlight() {
      inFlight = Math.max(inFlight - 1, 0);
    },
    observe(input) {
      const requestKey = createRequestCounterKey(input.method, input.path, input.status);
      requestTotals.set(requestKey, (requestTotals.get(requestKey) ?? 0) + 1);

      const durationKey = createDurationKey(input.method, input.path);
      durationSums.set(durationKey, (durationSums.get(durationKey) ?? 0) + input.durationMs);
      durationCounts.set(durationKey, (durationCounts.get(durationKey) ?? 0) + 1);

      const counts = durationBuckets.get(durationKey) ?? durationBucketsMs.map(() => 0);
      for (let index = 0; index < durationBucketsMs.length; index += 1) {
        const bucket = durationBucketsMs[index];
        if (bucket !== undefined && input.durationMs <= bucket) {
          counts[index] = (counts[index] ?? 0) + 1;
        }
      }
      durationBuckets.set(durationKey, counts);
    },
    render() {
      const lines: string[] = [];

      lines.push(`# HELP ${prefix}_http_in_flight_requests Number of in-flight requests currently being processed.`);
      lines.push(`# TYPE ${prefix}_http_in_flight_requests gauge`);
      lines.push(`${prefix}_http_in_flight_requests ${inFlight}`);
      lines.push('');

      lines.push(`# HELP ${prefix}_http_requests_total Total number of HTTP requests observed by the metrics plugin.`);
      lines.push(`# TYPE ${prefix}_http_requests_total counter`);
      for (const [key, value] of Array.from(requestTotals.entries()).sort(([left], [right]) => left.localeCompare(right))) {
        const [method, path, status] = key.split('|');
        lines.push(
          `${prefix}_http_requests_total${toLabels({
            method: method ?? 'UNKNOWN',
            path: path ?? 'unknown',
            status: status ?? '0',
          })} ${value}`
        );
      }
      lines.push('');

      lines.push(`# HELP ${prefix}_http_request_duration_ms Request duration in milliseconds.`);
      lines.push(`# TYPE ${prefix}_http_request_duration_ms histogram`);
      for (const durationKey of Array.from(durationCounts.keys()).sort()) {
        const [method, path] = durationKey.split('|');
        const labels = {
          method: method ?? 'UNKNOWN',
          path: path ?? 'unknown',
        };
        const counts = durationBuckets.get(durationKey) ?? durationBucketsMs.map(() => 0);
        let cumulative = 0;

        for (let index = 0; index < durationBucketsMs.length; index += 1) {
          const bucket = durationBucketsMs[index];
          cumulative += counts[index] ?? 0;
          lines.push(
            `${prefix}_http_request_duration_ms_bucket${toLabels({
              ...labels,
              le: String(bucket),
            })} ${cumulative}`
          );
        }

        const totalCount = durationCounts.get(durationKey) ?? 0;
        lines.push(
          `${prefix}_http_request_duration_ms_bucket${toLabels({
            ...labels,
            le: '+Inf',
          })} ${totalCount}`
        );
        lines.push(`${prefix}_http_request_duration_ms_sum${toLabels(labels)} ${durationSums.get(durationKey) ?? 0}`);
        lines.push(`${prefix}_http_request_duration_ms_count${toLabels(labels)} ${totalCount}`);
      }

      return `${lines.join('\n')}\n`;
    },
    reset() {
      requestTotals.clear();
      durationSums.clear();
      durationCounts.clear();
      durationBuckets.clear();
      inFlight = 0;
    },
  };
}

function defaultLabelPath(path: string) {
  return path;
}

function createMetricsMiddleware(
  registry: MetricsRegistry,
  options: Required<Pick<MetricsPluginOptions, 'path'> & { excludePaths: PathPattern[] }> &
    Pick<MetricsPluginOptions, 'includePaths' | 'labelPath' | 'skip'>
): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const method = c.req.method.toUpperCase();
    const path = c.req.path;
    const requestId = c.get('requestId');
    const authUser = c.get('authUser');

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

    const startAt = Date.now();
    await registry.incrementInFlight();

    try {
      await next();
    } finally {
      await registry.decrementInFlight();

      const labeledPath = options.labelPath
        ? await options.labelPath({
            context: c,
            requestId,
            method,
            path,
            authUser,
          })
        : defaultLabelPath(path);

      await registry.observe({
        method,
        path: labeledPath,
        status: c.res.status,
        durationMs: Date.now() - startAt,
      });
    }
  };
}

function createMetricsRoutes(metricsPath: string, registry: MetricsRegistry) {
  const routes = new Hono<AppBindings>();

  routes.get(metricsPath, async (c) => {
    const body = await registry.render();

    return c.body(body, 200, {
      'content-type': 'text/plain; version=0.0.4; charset=utf-8',
    });
  });

  return routes;
}

export function createMetricsPlugin(options: MetricsPluginOptions = {}) {
  const metricsPath = options.path ?? '/metrics';
  const registry = options.registry ?? createMetricsRegistry(options.registryOptions);
  const excludePaths = [metricsPath, ...(options.excludePaths ?? [])];

  return definePlugin({
    name: 'metrics',
    setup({ route, use }) {
      use(
        '*',
        createMetricsMiddleware(registry, {
          path: metricsPath,
          includePaths: options.includePaths,
          excludePaths,
          labelPath: options.labelPath,
          skip: options.skip,
        })
      );
      route('/', createMetricsRoutes(metricsPath, registry));
    },
  });
}
