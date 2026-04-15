# Plugin Guide

`humming` keeps the core small and expects most business behavior to live in plugins.

## When To Use A Plugin

Use a plugin when you want to add:

- routes
- middleware
- option source types
- forward hooks
- operational behavior like auth, caching, logging, or CORS

Keep `health`, base request handling, core `options`, and the forward terminal in core.

## Plugin Shape

Use `definePlugin()` to create a plugin:

```ts
import { definePlugin } from 'humming';

export const myPlugin = definePlugin({
  name: 'my-plugin',
  setup(context) {
    // register routes, middleware, option sources, or forward hooks
  },
});
```

Optional metadata helps govern plugin behavior:

```ts
definePlugin({
  name: 'dev-toolbar',
  meta: {
    priority: 100,
    mode: 'development',
    debugLabel: 'local-debug',
    dependencies: ['request-logger'],
    conflicts: ['legacy-toolbar'],
  },
  setup(context) {
    // ...
  },
});
```

Metadata fields:

- `priority`: higher numbers run earlier
- `mode`: `development`, `test`, `production`, `all`, or an array of modes
- `debugLabel`: readable label for debugging and error messages
- `dependencies`: plugin names that must already be enabled
- `conflicts`: plugin names that cannot be enabled together

At startup, `humming` validates duplicate names, missing dependencies, and declared conflicts before plugin setup runs.

## Plugin Context

Each plugin receives:

- `app`: the Hono app instance
- `env`: parsed environment config
- `logger`: shared logger
- `services.options`: option registry access
- `services.forwardProxy`: forward hook registration
- `services.localDebugRuntime`: shared local debug state for login env, target, cookies, and tenant data
- `use(path, middleware)`: register middleware
- `route(path, routes)`: mount Hono routes

If multiple local-debug plugins need to coordinate environment switching or cookie state, prefer `services.localDebugRuntime` as the single in-process source of truth instead of having each plugin read its own file.

## Sync Plugin Example

```ts
import { Hono } from 'hono';
import { definePlugin } from 'humming';

export const helloPlugin = definePlugin({
  name: 'hello-plugin',
  setup({ route }) {
    const routes = new Hono();

    routes.get('/api/hello', (c) => {
      return c.json({
        result: true,
        data: {
          message: 'hello from plugin',
        },
      });
    });

    route('/', routes);
  },
});
```

## Async Plugin Example

If plugin setup needs async work, use `createApp()` instead of `createAppSync()`.

```ts
import { definePlugin, createApp } from 'humming';

const asyncPlugin = definePlugin({
  name: 'async-plugin',
  async setup({ logger }) {
    await Bun.sleep(50);
    logger.info({ plugin: 'async-plugin' }, 'ready');
  },
});

const app = await createApp({
  env,
  plugins: [asyncPlugin],
});
```

Runnable example:

- `examples/with-async-plugin`

## Route Plugins

Route plugins should usually create a local `Hono` instance and mount it through `route()`:

```ts
import { Hono } from 'hono';
import { definePlugin } from 'humming';

export const routesPlugin = definePlugin({
  name: 'routes-plugin',
  setup({ route }) {
    const routes = new Hono();
    routes.get('/api/ping', (c) => c.json({ ok: true }));
    route('/', routes);
  },
});
```

## Middleware Plugins

Middleware plugins should usually register through `use('*', middleware)`:

```ts
import { definePlugin } from 'humming';

export const timingPlugin = definePlugin({
  name: 'timing',
  setup({ use }) {
    use('*', async (c, next) => {
      const start = Date.now();
      await next();
      c.header('x-duration-ms', String(Date.now() - start));
    });
  },
});
```

## Auth Plugins

`createAuthPlugin()` supports two useful modes:

- custom `validate()` for simple bearer or opaque token checks
- built-in `jwt` verification for HS256 bearer tokens

Successful auth can attach a user object to `context` through `c.get('authUser')`.

Example:

```ts
createAuthPlugin({
  jwt: {
    secret: 'replace-me',
    issuer: 'humming-demo',
    audience: 'frontend-app',
  },
  roleRules: [
    {
      paths: ['/api/admin*'],
      roles: ['admin'],
    },
  ],
});
```

Inside routes:

