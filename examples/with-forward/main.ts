import { createAppSync, definePlugin, parseEnv } from '../../index';

const upstreamPort = Number(Bun.env.UPSTREAM_PORT ?? '18901');

const env = parseEnv({
  ...Bun.env,
  PORT: Bun.env.PORT ?? '8789',
  FORWARD_ENABLED: 'true',
  FORWARD_BLOCK_PRIVATE_IP: 'false',
  FORWARD_RULES: JSON.stringify([
    {
      prefix: '/api/backend',
      target: `http://127.0.0.1:${upstreamPort}`,
      stripPrefix: true,
      allowedMethods: ['GET'],
    },
  ]),
});

const upstreamServer = Bun.serve({
  port: upstreamPort,
  fetch(request) {
    const url = new URL(request.url);

    return Response.json({
      result: true,
      source: 'mock-upstream',
      data: {
        method: request.method,
        pathname: url.pathname,
        search: url.search,
        pluginHeader: request.headers.get('x-example-plugin'),
        correlationId: request.headers.get('x-correlation-id'),
      },
    });
  },
});

const forwardHooksPlugin = definePlugin({
  name: 'forward-hooks-example',
  setup({ services }) {
    services.forwardProxy.registerBeforeRequest(({ headers }) => {
      const nextHeaders = new Headers(headers);
      nextHeaders.set('x-example-plugin', 'with-forward');

      return {
        headers: nextHeaders,
      };
    });

    services.forwardProxy.registerAfterResponse(({ response }) => {
      const nextHeaders = new Headers(response.headers);
      nextHeaders.set('x-forward-hook', 'after-response');

      return new Response(response.body, {
        status: response.status,
        headers: nextHeaders,
      });
    });
  },
});

const app = createAppSync({
  env,
  builtins: {
    health: true,
    options: false,
    forward: true,
  },
  plugins: [forwardHooksPlugin],
});

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`mock upstream started at http://localhost:${upstreamServer.port}`);
console.log(`with-forward example started at http://localhost:${server.port}`);
