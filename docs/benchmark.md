# Benchmark Guide

This repository includes a local `forward` benchmark:

```bash
bun run benchmark:forward
```

The script starts:

- a mock upstream server
- a local `humming` instance with `forward` enabled

Then it compares direct upstream requests with forwarded requests across three scenarios:

- `small`: small JSON payload
- `large`: larger binary payload
- `stream`: chunked text/event-stream style response

## Output

The benchmark prints:

- total time
- requests per second
- average latency
- `p50`
- `p95`
- `p99`

It also prints a compact direct-vs-forward comparison for each scenario.

Example shape:

```text
scenario             reqs   conc    total(ms)        req/s     avg(ms)     p50(ms)     p95(ms)     p99(ms)
direct-small          200     20       4.64ms     43065.93       0.45       0.36       0.98       0.98
forward-small         200     20      14.27ms     14012.72       1.40       1.31       2.38       2.46
```

## Useful Env Vars

- `BENCH_CONCURRENCY`
- `BENCH_SMALL_REQUESTS`
- `BENCH_LARGE_REQUESTS`
- `BENCH_STREAM_REQUESTS`
- `BENCH_LARGE_BYTES`
- `BENCH_WARMUP_REQUESTS`
- `BENCH_UPSTREAM_PORT`
- `BENCH_FORWARD_PORT`

Example:

```bash
BENCH_CONCURRENCY=20 \
BENCH_SMALL_REQUESTS=200 \
BENCH_LARGE_REQUESTS=60 \
BENCH_STREAM_REQUESTS=120 \
bun run benchmark:forward
```

## How To Use It

Use this benchmark as a local regression baseline when:

- changing `forward` semantics
- changing hook behavior
- changing request/response header handling
- changing transport-related code

Good practice:

1. run it before your change
2. run it after your change
3. compare throughput and `p95`/`p99`

## What It Is Not

This is not a substitute for production load testing.

It does not model:

- real network latency
- TLS
- ingress/proxy layers
- multi-instance deployments
- real upstream contention

Treat it as a fast local signal for `humming` regressions, not a final capacity number.
