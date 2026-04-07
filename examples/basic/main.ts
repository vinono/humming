import { createAppSync, parseEnv } from '../../index';

const env = parseEnv({
  ...Bun.env,
  PORT: Bun.env.PORT ?? '8787',
  FORWARD_ENABLED: Bun.env.FORWARD_ENABLED ?? 'false',
  OPTIONS_CONFIG:
    Bun.env.OPTIONS_CONFIG ??
    JSON.stringify({
      status: {
        type: 'static',
        items: [
          { value: 'UP', label: 'Up' },
          { value: 'DEGRADED', label: 'Degraded' },
        ],
      },
    }),
});

const app = createAppSync({
  env,
  builtins: {
    health: true,
    options: true,
    forward: false,
  },
});

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`basic example started at http://localhost:${server.port}`);
