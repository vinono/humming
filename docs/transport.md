# Transport

This guide explains the transport layer behind `humming` `forward`.

The goal of the transport layer is to keep the forward core small while still giving projects a place to control:

- how upstream requests are executed
- whether retries happen
- how retry delay is calculated
- whether keepalive is enabled explicitly

## Mental Model

`forward` has two layers:

1. rule matching and request shaping
2. transport execution

The first layer decides:

- which rule matched
- how the upstream URL is built
- which headers are forwarded
- which hooks run

The second layer decides:

- how the upstream request is sent
- whether a retry should happen
- how long to wait before retrying

That split is important. Path rules belong in forward rules. Retry and keepalive behavior belong in transports.

## Built-In Transports

`humming` currently ships with three named transport strategies:

- `fetch`
- `keepalive-fetch`
- `retry-fetch`

## `fetch`

`fetch` is the default baseline transport.

Use it when you want:

- the smallest possible behavior surface
- one upstream attempt
- no retry policy
- the clearest request path in debugging

This should stay the default for most routes.

## `keepalive-fetch`

`keepalive-fetch` is the explicit named entry for fetch-based forwarding with `keepalive: true`.

Use it when:

- you want the transport choice to be visible in config and logs
- you want a route or service group to opt into keepalive-oriented behavior explicitly
- you do not want retry logic, only a different transport mode

Do not treat `keepalive-fetch` as a performance silver bullet. It is a transport hint, not a guarantee of end-to-end speedup in every environment.

## `retry-fetch`

`retry-fetch` is the built-in retrying transport.

Use it when:

- the request is idempotent or safe to replay
- the upstream is known to return transient failures
- you want retry behavior to live in transport policy, not in hooks

Do not use it by default for everything.

Be careful with:

- non-idempotent writes
- streamed request bodies
- endpoints with side effects
- systems where duplicate attempts are expensive or dangerous

`retry-fetch` only retries replayable request bodies. That boundary is intentional.

## Where Transport Ends

Transport policy should control:

- attempts
- delay
- backoff
- transient error categories
- retryable statuses

Transport policy should not control:

- path rewriting
- auth logic
- tenant routing
- project-specific request mutation
- business fallback responses

Those concerns belong in rules, hooks, or plugins.

## Rule-Level Selection

You can choose a transport per rule:

```json
[
  {
    "prefix": "/api/search",
    "target": "https://search.example.com",
    "transport": "retry-fetch"
  },
  {
    "prefix": "/api/stream",
    "target": "https://stream.example.com",
    "transport": "keepalive-fetch"
  }
]
```

If a rule does not specify `transport`, `humming` uses `FORWARD_TRANSPORT`.

## Environment Defaults

Main transport-related environment variables:

- `FORWARD_TRANSPORT`
- `FORWARD_TRANSPORT_RETRY_MAX_ATTEMPTS`
- `FORWARD_TRANSPORT_RETRY_DELAY_MS`

These define the default runtime stance.

Recommended baseline:

- keep `FORWARD_TRANSPORT=fetch`
- opt only specific routes into `retry-fetch`
- use `keepalive-fetch` when you want an explicit named keepalive mode

## Retry Policy

`createFetchForwardTransport({ retry })` supports:

- `maxAttempts`
- `delayMs`
- `maxDelayMs`
- `backoff`: `fixed`, `linear`, `exponential`
- `methods`
- `statuses`
- `categories`
- `statusDelayMs`
- `categoryDelayMs`
- `shouldRetry(context)`
- `getDelayMs(context)`

That gives you two levels of control:

1. declarative policy
2. callback overrides

## Retry Context

The retry callbacks receive a context object with:

- the forward request metadata
- current attempt
- max attempts
- whether the body is replayable
- current response or error
- transport error category and code when applicable
- default retry decision
- default delay

That means you can start simple and only override special cases.

## Good Retry Patterns

Good uses:

- retry `503` on catalog reads
- retry `429` with a larger delay
- retry connect and timeout failures for internal idempotent lookups
- exponential backoff for flaky search endpoints

Bad uses:

- retry `POST` writes blindly
- retry login or payment side effects without server-side idempotency
- moving business fallback logic into transport callbacks

## Keepalive Boundaries

`keepalive-fetch` is useful when you want explicit transport naming and a cleaner operational story.

It is not:

- a replacement for proper benchmarking
- a substitute for ingress or upstream tuning
- proof that connection reuse is optimal in every runtime path

Treat it as an explicit transport choice, then measure.

## Custom Transport

If the built-in strategies are not enough, register your own transport:

```ts
import { createForwardProxy } from 'humming';

const forwardProxy = createForwardProxy({
  enabled: true,
  defaultTimeoutMs: 15_000,
  blockPrivateIp: true,
  defaultTransport: 'custom-fetch',
  rulesJson: '[]',
  transports: {
    'custom-fetch': {
      async execute(input) {
        const response = await fetch(input.upstreamUrl, {
          method: input.requestMethod,
          headers: input.headers,
          body: input.body,
          redirect: input.redirect,
          signal: input.signal,
        });

        return {
          response,
          attempts: 1,
        };
      },
    },
  },
});
```

Custom transports are a good fit when you need:

- a shared retry preset
- a custom fetch wrapper
- environment-specific transport behavior
- tighter control over execution policy

## Recommended Strategy

For most teams, the safest order is:

1. default to `fetch`
2. use `keepalive-fetch` where explicit keepalive policy helps
3. use `retry-fetch` only for clearly replayable routes
4. add custom transports only when the built-in ones stop being expressive enough

That keeps transport policy visible, intentional, and easier to debug.
