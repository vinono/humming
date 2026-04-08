# Changelog

All notable changes to `humming` will be documented in this file.

The format is based on Keep a Changelog.

## [0.1.0] - Pending First Public Release

### Added

- plugin-first lightweight BFF core built on Bun and Hono
- core runtime with `createApp()`, `createAppSync()`, and `definePlugin()`
- built-in `health`, `options`, and `forward` capabilities
- options registry with built-in `static` and `http` source types
- forward proxy with route matching, fallback target support, timeout handling, private IP blocking, and hooks
- official plugins:
  - `createAuthPlugin()`
  - `createCachePlugin()`
  - `createCorsPlugin()`
  - `createMetricsPlugin()`
  - `createRateLimitPlugin()`
  - `createRequestLoggerPlugin()`
  - `createOptionsStaticPlugin()`
  - `createOptionsHttpPlugin()`
- JWT auth, role-based access control, and request user context support
- cache store abstraction with in-memory and Redis-backed implementations
- rate-limit store abstraction with in-memory and Redis-backed implementations
- Prometheus-style metrics endpoint with request counters, in-flight gauge, and latency histogram
- runnable examples:
  - `examples/basic`
  - `examples/with-plugins`
  - `examples/with-forward`
  - `examples/with-async-plugin`
- `PLUGIN_GUIDE.md` for plugin authoring
- GitHub Actions CI for install, typecheck, and test
- dual license support under `MIT OR Apache-2.0`

### Notes

- the project is currently Bun-first
- the first public release is intentionally scoped as a lightweight BFF core, not a full API gateway or backend platform
