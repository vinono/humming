<p align="center">
  <img src="./assets/brand/humming-logo-readme.svg" alt="humming logo" width="560" />
</p>

<p align="center"><strong>Plugin-first lightweight BFF core for Bun.</strong></p>

`humming` is a thin, explicit BFF kernel for frontend teams and small platform teams that want local routes, options, and forwarding without adopting a heavyweight backend framework or full API gateway.

Static site entry points:

- `./index.html`: project landing page
- `./docs/index.html`: documentation entry

GitHub Pages:

- `.github/workflows/pages.yml` publishes the static entry pages
- `bun run build:pages` prepares the deployable `.pages/` artifact
- in repository `Settings -> Pages`, set the source to `GitHub Actions`

## Quick Start

Install dependencies:

```bash
bun install
```

Run the main plugin example:

```bash
bun run example:with-plugins
```

Scaffold a new project:

```bash
bunx humming init my-bff --template with-plugins
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

## Documentation

Start with the guide that matches your goal:

- [Overview](./docs/overview.md): product positioning, architecture, and core boundaries
- [Plugin System](./docs/plugin-system.md): extension model, governance, and plugin strategy
- [CLI](./docs/cli.md): project scaffolding and template usage
- [Transport](./docs/transport.md): transport strategies, retry policy, keepalive, and custom transport guidance
- [Production](./docs/production.md): deployment and runtime guidance
- [Benchmark](./docs/benchmark.md): local forward baseline and performance workflow
- [Plugin Guide](./PLUGIN_GUIDE.md): authoring details and code-level examples

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

## CLI

`humming` also ships a Bun-first project scaffold CLI.

Create a new app:

```bash
bunx humming init my-bff
```

Available templates:

- `basic`
- `with-plugins`
- `with-forward`

Example:

```bash
bunx humming init my-bff --template with-forward
```

If the target directory already contains files, pass `--force`.

## Benchmark

Run the local forward baseline:

```bash
bun run benchmark:forward
```

This benchmark starts a mock upstream and a local `humming` instance, then compares direct upstream requests against forwarded requests for both small JSON and larger binary payloads.

Useful overrides:

- `BENCH_CONCURRENCY`
- `BENCH_SMALL_REQUESTS`
- `BENCH_LARGE_REQUESTS`
- `BENCH_STREAM_REQUESTS`
- `BENCH_LARGE_BYTES`

More detail:

- `docs/benchmark.md`

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
- `dependencies`: other plugin names that must also be enabled
- `conflicts`: plugin names that cannot be enabled at the same time

## Core API

Main exports:

- `createApp()`: async app creation for async plugins
- `createAppSync()`: sync app creation for sync plugins
- `definePlugin()`: typed helper for plugin authoring
- `parseEnv()`: validates runtime config

Entry behavior:

- the package root exports factory functions and types only
- importing `humming` does not create a default app instance
- importing `humming` does not eagerly validate `Bun.env`
- published packages ship compiled ESM in `dist/` plus `.d.ts` declarations
- `src/main.ts` is the repository's local development entrypoint, not part of the public package API

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

Forward logs now split execution timing into `beforeMatch`, `beforeRequest`, `upstream`, `afterResponse`, and `onError`, which makes it easier to separate hook cost from transport cost in local debugging and benchmarks.
Startup logs also include resolved and skipped plugins, so dependency and mode issues are easier to spot before requests start flowing.

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
- `FORWARD_TRANSPORT`: default forward transport strategy, default `fetch`
- `FORWARD_TRANSPORT_RETRY_MAX_ATTEMPTS`: attempts used by the built-in `retry-fetch` strategy
- `FORWARD_TRANSPORT_RETRY_DELAY_MS`: delay between `retry-fetch` attempts in milliseconds

Example forward rules:

```json
[
  {
    "prefix": "/api/backend",
    "target": "https://backend.example.com",
    "transport": "retry-fetch",
    "pathRewrite": "/v2",
    "followRedirect": true,
    "allowedMethods": ["GET", "POST"],
    "requestHeaders": {
      "x-service-name": "humming"
    },
    "responseHeaders": {
      "cache-control": "no-store"
    },
    "acceptStatuses": [200, 201, 404]
  }
]
```

Forward rule fields:

- `prefix`: request path prefix to match
- `target`: upstream base URL
- `transport`: optional named transport strategy; defaults to `FORWARD_TRANSPORT`
- `stripPrefix`: remove the matched prefix before forwarding
- `pathRewrite`: replace the matched prefix with a new path prefix
- `preserveHost`: keep the original `host` header when forwarding
- `followRedirect`: allow Bun `fetch` to follow upstream redirects instead of returning `30x` directly
- `timeoutMs`: override the default forward timeout
- `allowedMethods`: optional method allowlist
- `stripRequestHeaders`: request headers removed before forwarding
- `requestHeaders`: static request headers applied before forward hooks
- `responseHeaders`: static response headers applied before response hooks
- `acceptStatuses`: optional upstream status allowlist; statuses outside the list return `502`

Notes:

- `pathRewrite` is a prefix replacement, so `/api/backend/users` with `pathRewrite: "/v2"` becomes `/v2/users`
- `pathRewrite` cannot be combined with `stripPrefix`
- `preserveHost` is useful when upstream routing depends on the caller host
- built-in transports are `fetch`, `keepalive-fetch`, and `retry-fetch`
- `keepalive-fetch` is the explicit naming entry point when you want outgoing requests to set `keepalive: true`
- `retry-fetch` is intended for idempotent requests and will only retry replayable request bodies
- upstream transport failures are classified into timeout, dns, tls, connect, and generic network errors

## Custom Transport

You can register your own transport strategies when creating the app or the forward proxy.

Example:

```ts
import {
  createFetchForwardTransport,
  createForwardProxy,
  createKeepAliveForwardTransport,
} from 'humming';

