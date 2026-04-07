# with-forward

`humming` app showing built-in forwarding plus plugin hooks.

This example starts two local servers:

- a mock upstream on port `18901`
- the BFF app on port `8789`

## Run

```bash
bun run example:with-forward
```

## What it shows

- built-in forward terminal
- `FORWARD_RULES` with `stripPrefix`
- `services.forwardProxy.registerBeforeRequest()`
- `services.forwardProxy.registerAfterResponse()`

## Try it

```bash
curl http://localhost:8789/health
curl -i "http://localhost:8789/api/backend/ping?name=humming"
```
