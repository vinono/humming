# with-plugins

`humming` app using official plugins plus one custom plugin.

## Run

```bash
bun run example:with-plugins
```

## What it shows

- `createCorsPlugin()`
- `createRequestLoggerPlugin()`
- `createAuthPlugin()`
- `createMetricsPlugin()`
- `createRateLimitPlugin()`
- `createCachePlugin()`
- custom plugin route registration
- custom option source registration through `services.options.registerSource()`
- default in-memory cache, with Redis store support available in core exports

## Endpoints

- `GET /health`
- `GET /metrics`
- `GET /api/hello`
- `GET /api/options?keys=teams,countries`

## Try it

```bash
curl http://localhost:8788/health
curl http://localhost:8788/metrics
curl "http://localhost:8788/api/options?keys=teams,countries"
curl -i -H "Authorization: Bearer demo-token" http://localhost:8788/api/hello
curl -i -H "Authorization: Bearer demo-token" http://localhost:8788/api/hello
curl -i -H "Authorization: Bearer demo-token" http://localhost:8788/api/hello
```

The second `/api/hello` response should return `x-humming-cache: HIT`.
The third `/api/hello` response within 10 seconds should return `429` with rate-limit headers.
