<p align="center">
  <img src="./assets/brand/humming-logo.svg" alt="humming logo" width="560" />
</p>

<p align="center"><strong>Plugin-first lightweight BFF core for Bun.</strong></p>

`humming` is a thin, explicit BFF kernel for frontend teams and small platform teams that want local routes, options, and forwarding without adopting a heavyweight backend framework or full API gateway.

## Quick Start

Install dependencies:

```bash
bun install
```

Run the main plugin example:

```bash
bun run example:with-plugins
```

Try the core flows:

```bash
curl http://localhost:8788/health
curl http://localhost:8788/metrics
curl "http://localhost:8788/api/options?keys=teams,countries"
curl -i -H "Authorization: Bearer demo-token" http://localhost:8788/api/hello
curl -i -H "Authorization: Bearer demo-token" http://localhost:8788/api/hello
curl -i -H "Authorization: Bearer demo-token" http://localhost:8788/api/hello
```

What you should see:

- `/health`: core health endpoint
- `/metrics`: Prometheus-style metrics
- `/api/options`: options registry output
- first `/api/hello`: authenticated response with `x-humming-cache: MISS`
- second `/api/hello`: cached response with `x-humming-cache: HIT`
- third `/api/hello`: rate-limited response with `429`

## At A Glance

- Bun-first runtime built on Hono
- small core with explicit extension points
- `health`, `options`, and `forward` stay in core
- auth, cache, metrics, rate limiting, and similar behavior live in plugins
- sync and async plugin setup are both supported

## What humming Is

- a lightweight BFF core
- a place to combine local routes, option endpoints, and upstream forwarding
- a plugin-first runtime for operational and business extensions
- a good fit when you want clarity over framework magic

## What humming Is Not

- not a full API gateway replacement
- not a large backend application framework
- not an all-in platform with hidden conventions

## Official Plugins

Current official plugins in this repository:

| Plugin | Purpose | Typical Use |
| --- | --- | --- |
| `createAuthPlugin()` | Protect routes with token validation, JWT verification, and role rules | BFF auth guard, internal admin routes, bearer/JWT protection |
| `createCachePlugin()` | Cache eligible responses with memory or Redis-backed stores | reduce repeated reads, endpoint caching, multi-instance deployments |
| `createCorsPlugin()` | Apply CORS headers and handle preflight | browser clients, frontend-local development, cross-origin access |
| `createMetricsPlugin()` | Expose Prometheus-style request metrics from the BFF edge | scraping with Prometheus, latency visibility, request volume monitoring |
| `createRequestLoggerPlugin()` | Log request-start events with request metadata | debugging, request tracing, audit-friendly access logs |
| `createRateLimitPlugin()` | Enforce request ceilings with memory or Redis-backed stores | burst protection, per-user throttling, internal API safety rails |
| `createOptionsStaticPlugin()` | Register the `static` option source into an empty registry | static enums, local select options, bootstrap datasets |
| `createOptionsHttpPlugin()` | Register the `http` option source into an empty registry | remote options, upstream dictionaries, backend-driven selects |

## Architecture

`humming` is intentionally simple:

```text
client
  -> humming core
    -> built-in health / options / forward
    -> official or custom plugins
      -> local routes
      -> middleware
      -> option sources
      -> forward hooks
    -> upstream services
```

## Examples

- `examples/basic`: smallest useful app with core built-ins only
- `examples/with-plugins`: auth, metrics, rate-limit, cache, options, and a custom plugin route
- `examples/with-forward`: forwarding plus request and response hooks
- `examples/with-async-plugin`: `createApp()` plus async plugin setup

Run them:

```bash
bun run example:basic
bun run example:with-plugins
bun run example:with-forward
bun run example:with-async-plugin
```

## What Lives In Core

Core is intentionally narrow:

- request context and correlation ids
- consistent error handling
- `GET /health`
- `GET /api/options`
- `POST /api/options`
- forward terminal
- plugin registration and shared services

Anything business-specific or operationally optional should prefer a plugin.

## Create A Basic App

