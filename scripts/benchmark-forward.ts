import { createAppSync, parseEnv } from '../index';
import { logger } from '../src/logger';

type ScenarioDefinition = {
  name: string;
  url: string;
  requests: number;
  concurrency: number;
};

type ScenarioResult = {
  name: string;
  requests: number;
  concurrency: number;
  totalMs: number;
  reqPerSec: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
};

const DEFAULT_CONCURRENCY = 40;
const DEFAULT_SMALL_REQUESTS = 2_000;
const DEFAULT_LARGE_REQUESTS = 400;
const DEFAULT_STREAM_REQUESTS = 1_000;
const DEFAULT_LARGE_BYTES = 512 * 1024;
const DEFAULT_WARMUP_REQUESTS = 200;
const PORT_RETRY_COUNT = 200;
const RANDOM_PORT_MIN = 30_000;
const RANDOM_PORT_SPAN = 20_000;

function readNumberEnv(name: string, fallback: number) {
  const rawValue = Bun.env[name];
  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return Math.floor(value);
}

function buildLargePayload(size: number) {
  const payload = new Uint8Array(size);

  for (let index = 0; index < payload.length; index += 1) {
    payload[index] = index % 251;
  }

  return payload;
}

function createStreamPayload() {
  const encoder = new TextEncoder();
  const chunks = [
    'event: ready\n',
    'data: {"step":1,"source":"benchmark-upstream"}\n\n',
    'event: update\n',
    'data: {"step":2,"status":"ok"}\n\n',
    'event: done\n',
    'data: {"step":3,"complete":true}\n\n',
  ];

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function formatScenario(result: ScenarioResult) {
  return [
    result.name.padEnd(16),
    String(result.requests).padStart(8),
    String(result.concurrency).padStart(6),
    `${result.totalMs.toFixed(2)}ms`.padStart(12),
    `${result.reqPerSec.toFixed(2)}`.padStart(12),
    `${result.avgMs.toFixed(2)}`.padStart(10),
    `${result.p50Ms.toFixed(2)}`.padStart(10),
    `${result.p95Ms.toFixed(2)}`.padStart(10),
    `${result.p99Ms.toFixed(2)}`.padStart(10),
  ].join(' ');
}

async function consumeResponse(response: Response) {
  const body = await response.arrayBuffer();
  return body.byteLength;
}

async function runScenario(definition: ScenarioDefinition): Promise<ScenarioResult> {
  const durations = new Array<number>(definition.requests);
  let nextIndex = 0;

  const startAt = performance.now();

  async function worker() {
    while (true) {
      const requestIndex = nextIndex;
      nextIndex += 1;

      if (requestIndex >= definition.requests) {
        return;
      }

      const requestStartAt = performance.now();
      const response = await fetch(definition.url);
      await consumeResponse(response);

      if (!response.ok) {
        throw new Error(`${definition.name} returned HTTP ${response.status}`);
      }

      durations[requestIndex] = performance.now() - requestStartAt;
    }
  }

  await Promise.all(Array.from({ length: definition.concurrency }, () => worker()));

  const totalMs = performance.now() - startAt;
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);

  return {
    name: definition.name,
    requests: definition.requests,
    concurrency: definition.concurrency,
    totalMs: round(totalMs),
    reqPerSec: round((definition.requests / totalMs) * 1_000),
    avgMs: round(totalDuration / definition.requests),
    p50Ms: round(percentile(durations, 0.5)),
    p95Ms: round(percentile(durations, 0.95)),
    p99Ms: round(percentile(durations, 0.99)),
  };
}

async function warmup(url: string, requests: number, concurrency: number) {
  await runScenario({
    name: 'warmup',
    url,
    requests,
    concurrency,
  });
}

function printComparison(
  label: string,
  directResult: ScenarioResult | undefined,
  forwardResult: ScenarioResult | undefined
) {
  if (!directResult || !forwardResult) {
    return;
  }

  const throughputDelta = round(((forwardResult.reqPerSec - directResult.reqPerSec) / directResult.reqPerSec) * 100);
  const p95Delta = round(forwardResult.p95Ms - directResult.p95Ms);
  const avgDelta = round(forwardResult.avgMs - directResult.avgMs);

  console.log(
    `${label}: throughput ${throughputDelta >= 0 ? '+' : ''}${throughputDelta}% | avg ${avgDelta >= 0 ? '+' : ''}${avgDelta}ms | p95 ${p95Delta >= 0 ? '+' : ''}${p95Delta}ms`
  );
}

function startUpstream(port: number, largePayload: Uint8Array) {
  return Bun.serve({
    port,
    fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === '/small') {
        return Response.json({
          result: true,
          source: 'benchmark-upstream',
          data: {
            ok: true,
            path: url.pathname,
            query: url.searchParams.toString(),
          },
        });
      }

      if (url.pathname === '/large') {
        return new Response(largePayload, {
          status: 200,
          headers: {
            'content-type': 'application/octet-stream',
            'content-length': String(largePayload.length),
          },
        });
      }

      if (url.pathname === '/stream') {
        return new Response(createStreamPayload(), {
          status: 200,
          headers: {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-store',
          },
        });
      }

      return new Response('not found', { status: 404 });
    },
  });
}

function randomHighPort() {
  return RANDOM_PORT_MIN + Math.floor(Math.random() * RANDOM_PORT_SPAN);
}

