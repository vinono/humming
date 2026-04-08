# humming v0.1.0

`humming` is a lightweight, plugin-first BFF core for Bun teams that want a small runtime with explicit extension points.

This first public release focuses on a narrow core:

- `health` stays in core
- `options` stays in core
- `forward` stays in core
- business and operational behavior is added through plugins

## Highlights

- Bun-first lightweight BFF runtime built on Hono
- plugin model with `createApp()`, `createAppSync()`, and `definePlugin()`
- official plugins for auth, cache, metrics, rate limiting, CORS, request logging, and options providers
- examples for basic usage, plugin usage, forwarding, and async plugin setup
- plugin guide and release checklist included in the repository

## Included In v0.1.0

Core:

- request context and correlation ids
- consistent error handling
- `GET /health`
- `GET /api/options`
- `POST /api/options`
- forward terminal with hook support

Official plugins:

- `createAuthPlugin()`
- `createCachePlugin()`
- `createCorsPlugin()`
- `createMetricsPlugin()`
- `createRateLimitPlugin()`
- `createRequestLoggerPlugin()`
- `createOptionsStaticPlugin()`
- `createOptionsHttpPlugin()`

Examples:

- `examples/basic`
- `examples/with-plugins`
- `examples/with-forward`
- `examples/with-async-plugin`

## Notes

- this release is intentionally small and explicit
- `humming` is not trying to replace a full API gateway
- the package is designed around Bun-first usage

## Start Here

- read `README.md`
- run `bun install`
- start `bun run example:with-plugins`
- open `PLUGIN_GUIDE.md` if you want to build custom plugins

## Feedback

Early feedback is especially useful around:

- plugin ergonomics
- Redis-backed operational plugins
- metrics naming and scrape expectations
- what should remain in core versus move into plugins