const forwardProxy = createForwardProxy({
  enabled: true,
  defaultTimeoutMs: 15_000,
  blockPrivateIp: true,
  defaultTransport: 'hedged-fetch',
  rulesJson: JSON.stringify([
    {
      prefix: '/api/search',
      target: 'https://search.example.com',
      transport: 'retry-fetch',
    },
    {
      prefix: '/api/stream',
      target: 'https://stream.example.com',
      transport: 'keepalive-fetch',
    },
  ]),
  transports: {
    'keepalive-fetch': createKeepAliveForwardTransport(),
    'retry-fetch': createFetchForwardTransport({
      retry: {
        maxAttempts: 3,
        delayMs: 100,
        backoff: 'exponential',
        statuses: [429, 503],
        categoryDelayMs: {
          timeout: 250,
          connect: 150,
        },
      },
    }),
    'hedged-fetch': {
      async execute(input) {
        const response = await fetch(input.upstreamUrl, {
          method: input.requestMethod,
          headers: input.headers,
          body: input.body,
          redirect: input.redirect,
          signal: input.signal,
        });

        return {
          response,
          attempts: 1,
        };
      },
    },
  },
});
```

Retry policy controls available in `createFetchForwardTransport({ retry })`:

- `maxAttempts`
- `delayMs`
- `maxDelayMs`
- `backoff`: `fixed`, `linear`, or `exponential`
- `methods`
- `statuses`
- `categories`
- `statusDelayMs`
- `categoryDelayMs`
- `shouldRetry(context)`
- `getDelayMs(context)`

## Local Debug Runtime

`humming` now exposes a shared in-memory `localDebugRuntime` service so plugins can coordinate local login state, target switching, and cookie injection without each plugin owning a separate file or cache.

Available methods:

- `getRuntimeState()`
- `setRuntimeState()`
- `clearRuntimeState()`

Default state shape:

```ts
{
  loginEnv: null,
  target: null,
  configCenterHost: null,
  tenant: null,
  cookies: {},
  updatedAt: null,
}
```

Typical plugin usage:

```ts
services.localDebugRuntime.setRuntimeState({
  loginEnv: 'daily',
  target: 'https://daily.example.com',
  cookies: {
    session: 'abc',
  },
});
```

## Development

Run the local development entrypoint:

```bash
bun run dev
```

Build the published package artifacts:

```bash
bun run build
```

Smoke test the public package entry:

```bash
bun run test:entry
```

Smoke test package consumption from a fresh Bun project using the packed tarball:

```bash
bun run test:consumer
```

Smoke test the runnable examples:

```bash
bun run test:examples
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
- `CONTRIBUTING.md`
- `docs/production.md`

## Repository Structure

- `src/core`: app runtime and plugin model
- `src/cli`: project scaffold command and templates
- `src/options`: option registry, providers, routes
- `src/forward`: forward proxy and hooks
- `src/runtime`: shared local debug runtime primitives
- `src/plugins`: official plugins
- `examples`: runnable examples
- `docs/README.md`: documentation entrypoint
- `docs/overview.md`: product and architecture overview
- `docs/plugin-system.md`: plugin system overview and design notes
- `docs/cli.md`: scaffold CLI guide
- `docs/production.md`: production deployment guidance
- `PLUGIN_GUIDE.md`: plugin authoring guide
- `CONTRIBUTING.md`: contribution workflow and quality gate
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
