# with-plugins

`humming` app using official plugins plus one custom plugin.

## Run

```bash
bun run example:with-plugins
```

## What it shows

- `createCorsPlugin()`
- `createRequestLoggerPlugin()`
- custom plugin route registration
- custom option source registration through `services.options.registerSource()`

## Endpoints

- `GET /health`
- `GET /api/hello`
- `GET /api/options?keys=teams,countries`