```ts
import { Bun } from 'bun';
import { createAppSync, parseEnv } from 'humming';

const env = parseEnv({
  ...Bun.env,
  PORT: '8787',
  FORWARD_ENABLED: 'false',
});

const app = createAppSync({
  env,
  builtins: {
    health: true,
    options: true,
    forward: false,
  },
});

Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});
```

## Create An App With Plugins

```ts
import { Bun } from 'bun';
import { Hono } from 'hono';
import {
  createAuthPlugin,
  createAppSync,
  createCachePlugin,
  createCorsPlugin,
  createMetricsPlugin,
  createRateLimitPlugin,
  createRequestLoggerPlugin,
  definePlugin,
  mapArrayToOptions,
  parseEnv,
} from 'humming';

const env = parseEnv({
  ...Bun.env,
  PORT: '8788',
  FORWARD_ENABLED: 'false',
  OPTIONS_CONFIG: JSON.stringify({
    teams: {
      type: 'memory',
      items: [
        { id: 'eng', name: 'Engineering' },
        { id: 'design', name: 'Design' },
      ],
    },
  }),
});

const memoryOptionsPlugin = definePlugin({
  name: 'memory-options',
  setup({ route, services }) {
    let helloHits = 0;

    services.options.registerSource('memory', async ({ rule }) => {
      const items = Array.isArray(rule.items) ? rule.items : [];
      return mapArrayToOptions(items, 'id', 'name');
    });

    const routes = new Hono();
    routes.get('/api/hello', (c) =>
      c.json({
        result: true,
        data: {
          message: 'hello from plugin route',
          hits: ++helloHits,
        },
      })
    );
    route('/', routes);
  },
});

const app = createAppSync({
  env,
  builtins: {
    health: true,
    options: true,
    forward: false,
  },
  plugins: [
    createRequestLoggerPlugin(),
    createAuthPlugin({
      publicPaths: ['/health', '/metrics', '/api/options*'],
      validate({ token }) {
        return token === 'demo-token';
      },
    }),
    createMetricsPlugin(),
    createRateLimitPlugin({
      includePaths: ['/api/hello'],
      limit: 2,
      windowMs: 10_000,
      key({ context }) {
        return context.req.header('authorization') ?? 'anonymous';
      },
    }),
    createCachePlugin({
      includePaths: ['/api/hello'],
      ttlMs: 30_000,
    }),
    createCorsPlugin({
      exposeHeaders: [
        'x-correlation-id',
        'x-humming-cache',
        'ratelimit-limit',
        'ratelimit-remaining',
        'ratelimit-reset',
        'retry-after',
      ],
    }),
    memoryOptionsPlugin,
  ],
});

Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});
```

## Create A Plugin

Plugins receive a compact context:

- `app`: the underlying Hono app
- `env`: parsed runtime env
- `logger`: shared app logger
- `services.options`: option source registry
- `services.forwardProxy`: forward hook registration
- `use()` and `route()` helpers

Example:

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

Use it:

```ts
const app = createAppSync({
  env,
  plugins: [helloPlugin],
});
```

Detailed guide:

- `PLUGIN_GUIDE.md`

## Core API

Main exports:

- `createApp()`: async app creation for async plugins
- `createAppSync()`: sync app creation for sync plugins
- `definePlugin()`: typed helper for plugin authoring
- `parseEnv()`: validates runtime config

Built-ins are individually switchable:

```ts
const app = createAppSync({
  env,
  builtins: {
    health: true,
    options: true,
    forward: false,
  },
});
```

## Plugin Notes

### Cache Plugin

`createCachePlugin()` defaults to an in-memory store, which is a good fit for local development and single-instance deployment.

If you need shared cache across instances, inject a Redis-backed store:

```ts
import { createCachePlugin, createRedisCacheStore } from 'humming';

const cacheStore = createRedisCacheStore({
  url: Bun.env.REDIS_URL,
  prefix: 'humming:prod',
});

const app = createAppSync({
  env,
  plugins: [
    createCachePlugin({
      includePaths: ['/api/catalog*'],
      ttlMs: 15_000,
      store: cacheStore,
    }),
  ],
});
```

