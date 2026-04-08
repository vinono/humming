import { Hono } from 'hono';
import { type AppBindings, createApp, definePlugin, parseEnv } from '../../index';

const env = parseEnv({
  ...Bun.env,
  PORT: Bun.env.PORT ?? '8790',
  FORWARD_ENABLED: Bun.env.FORWARD_ENABLED ?? 'false',
});

const asyncGreetingPlugin = definePlugin({
  name: 'async-greeting',
  async setup({ logger, route }) {
    await Bun.sleep(50);
    logger.info({ plugin: 'async-greeting' }, 'async plugin initialized');

    const routes = new Hono<AppBindings>();
    routes.get('/api/ready', (c) => {
      return c.json({
        result: true,
        data: {
          message: 'async plugin is ready',
        },
        requestId: c.get('requestId'),
      });
    });

    route('/', routes);
  },
});

const app = await createApp({
  env,
  builtins: {
    health: true,
    options: false,
    forward: false,
  },
  plugins: [asyncGreetingPlugin],
});

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`with-async-plugin example started at http://localhost:${server.port}`);
