<p align="center">
  <img src="./assets/brand/humming-logo-readme.svg" alt="humming logo" width="560" />
</p>

<p align="center"><strong>Plugin-first lightweight BFF core for Bun.</strong></p>

`humming` is a thin BFF kernel for frontend teams and small platform teams that want local routes, options, and upstream forwarding without adopting a heavyweight backend framework or a full API gateway.

Project entry points:

- [Landing page](./index.html)
- [Docs portal](./docs/index.html)
- [Roadmap](./docs/roadmap.md)

## Quick Start

Install dependencies:

```bash
bun install
```

Run the main example:

```bash
bun run example:with-plugins
```

Or scaffold a new app:

```bash
bunx humming init my-bff --template with-plugins
```

Try the default flows:

```bash
curl http://localhost:8788/health
curl http://localhost:8788/metrics
curl "http://localhost:8788/api/options?keys=teams,countries"
curl -i -H "Authorization: Bearer demo-token" http://localhost:8788/api/hello
```

## What You Get

- Bun-first runtime built on Hono
- narrow core: `health`, `options`, `forward`
- plugin-first extension model
- CLI starter templates
- official plugins for common operational behavior
- forward hooks and transport strategies
- explicit startup and runtime observability

## Where It Fits

Good fit:

- project-level BFFs
- frontend-owned edge services
- local routes plus small aggregations
- controlled upstream forwarding
- teams that want explicit runtime behavior

Not trying to be:

- a full API gateway
- a heavy backend application framework
- an all-in-one hidden-convention platform

## Core Model

`humming` keeps core intentionally narrow:

- `GET /health`
- `GET /api/options`
- `POST /api/options`
- forward terminal
- shared request/runtime services

Everything else should prefer plugins.

Minimal app:

```ts
import { createAppSync, parseEnv } from 'humming';

const env = parseEnv({
  ...Bun.env,
  PORT: Bun.env.PORT ?? '8787',
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

Main runtime exports:

- `createApp()`: async app creation
- `createAppSync()`: sync app creation
- `definePlugin()`: plugin authoring helper
- `parseEnv()`: runtime config validation

Both app factories return an app with `fetch`, `request`, and `dispose()`.

## Official Plugins

Current official plugins in this repository:

- `createAuthPlugin()`: bearer or JWT route protection
- `createCachePlugin()`: memory or Redis-backed response caching
- `createCorsPlugin()`: browser-facing CORS handling
- `createMetricsPlugin()`: Prometheus-style request metrics
- `createRequestLoggerPlugin()`: request-start logging
- `createRateLimitPlugin()`: memory or Redis-backed throttling
- `createOptionsStaticPlugin()`: static options provider registration
- `createOptionsHttpPlugin()`: HTTP-backed options provider registration

## Examples

- `examples/basic`: smallest useful app with core built-ins only
- `examples/with-plugins`: auth, cache, metrics, rate limit, options, and a custom route
- `examples/with-forward`: forwarding with request and response hooks
- `examples/with-async-plugin`: async plugin setup with `createApp()`

Run them:

```bash
bun run example:basic
bun run example:with-plugins
bun run example:with-forward
bun run example:with-async-plugin
```

## CLI

Create a new app:

```bash
bunx humming init my-bff
```

Templates:

- `basic`
- `with-plugins`
- `with-forward`

Use `--force` if the target directory already contains files.

## Documentation

Start with the guide that matches your goal:

- [Overview](./docs/overview.md): positioning and architecture boundaries
- [Plugin System](./docs/plugin-system.md): extension model and governance
- [CLI](./docs/cli.md): project scaffolding and templates
- [Transport](./docs/transport.md): retry, keepalive, and custom transport boundaries
- [Production](./docs/production.md): deployment and operational guidance
- [Benchmark](./docs/benchmark.md): local forward performance workflow
- [Plugin Guide](./PLUGIN_GUIDE.md): plugin authoring details and examples
- [Docs README](./docs/README.md): all focused guides in one place

## Development

Useful commands:

```bash
bun run build
bun run test
bun run typecheck
bun run benchmark:forward
```

Static site entry points:

- `./index.html`: landing page
- `./docs/index.html`: docs portal

GitHub Pages:

- `.github/workflows/pages.yml` publishes the static pages
- `bun run build:pages` prepares the `.pages/` artifact

## Status

The project is still early and intentionally opinionated.

- current version: `0.1.0`
- current priorities: [docs/roadmap.md](./docs/roadmap.md)
- current docs focus: plugin maturity, transport clarity, production guidance

## License

Dual-licensed under [MIT](./LICENSE-MIT) and [Apache-2.0](./LICENSE-APACHE).
