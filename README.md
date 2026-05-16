<div align="center">
  <img src="./assets/brand/humming-logo-readme.svg" alt="humming logo" width="560" />
  <br />
  <br />
  <p><b>Plugin-first lightweight BFF core for Bun.</b></p>
  <p>
    <img alt="Bun Version" src="https://img.shields.io/badge/Bun-%3E%3D1.3.0-black?logo=bun&style=flat-square">
    <img alt="License" src="https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg?style=flat-square">
    <img alt="Version" src="https://img.shields.io/badge/Version-0.1.0-brightgreen.svg?style=flat-square">
  </p>
</div>

---

**`humming`** is a thin BFF (Backend For Frontend) kernel designed for frontend teams and small platform teams. It provides local routes, options, and upstream forwarding out-of-the-box, without forcing you to adopt a heavyweight backend framework or a full-blown API gateway.

### 🔗 Project Links

- 🌐 [Landing Page](./index.html)
- 📚 [Documentation Portal](./docs/index.html)

---

## ⚡ Quick Start

### 1. Try an Example

Install dependencies and run the main example:

```bash
bun install
bun run example:with-plugins
```

Test the built-in and custom routes:

```bash
# Core built-ins
curl http://localhost:8788/health
curl http://localhost:8788/metrics
curl "http://localhost:8788/api/options?keys=teams,countries"

# Protected custom route
curl -i -H "Authorization: Bearer demo-token" http://localhost:8788/api/hello
```

### 2. Scaffold a New App

You can generate a new project instantly using our CLI:

```bash
bunx humming init my-bff --template with-plugins
```

---

## 🎯 Why Humming?

### What You Get
- 🚀 **Bun-first runtime** built on top of [Hono](https://hono.dev/)
- 🎯 **Narrow core focus**: strictly handles `health`, `options`, and `forward`
- 🧩 **Plugin-first** extension model for everything else
- 🛠️ **CLI starter templates** to get up and running instantly
- 📦 **Official plugins** for common operational needs (Auth, Cache, Metrics, etc.)
- 🪝 **Forward hooks** and transport strategies
- 📊 **Explicit observability** for startup and runtime

### Where It Fits
✅ **Good Fit**: Project-level BFFs, frontend-owned edge services, local routes + small aggregations, and controlled upstream forwarding.  
❌ **Not Trying to Be**: A full enterprise API gateway, a heavy backend monolithic framework, or an all-in-one hidden-convention platform.

---

## 🧠 Core Model

`humming` keeps its core intentionally narrow:
- `GET /health`
- `GET /api/options`
- `POST /api/options`
- Forward terminal
- Shared request/runtime services

Everything else is delegated to **plugins**.

### Minimal App Example

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

---

## 🔌 Official Plugins

We provide a suite of official plugins out of the box to handle common backend needs:

| Plugin | Description |
| :--- | :--- |
| `createAuthPlugin()` | Bearer or JWT route protection |
| `createCachePlugin()` | Memory or Redis-backed response caching |
| `createCorsPlugin()` | Browser-facing CORS handling |
| `createMetricsPlugin()` | Prometheus-style request metrics |
| `createRequestLoggerPlugin()` | Request-start logging |
| `createRateLimitPlugin()` | Memory or Redis-backed throttling |
| `createOptionsStaticPlugin()` | Static options provider registration |
| `createOptionsHttpPlugin()` | HTTP-backed options provider registration |

---

## 📖 Documentation

Start with the guide that matches your goal:

- 🧭 **[Overview](./docs/overview.md)**: Positioning and architecture boundaries
- 🧩 **[Plugin System](./docs/plugin-system.md)**: Extension model and governance
- 🛠️ **[CLI Guide](./docs/cli.md)**: Project scaffolding and templates
- 🚚 **[Transport](./docs/transport.md)**: Retry, keepalive, and custom transport boundaries
- 🏭 **[Production](./docs/production.md)**: Deployment and operational guidance
- 📊 **[Benchmark](./docs/benchmark.md)**: Local forward performance workflow
- 📝 **[Plugin Guide](./PLUGIN_GUIDE.md)**: Plugin authoring details and examples
- 📚 **[Docs README](./docs/README.md)**: All focused guides in one place

---

## 💻 Development

### Useful Commands

```bash
bun run build             # Build the project
bun run test              # Run tests
bun run typecheck         # Run TypeScript checks
bun run benchmark:forward # Run forwarding benchmarks
```

### Examples Available

You can explore the `examples/` directory for reference implementations:
- `bun run example:basic` - Smallest useful app with core built-ins only
- `bun run example:with-plugins` - Auth, cache, metrics, rate limit, options, and custom routes
- `bun run example:with-forward` - Forwarding with request and response hooks
- `bun run example:with-async-plugin` - Async plugin setup with `createApp()`

### Static Site

- `.github/workflows/pages.yml` publishes the static pages
- `bun run build:pages` prepares the `.pages/` artifact for GitHub Pages

---

## 📌 Status

> **⚠️ Early Preview (v0.1.0)**  
> The project is currently in its early stages and is intentionally opinionated. Our current focus is on plugin maturity, transport clarity, and production guidance. 

## ⚖️ License

Dual-licensed under [MIT](./LICENSE-MIT) and [Apache-2.0](./LICENSE-APACHE).
