import {
  type AppBindings,
  createAuthPlugin,
  createAppSync,
  createCachePlugin,
  createCorsPlugin,
  createMetricsPlugin,
  createRateLimitPlugin,
  createRequestLoggerPlugin,
  definePlugin,
  mapArrayToOptions,
  parseEnv,
} from '../../index';
import { Hono } from 'hono';

const env = parseEnv({
  ...Bun.env,
  PORT: Bun.env.PORT ?? '8788',
  FORWARD_ENABLED: Bun.env.FORWARD_ENABLED ?? 'false',
  OPTIONS_CONFIG:
    Bun.env.OPTIONS_CONFIG ??
    JSON.stringify({
      teams: {
        type: 'memory',
        items: [
          { id: 'eng', name: 'Engineering' },
          { id: 'design', name: 'Design' },
        ],
      },
      countries: {
        type: 'static',
        items: [
          { value: 'CN', label: 'China' },
          { value: 'US', label: 'United States' },
        ],
      },
    }),
});

const memoryOptionsPlugin = definePlugin({
  name: 'memory-options',
  setup({ route, services }) {
    let helloHits = 0;

    services.options.registerSource('memory', async ({ rule }) => {
      const items = Array.isArray(rule.items) ? rule.items : [];
      return mapArrayToOptions(items, 'id', 'name');
    });

    const routes = new Hono<AppBindings>();
    routes.get('/api/hello', (c) => {
      helloHits += 1;

      return c.json({
        result: true,
        data: {
          message: 'hello from plugin route',
          hits: helloHits,
        },
        requestId: c.get('requestId'),
      });
    });

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
    createRequestLoggerPlugin({
      message: 'example request started',
    }),
    createAuthPlugin({
      publicPaths: ['/health', '/metrics', '/api/options*'],
      validate({ token }) {
        return token === 'demo-token';
      },
      invalidTokenMessage: 'Use Authorization: Bearer demo-token',
    }),
    createMetricsPlugin(),
    createRateLimitPlugin({
      includePaths: ['/api/hello'],
      limit: 2,
      windowMs: 10_000,
      key({ context }) {
        return context.req.header('authorization') ?? 'anonymous';
      },
    }),
    createCachePlugin({
      includePaths: ['/api/hello'],
      ttlMs: 30_000,
    }),
    createCorsPlugin({
      allowOrigin: '*',
      exposeHeaders: [
        'x-correlation-id',
        'x-humming-cache',
        'ratelimit-limit',
        'ratelimit-remaining',
        'ratelimit-reset',
        'retry-after',
      ],
    }),
    memoryOptionsPlugin,
  ],
});

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`with-plugins example started at http://localhost:${server.port}`);