```ts
routes.get('/api/me', (c) => {
  return c.json({
    result: true,
    data: c.get('authUser'),
  });
});
```

## Cache Plugins

`createCachePlugin()` is store-driven:

- default: in-memory cache
- shared deployments: inject Redis through `createRedisCacheStore()`
- custom platforms: provide your own `store` with `get()` and `set()`

Example:

```ts
import { createCachePlugin, createRedisCacheStore } from 'humming';

const cacheStore = createRedisCacheStore({
  url: Bun.env.REDIS_URL,
  prefix: 'humming:cache',
});

createCachePlugin({
  includePaths: ['/api/catalog*'],
  ttlMs: 10_000,
  store: cacheStore,
});
```

Custom store contract:

```ts
type CacheStore = {
  get(key: string): Promise<CachedResponse | null>;
  set(key: string, value: CachedResponse, ttlMs: number): Promise<void>;
  delete?(key: string): Promise<void>;
};
```

## Rate Limit Plugins

`createRateLimitPlugin()` is a good fit for operational throttling close to the BFF edge.

- default: in-memory fixed-window limiting
- shared deployments: inject Redis through `createRedisRateLimitStore()`
- custom platforms: provide your own `store.consume()` implementation

Example:

```ts
import { createRateLimitPlugin, createRedisRateLimitStore } from 'humming';

const rateLimitStore = createRedisRateLimitStore({
  url: Bun.env.REDIS_URL,
  prefix: 'humming:rate-limit',
});

createRateLimitPlugin({
  includePaths: ['/api/search*'],
  limit: 30,
  windowMs: 60_000,
  store: rateLimitStore,
  key({ context }) {
    return context.req.header('authorization') ?? 'anonymous';
  },
});
```

Custom store contract:

```ts
type RateLimitStore = {
  consume(input: {
    key: string;
    windowMs: number;
    now: number;
  }): Promise<{
    totalHits: number;
    resetAt: number;
  }>;
  reset?(key: string): Promise<void>;
};
```

## Metrics Plugins

`createMetricsPlugin()` is useful when you want the BFF itself to expose scrape-friendly operational visibility.

- default: in-memory Prometheus-style registry
- exports request totals, in-flight requests, and latency histograms
- custom platforms: inject your own `registry`

Example:

```ts
import { createMetricsPlugin } from 'humming';

createMetricsPlugin({
  path: '/metrics',
  labelPath({ path }) {
    if (path.startsWith('/api/users/')) {
      return '/api/users/:id';
    }

    return path;
  },
});
```

Custom registry contract:

```ts
type MetricsRegistry = {
  incrementInFlight(): void | Promise<void>;
  decrementInFlight(): void | Promise<void>;
  observe(input: {
    method: string;
    path: string;
    status: number;
    durationMs: number;
  }): void | Promise<void>;
  render(): string | Promise<string>;
  reset?(): void | Promise<void>;
};
```

## Options Plugins

Custom option types should register through `services.options.registerSource()`:

```ts
services.options.registerSource('memory', async ({ rule }) => {
  const items = Array.isArray(rule.items) ? rule.items : [];
  return items.map((item) => ({
    ...item,
    value: String(item.id),
    label: String(item.name),
  }));
});
```

## Forward Plugins

Forward customization should happen through hooks:

- `registerBeforeMatch()`
- `registerBeforeRequest()`
- `registerAfterResponse()`
- `registerOnError()`
- `registerHooks()`

Example:

```ts
services.forwardProxy.registerBeforeRequest(({ headers }) => {
  const nextHeaders = new Headers(headers);
  nextHeaders.set('x-plugin-hook', 'enabled');
  return { headers: nextHeaders };
});
```

## Official Plugin Patterns

Current official plugins are intentionally small and composable:

- `createAuthPlugin()`
- `createCachePlugin()`
- `createCorsPlugin()`
- `createMetricsPlugin()`
- `createRequestLoggerPlugin()`
- `createRateLimitPlugin()`
- `createOptionsStaticPlugin()`
- `createOptionsHttpPlugin()`

Follow the same pattern for custom plugins:

- accept explicit options
- keep one clear responsibility per plugin
- prefer composition over hidden side effects
- use shared services instead of patching core behavior directly