Available store helpers:

- `createMemoryCacheStore()`
- `createRedisCacheStore()`

### Metrics Plugin

`createMetricsPlugin()` collects request totals, in-flight requests, and latency histograms, then exposes them through a Prometheus-compatible endpoint.

```ts
import { createMetricsPlugin } from 'humming';

const app = createAppSync({
  env,
  plugins: [
    createMetricsPlugin({
      path: '/metrics',
      labelPath({ path }) {
        if (path.startsWith('/api/users/')) {
          return '/api/users/:id';
        }

        return path;
      },
    }),
  ],
});
```

Default endpoint:

- `GET /metrics`

### Rate Limit Plugin

`createRateLimitPlugin()` defaults to an in-memory fixed-window limiter and can also use Redis for shared limits.

```ts
import { createRateLimitPlugin, createRedisRateLimitStore } from 'humming';

const rateLimitStore = createRedisRateLimitStore({
  url: Bun.env.REDIS_URL,
  prefix: 'humming:prod',
});

const app = createAppSync({
  env,
  plugins: [
    createRateLimitPlugin({
      includePaths: ['/api/search*'],
      limit: 30,
      windowMs: 60_000,
      store: rateLimitStore,
      key({ context }) {
        return context.req.header('authorization') ?? 'anonymous';
      },
    }),
  ],
});
```

Available store helpers:

- `createMemoryRateLimitStore()`
- `createRedisRateLimitStore()`

## Options Registry

`options` is registry-based.

Built-in source types:

- `static`
- `http`

You can register your own source type:

```ts
services.options.registerSource('memory', async ({ rule }) => {
  const items = Array.isArray(rule.items) ? rule.items : [];
  return mapArrayToOptions(items, 'id', 'name');
});
```

Config uses `type`:

```json
{
  "teams": {
    "type": "memory",
    "items": [
      { "id": "eng", "name": "Engineering" }
    ]
  }
}
```

Legacy `source` is still accepted and normalized to `type`.

## Forward Hooks

`forward` stays in core, but the behavior around it is hookable.

Available hook registration methods:

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

Runnable example:

- `examples/with-forward`

## Environment

Main environment variables:

- `PORT`: app port, default `8787`
- `LOG_LEVEL`: pino level, default `info`
- `OPTIONS_CONFIG`: JSON string for option rules
- `FORWARD_ENABLED`: enable or disable forward terminal
- `FORWARD_TIMEOUT_MS`: upstream timeout in milliseconds
- `FORWARD_BLOCK_PRIVATE_IP`: block localhost and private forward targets
- `FORWARD_FALLBACK_TARGET`: optional fallback upstream target
- `FORWARD_RULES`: JSON string forward rules array

Example forward rules:

```json
[
  {
    "prefix": "/api/backend",
    "target": "https://backend.example.com",
    "stripPrefix": true,
    "allowedMethods": ["GET", "POST"]
  }
]
```

## Development

Run the default app:

```bash
bun run dev
```

Run tests:

```bash
bun test
```

Run typecheck:

```bash
bun run typecheck
```

Release prep:

- `RELEASE_CHECKLIST.md`
- `CHANGELOG.md`
- `RELEASE_NOTES_v0.1.0.md`

## Repository Structure

- `src/core`: app runtime and plugin model
- `src/options`: option registry, providers, routes
- `src/forward`: forward proxy and hooks
- `src/plugins`: official plugins
- `examples`: runnable examples
- `PLUGIN_GUIDE.md`: plugin authoring guide
- `RELEASE_CHECKLIST.md`: first-release and publish checklist
- `CHANGELOG.md`: project change history
- `RELEASE_NOTES_v0.1.0.md`: first GitHub release notes draft

## Brand Assets

- Brand guide: `assets/brand/README.md`
- Primary logo: `assets/brand/humming-logo.svg`
- Mark icon: `assets/brand/humming-mark.svg`

## License

Dual-licensed under MIT or Apache-2.0.

- `LICENSE-MIT`
- `LICENSE-APACHE`
