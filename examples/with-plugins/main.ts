import {
  type AppBindings,
  createAppSync,
  createCorsPlugin,
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
    services.options.registerSource('memory', async ({ rule }) => {
      const items = Array.isArray(rule.items) ? rule.items : [];
      return mapArrayToOptions(items, 'id', 'name');
    });

    const routes = new Hono<AppBindings>();
    routes.get('/api/hello', (c) => {
      return c.json({
        result: true,
        data: {
          message: 'hello from plugin route',
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
    createCorsPlugin({
      allowOrigin: '*',
      exposeHeaders: ['x-correlation-id'],
    }),
    createRequestLoggerPlugin({
      message: 'example request started',
    }),
    memoryOptionsPlugin,
  ],
});

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`with-plugins example started at http://localhost:${server.port}`);