function startWithRetry<T>(startPort: number, factory: (port: number) => T): { value: T; port: number } {
  let lastError: unknown;

  for (let offset = 0; offset < PORT_RETRY_COUNT; offset += 1) {
    const port = startPort + offset;

    try {
      return {
        value: factory(port),
        port,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to allocate benchmark port');
}

async function main() {
  logger.level = 'silent';

  const concurrency = readNumberEnv('BENCH_CONCURRENCY', DEFAULT_CONCURRENCY);
  const smallRequests = readNumberEnv('BENCH_SMALL_REQUESTS', DEFAULT_SMALL_REQUESTS);
  const largeRequests = readNumberEnv('BENCH_LARGE_REQUESTS', DEFAULT_LARGE_REQUESTS);
  const streamRequests = readNumberEnv('BENCH_STREAM_REQUESTS', DEFAULT_STREAM_REQUESTS);
  const largeBytes = readNumberEnv('BENCH_LARGE_BYTES', DEFAULT_LARGE_BYTES);
  const warmupRequests = readNumberEnv('BENCH_WARMUP_REQUESTS', DEFAULT_WARMUP_REQUESTS);
  const upstreamStartPort = Bun.env.BENCH_UPSTREAM_PORT
    ? readNumberEnv('BENCH_UPSTREAM_PORT', 1)
    : randomHighPort();
  const largePayload = buildLargePayload(largeBytes);

  const upstreamRuntime = startWithRetry(upstreamStartPort, (port) => startUpstream(port, largePayload));
  const upstreamServer = upstreamRuntime.value;
  const upstreamPort = upstreamRuntime.port;

  let forwardServer: ReturnType<typeof Bun.serve> | undefined;

  try {
    const forwardStartPort = Bun.env.BENCH_FORWARD_PORT
      ? readNumberEnv('BENCH_FORWARD_PORT', 1)
      : randomHighPort();
    const forwardRuntime = startWithRetry(forwardStartPort, (port) => {
      const env = parseEnv({
        NODE_ENV: 'production',
        PORT: String(port),
        LOG_LEVEL: 'silent',
        FORWARD_ENABLED: 'true',
        FORWARD_BLOCK_PRIVATE_IP: 'false',
        FORWARD_RULES: JSON.stringify([
          {
            prefix: '/proxy',
            target: `http://127.0.0.1:${upstreamPort}`,
            stripPrefix: true,
            allowedMethods: ['GET'],
          },
        ]),
      });

      const app = createAppSync({
        env,
        builtins: {
          health: true,
          options: false,
          forward: true,
        },
      });

      return Bun.serve({
        port,
        fetch: app.fetch,
      });
    });

    forwardServer = forwardRuntime.value;
    const forwardPort = forwardRuntime.port;

    const directSmallUrl = `http://127.0.0.1:${upstreamPort}/small`;
    const forwardSmallUrl = `http://127.0.0.1:${forwardPort}/proxy/small`;
    const directLargeUrl = `http://127.0.0.1:${upstreamPort}/large`;
    const forwardLargeUrl = `http://127.0.0.1:${forwardPort}/proxy/large`;
    const directStreamUrl = `http://127.0.0.1:${upstreamPort}/stream`;
    const forwardStreamUrl = `http://127.0.0.1:${forwardPort}/proxy/stream`;

    console.log('forward benchmark');
    console.log(`upstream: http://127.0.0.1:${upstreamPort}`);
    console.log(`humming:  http://127.0.0.1:${forwardPort}`);
    console.log(
      `settings: concurrency=${concurrency}, smallRequests=${smallRequests}, largeRequests=${largeRequests}, streamRequests=${streamRequests}, largeBytes=${largeBytes}`
    );
    console.log('');

    await warmup(directSmallUrl, Math.min(warmupRequests, smallRequests), concurrency);
    await warmup(forwardSmallUrl, Math.min(warmupRequests, smallRequests), concurrency);
    await warmup(directLargeUrl, Math.min(Math.max(20, Math.floor(warmupRequests / 4)), largeRequests), concurrency);
    await warmup(forwardLargeUrl, Math.min(Math.max(20, Math.floor(warmupRequests / 4)), largeRequests), concurrency);
    await warmup(directStreamUrl, Math.min(Math.max(40, Math.floor(warmupRequests / 2)), streamRequests), concurrency);
    await warmup(forwardStreamUrl, Math.min(Math.max(40, Math.floor(warmupRequests / 2)), streamRequests), concurrency);

    const results = [
      await runScenario({
        name: 'direct-small',
        url: directSmallUrl,
        requests: smallRequests,
        concurrency,
      }),
      await runScenario({
        name: 'forward-small',
        url: forwardSmallUrl,
        requests: smallRequests,
        concurrency,
      }),
      await runScenario({
        name: 'direct-large',
        url: directLargeUrl,
        requests: largeRequests,
        concurrency,
      }),
      await runScenario({
        name: 'forward-large',
        url: forwardLargeUrl,
        requests: largeRequests,
        concurrency,
      }),
      await runScenario({
        name: 'direct-stream',
        url: directStreamUrl,
        requests: streamRequests,
        concurrency,
      }),
      await runScenario({
        name: 'forward-stream',
        url: forwardStreamUrl,
        requests: streamRequests,
        concurrency,
      }),
    ];

    console.log('scenario             reqs   conc    total(ms)        req/s     avg(ms)     p50(ms)     p95(ms)     p99(ms)');
    for (const result of results) {
      console.log(formatScenario(result));
    }

    console.log('');
    printComparison(
      'small payload',
      results.find((result) => result.name === 'direct-small'),
      results.find((result) => result.name === 'forward-small')
    );
    printComparison(
      'large payload',
      results.find((result) => result.name === 'direct-large'),
      results.find((result) => result.name === 'forward-large')
    );
    printComparison(
      'stream payload',
      results.find((result) => result.name === 'direct-stream'),
      results.find((result) => result.name === 'forward-stream')
    );
    console.log('');
    console.log('note: this is a local baseline for Bun fetch + humming forward, not a production load-test substitute.');
  } finally {
    forwardServer?.stop(true);
    upstreamServer.stop(true);
  }
}

await main();
