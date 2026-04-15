# Production Guide

This guide covers the operational edges of running `humming` in real environments.

`humming` is intentionally small. The goal is not to replace a full API gateway, but to provide a clear Bun-first BFF layer with explicit extension points.

## Recommended Deployment Model

`humming` works best when it sits between frontend clients and upstream services:

- local routes for BFF-specific endpoints
- `options` for frontend dictionaries and select data
- `forward` for controlled upstream proxying
- plugins for auth, cache, rate limiting, metrics, and logging

Recommended shape:

```text
browser / frontend
  -> reverse proxy or ingress
    -> humming
      -> upstream APIs
```

## Environment Variables

Main runtime variables:

- `PORT`
- `LOG_LEVEL`
- `OPTIONS_CONFIG`
- `FORWARD_ENABLED`
- `FORWARD_TIMEOUT_MS`
- `FORWARD_BLOCK_PRIVATE_IP`
- `FORWARD_FALLBACK_TARGET`
- `FORWARD_RULES`
- `FORWARD_TRANSPORT`
- `FORWARD_TRANSPORT_RETRY_MAX_ATTEMPTS`
- `FORWARD_TRANSPORT_RETRY_DELAY_MS`

Use `parseEnv()` at process start so invalid configuration fails early.

## Reverse Proxy And Real Client IP

If you run behind Nginx, Caddy, a cloud load balancer, or another ingress layer:

- forward the original host
- forward the original protocol
- forward the client IP headers consistently

The default rate-limit key logic checks:

- authenticated user id
- `x-forwarded-for`
- `cf-connecting-ip`
- `x-real-ip`
- `authorization`

That means proxy configuration matters. If your environment uses different headers or trust boundaries, pass a custom `key()` function to `createRateLimitPlugin()`.

## Auth Guidance

For production auth:

- prefer JWT or a strong upstream validation function
- keep public paths narrow and explicit
- apply role rules only where needed
- do not trust client-supplied role headers directly

If routes require stronger identity integration, keep the core small and put provider-specific behavior in a plugin.

## Cache Guidance

The in-memory cache is useful for:

- local development
- single-instance deployments
- short-lived demos

For shared deployments, use `createRedisCacheStore()` so cache state survives across instances.

Also consider:

- only cache idempotent endpoints
- avoid caching responses that set cookies
- use short TTLs first
- make cache keys include request shape that changes output

## Rate Limit Guidance

The in-memory rate limiter is good for:

- local development
- single-instance deployments

For horizontally scaled services, use `createRedisRateLimitStore()`.

Choose keys carefully:

- user id for authenticated APIs
- tenant id for tenant isolation
- client IP only when your proxy setup is trustworthy

## Metrics And Logging

`createMetricsPlugin()` exposes a Prometheus-style endpoint that is suitable for scraping.

Recommended production pattern:

- expose `/metrics` only to internal networks or trusted scrapers
- keep request logs structured
- use forward phase timing logs to separate hook cost from upstream latency
- align scrape labels and route labels with your monitoring conventions

If you need a shared telemetry standard across many services, keep `humming` as the transport edge and layer your own telemetry plugin conventions on top.

## Forwarding Safety

`forward` is powerful, so treat it as a controlled feature.

Recommendations:

- keep `FORWARD_BLOCK_PRIVATE_IP=true` unless you explicitly need internal targets
- prefer explicit `FORWARD_RULES`
- use method allowlists
- use `pathRewrite` when you need stable upstream paths instead of per-hook rewrites
- use `preserveHost` only when the upstream actually needs the caller host
- use `followRedirect` only when you want upstream redirect hops to be hidden from the caller
- use `keepalive-fetch` when you want an explicit keepalive-oriented transport name without adding custom transport code
- use `transport: "retry-fetch"` only for idempotent routes where a second attempt is acceptable
- use `stripRequestHeaders` to remove auth or tenant headers you do not want to pass through
- use `requestHeaders` and `responseHeaders` for simple static transforms
- use `acceptStatuses` when specific non-2xx upstream statuses should pass through
- keep timeouts low and intentional
- tune retry behavior at the transport layer with status/category delays and backoff before adding rule-specific workarounds
- use hooks for small request or response shaping, not large business logic
- prefer `FORWARD_TRANSPORT=fetch` as the default and opt specific retry cases into `retry-fetch`
- watch transport error categories in logs to separate dns, tls, connect, timeout, and generic network failures

When local debug behavior exists:

- keep local login and environment-switch state in `services.localDebugRuntime`
- let plugins treat that runtime as shared state instead of duplicating file reads
- mark requests that apply local debug behavior so forward logs can show whether debug runtime was involved

If you disable private IP blocking, understand that you are taking responsibility for SSRF-style risk management in your environment.

## Performance Baseline

Before changing `forward` semantics or transport behavior, capture a local baseline:

- run `bun run benchmark:forward`
- compare direct upstream and forwarded req/s
- compare `p95` and `p99` latency for small and large payloads

This benchmark is intentionally local and simple. Use it to catch regressions in `humming` itself, not as a substitute for environment-specific load testing.

If you want a repeatable workflow and tuning notes, see `docs/benchmark.md`.

## Deployment Checklist

Before production rollout:

- run `bun run build`
- run `bun run test:entry`
- run `bun run test:consumer`
- run `bun run test:examples`
- run `bun run test`
- confirm auth public paths are correct
- confirm rate-limit keys match your proxy setup
- confirm cache scope and TTL are safe
- confirm metrics exposure is internal-only
- confirm forward rules target only expected upstreams

## What To Keep Out Of Core

As you scale deployments, resist the urge to move environment-specific logic into core.

Prefer plugins for:

- identity provider integrations
- tracing conventions
- Redis client lifecycle management
- tenant-specific routing rules
- business-specific request shaping

That keeps `humming` useful as a small BFF kernel instead of turning it into a heavy framework.
