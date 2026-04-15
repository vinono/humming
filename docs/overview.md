# Overview

`humming` is a Bun-first, plugin-first lightweight BFF core.

It is designed for frontend teams and small platform teams that want a thin backend layer with clear extension points, not a heavyweight framework and not a full API gateway.

If you want the fastest way to understand the project:

1. read this page for positioning
2. read [the plugin system guide](./plugin-system.md) for extensibility
3. read [the CLI guide](./cli.md) if you want to bootstrap a new app

## The Short Version

`humming` gives you three built-in capabilities:

- `health`
- `options`
- `forward`

Everything else is expected to live in plugins.

That boundary is the most important design rule in the project.

## Where It Fits

`humming` is a good fit when you need:

- a project-level BFF layer
- local routes owned by the frontend or product team
- small option or dictionary endpoints
- controlled upstream forwarding
- request shaping close to the edge
- auth, cache, metrics, and rate limiting as composable add-ons

It is not trying to replace:

- API gateways such as Kong, APISIX, Traefik, or Envoy
- large backend frameworks such as NestJS
- platform-wide service governance infrastructure

## Core Design Principles

### Keep Core Small

Core should stay narrow and explicit.

Today that means:

- request context and error handling
- `GET /health`
- `GET /api/options`
- `POST /api/options`
- forward terminal
- plugin registration and shared services

### Push Optional Behavior To Plugins

Operational or business-specific behavior should prefer plugins:

- auth
- cache
- CORS
- metrics
- rate limiting
- request logging
- project-specific routes

### Prefer Clarity Over Magic

`humming` favors code you can read directly:

- explicit app creation
- explicit plugin lists
- explicit forward rules
- explicit environment parsing

There is no hidden plugin scanning or convention-heavy boot process.

## Mental Model

The runtime shape is intentionally simple:

```text
client
  -> humming core
    -> built-in health / options / forward
    -> plugin routes and middleware
    -> forward hooks
    -> upstream services
```

The plugin system is the main extension layer.

Core gives plugins access to:

- the Hono app instance
- parsed env
- shared logger
- options service
- forward proxy service
- local debug runtime service

## What Makes It Different

Compared with a temporary dev proxy:

- stronger runtime structure
- shared request context
- plugin-friendly extension model
- production-oriented logging and testing

Compared with a heavier backend framework:

- much smaller surface area
- easier to adopt for frontend-owned use cases
- less framework ceremony
- narrower responsibility boundary

## Current Strengths

The project is already strong in a few areas:

- clear built-in/core boundary
- practical official plugins
- forward test coverage for redirects, multipart, streams, large bodies, and status handling
- structured logging
- Bun-first packaging and example coverage
- local scaffold CLI

## Current Non-Goals

`humming` is intentionally not optimized for:

- heavy domain-driven backend applications
- deep controller/service/module hierarchies
- infrastructure-grade gateway management
- broad multi-team policy orchestration

If your system needs those things, `humming` is often better used as a thin edge BFF, not as the full backend platform.

## How To Read The Rest Of The Docs

- [Repository README](../README.md): broad landing page and API surface
- [Plugin System](./plugin-system.md): how extensibility really works
- [CLI](./cli.md): how to scaffold a new app quickly
- [Production](./production.md): operational guidance
- [Plugin Guide](../PLUGIN_GUIDE.md): plugin authoring details and examples
