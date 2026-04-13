import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { fileURLToPath } from 'node:url';
import { type AppBindings, createAppSync, definePlugin, parseEnv } from './index';

const textDecoder = new TextDecoder();
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

describe('public package entry', () => {
  it('creates an app from the root exports', async () => {
    const helloPlugin = definePlugin({
      name: 'hello',
      setup({ route }) {
        const routes = new Hono<AppBindings>();

        routes.get('/api/hello', (c) =>
          c.json({
            result: true,
            data: {
              message: 'hello from public entry',
            },
          })
        );

        route('/', routes);
      },
    });

    const app = createAppSync({
      env: parseEnv({
        PORT: '8787',
        FORWARD_ENABLED: 'false',
      }),
      builtins: {
        health: true,
        options: false,
        forward: false,
      },
      plugins: [helloPlugin],
    });

    const response = await app.request('/api/hello');
    const body = (await response.json()) as {
      result: boolean;
      data: {
        message: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.result).toBe(true);
    expect(body.data.message).toBe('hello from public entry');
  });

  it('can import the package root without evaluating Bun.env eagerly', () => {
    const result = Bun.spawnSync({
      cmd: ['bun', '-e', 'import("./index.ts").then(() => console.log("import-ok"))'],
      cwd: repoRoot,
      env: {
        ...Bun.env,
        PORT: '0',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    expect(result.exitCode).toBe(0);
    expect(textDecoder.decode(result.stdout)).toContain('import-ok');
    expect(textDecoder.decode(result.stderr)).toBe('');
  });
});
