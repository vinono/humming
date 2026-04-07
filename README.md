# humming

`humming` is a plugin-first lightweight BFF kernel built with Bun, Hono, zod, and pino.

It is for frontend teams and small platform teams that want a thin, explicit BFF layer without moving into a heavyweight backend framework or API gateway.

## Why humming

- keep the core small and predictable
- keep `health` in core as an operational baseline
- make business behavior easy to add as plugins
- support local routes, option endpoints, and backend forwarding in one place
- make extension points explicit instead of hiding them in framework magic

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

## Install

Prerequisites:

- Bun
- Node-compatible TypeScript tooling

Install dependencies:

```bash
bun install
```

## Quick Start

Run the minimal example:

```bash
bun run example:basic
```

Then try:

```bash
curl http://localhost:8787/health
curl "http://localhost:8787/api/options?keys=status"
```

Run the plugin example:

```bash
bun run example:with-plugins
```

Then try:

```bash
curl http://localhost:8788/health
curl http://localhost:8788/api/hello
curl "http://localhost:8788/api/options?keys=teams,countries"
```

Run the forward example:

```bash
bun run example:with-forward
```

Then try:

```bash
curl http://localhost:8789/health
curl -i "http://localhost:8789/api/backend/ping?name=humming"
```

## Examples

- `examples/basic`: smallest useful app with core built-ins only
- `examples/with-plugins`: official plugins plus one custom plugin
- `examples/with-forward`: forwarding plus request/response hooks

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
  createAppSync,
  createCorsPlugin,
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
    services.options.registerSource('memory', async ({ rule }) => {
      const items = Array.isArray(rule.items) ? rule.items : [];
      return mapArrayToOptions(items, 'id', 'name');
    });

    const routes = new Hono();
    routes.get('/api/hello', (c) => c.json({ ok: true }));
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
    createCorsPlugin(),
    createRequestLoggerPlugin(),
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

## Official Plugins

Current official plugins in this repository:

- `createCorsPlugin()`
- `createRequestLoggerPlugin()`
- `createOptionsStaticPlugin()`
- `createOptionsHttpPlugin()`

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
- `FORWARD_BLOCK_PRIVATE_IP`: block localhost/private forward targets
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

## Repository Structure

- `src/core`: app runtime and plugin model
- `src/options`: option registry, providers, routes
- `src/forward`: forward proxy and hooks
- `src/plugins`: official plugins
- `examples`: runnable examples

## Brand Assets

- Brand guide: `assets/brand/README.md`
- Primary logo: `assets/brand/humming-logo.svg`
- Mark icon: `assets/brand/humming-mark.svg`

## License

Dual-licensed under MIT or Apache-2.0.

- `LICENSE-MIT`
- `LICENSE-APACHE`
