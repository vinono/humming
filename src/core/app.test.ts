import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { createApp, createAppSync, definePlugin } from './app';
import { createForwardProxy } from '../forward/proxy';
import { createLogger, logger as sharedLogger } from '../logger';
import type { AppBindings } from '../types';
import { parseEnv } from '../config/env';

const originalFetch = globalThis.fetch;

describe('core app runtime', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('keeps health in core by default', async () => {
    const app = createAppSync({
      builtins: {
        options: false,
        forward: false,
      },
    });

    const response = await app.request('/health');
    const body = (await response.json()) as {
      result: boolean;
      data: { status: string };
    };

    expect(response.status).toBe(200);
    expect(body.result).toBe(true);
    expect(body.data.status).toBe('UP');
  });

  it('registers plugin routes before the forward terminal', async () => {
    const plugin = definePlugin({
      name: 'hello-plugin',
      setup({ route }) {
        const routes = new Hono<AppBindings>();
        routes.get('/hello', (c) => c.json({ ok: true }));
        route('/', routes);
      },
    });

    const app = createAppSync({
      builtins: {
        options: false,
        forward: false,
      },
      plugins: [plugin],
    });

    const response = await app.request('/hello');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('supports async plugins with createApp', async () => {
    const plugin = definePlugin({
      name: 'async-plugin',
      async setup({ route }) {
        const routes = new Hono<AppBindings>();
        routes.get('/async-ready', (c) => c.json({ ready: true }));
        route('/', routes);
      },
    });

    const app = await createApp({
      builtins: {
        options: false,
        forward: false,
      },
      plugins: [plugin],
    });

    const response = await app.request('/async-ready');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ready: true });
  });

  it('logs plugin setup summaries with routes, middleware, option sources, hooks, and cleanup counts', () => {
    const capturedLogs: Array<{ payload: unknown; message?: string }> = [];
    const logger = createLogger({ level: 'info' });
    logger.info = ((payload: unknown, message?: string) => {
      capturedLogs.push({ payload, message });
      return logger;
    }) as typeof logger.info;

    createAppSync({
      logger,
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        definePlugin({
          name: 'observed-plugin',
          meta: {
            debugLabel: 'trace-me',
          },
          setup({ route, use, services, onDispose }) {
            use('/api/*', async (_, next) => {
              await next();
            });

            const routes = new Hono<AppBindings>();
            routes.get('/hello', (c) => c.json({ ok: true }));
            routes.post('/submit', (c) => c.json({ ok: true }));
            route('/feature', routes);

            services.options.registerSource('memory', async () => []);
            services.forwardProxy.registerBeforeRequest(() => undefined);
            services.forwardProxy.registerHooks({
              afterResponse() {},
              onError() {},
            });

            onDispose(() => undefined);
          },
        }),
      ],
    });

    const setupLog = capturedLogs.find((entry) => entry.message === 'plugin setup observed') as
      | {
          payload: {
            pluginSetup: Array<{
              name: string;
              debugLabel: string | null;
              middlewarePaths: string[];
              routeMounts: Array<{
                mountPath: string;
                routes: Array<{ method: string; path: string }>;
              }>;
              optionSources: string[];
              forwardHooks: {
                beforeMatch: number;
                beforeRequest: number;
                afterResponse: number;
                onError: number;
              };
              disposeHandlers: number;
            }>;
          };
        }
      | undefined;

    expect(setupLog).toBeDefined();
    expect(setupLog?.payload.pluginSetup).toEqual([
      {
        name: 'observed-plugin',
        debugLabel: 'trace-me',
        middlewareCount: 1,
        middlewarePaths: ['/api/*'],
        routeMountCount: 1,
        routeCount: 2,
        routeMounts: [
          {
            mountPath: '/feature',
            routes: [
              { method: 'GET', path: '/feature/hello' },
              { method: 'POST', path: '/feature/submit' },
            ],
          },
        ],
        optionSources: ['memory'],
        forwardHooks: {
          beforeMatch: 0,
          beforeRequest: 1,
          afterResponse: 1,
          onError: 1,
        },
        disposeHandlers: 1,
      },
    ]);
  });

  it('disposes plugin handlers in reverse registration order and only once', async () => {
    const events: string[] = [];
    const app = await createApp({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        definePlugin({
          name: 'alpha-plugin',
          setup({ onDispose }) {
            events.push('setup:alpha');
            onDispose(() => {
              events.push('dispose:alpha:registered');
            });

            return () => {
              events.push('dispose:alpha:return');
            };
          },
        }),
        definePlugin({
          name: 'beta-plugin',
          setup() {
            events.push('setup:beta');
            return () => {
              events.push('dispose:beta:return');
            };
          },
        }),
      ],
    });

    await app.dispose();
    await app.dispose();

    expect(events).toEqual([
      'setup:alpha',
      'setup:beta',
      'dispose:beta:return',
      'dispose:alpha:return',
      'dispose:alpha:registered',
    ]);
  });

  it('throws when async plugins are used with createAppSync', () => {
    const plugin = definePlugin({
      name: 'async-plugin',
      async setup() {},
    });

    expect(() =>
      createAppSync({
        builtins: {
          options: false,
          forward: false,
        },
        plugins: [plugin],
      })
    ).toThrow('use createApp() instead of createAppSync()');
  });

  it('rolls back sync plugin cleanup when createAppSync startup fails', () => {
    const events: string[] = [];

    expect(() =>
      createAppSync({
        builtins: {
          health: false,
          options: false,
          forward: false,
        },
        plugins: [
          definePlugin({
            name: 'cleanup-plugin',
            setup({ onDispose }) {
              events.push('setup:cleanup');
              onDispose(() => {
                events.push('dispose:cleanup');
              });
            },
          }),
          definePlugin({
            name: 'broken-plugin',
            setup() {
              throw new Error('sync startup failed');
            },
          }),
        ],
      })
    ).toThrow('sync startup failed');

    expect(events).toEqual(['setup:cleanup', 'dispose:cleanup']);
  });

  it('rolls back async plugin cleanup when createApp startup fails', async () => {
    const events: string[] = [];

    await expect(
      createApp({
        builtins: {
          health: false,
          options: false,
          forward: false,
        },
        plugins: [
          definePlugin({
            name: 'cleanup-plugin',
            async setup({ onDispose }) {
              events.push('setup:cleanup');
              onDispose(async () => {
                events.push('dispose:cleanup:start');
                await Bun.sleep(0);
                events.push('dispose:cleanup:done');
              });
            },
          }),
          definePlugin({
            name: 'broken-plugin',
            async setup() {
              throw new Error('async startup failed');
            },
          }),
        ],
      })
    ).rejects.toThrow('async startup failed');

    expect(events).toEqual(['setup:cleanup', 'dispose:cleanup:start', 'dispose:cleanup:done']);
  });

  it('lets plugins register forward hooks through core services', async () => {
    const calls: Array<{ input: string | URL; init?: RequestInit }> = [];
    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    const plugin = definePlugin({
      name: 'forward-hook-plugin',
      setup({ services }) {
        services.forwardProxy.registerBeforeRequest(({ headers }) => {
          const nextHeaders = new Headers(headers);
          nextHeaders.set('x-core-plugin', 'enabled');
          return { headers: nextHeaders };
        });
      },
    });

    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: true,
      },
      services: {
        forwardProxy: createForwardProxy({
          enabled: true,
          defaultTimeoutMs: 5_000,
          blockPrivateIp: false,
          rulesJson: JSON.stringify([{ prefix: '/api', target: 'https://backend.example.com' }]),
        }),
      },
      plugins: [plugin],
    });

    const response = await app.request('/api/ping');

    expect(response.status).toBe(200);
    expect(String(calls[0]?.input)).toBe('https://backend.example.com/api/ping');
    expect(new Headers(calls[0]?.init?.headers).get('x-core-plugin')).toBe('enabled');
  });

  it('includes hook owner names in forward logs for plugin-registered hooks', async () => {
    const originalInfo = sharedLogger.info;
    const infoLogs: Array<{ payload: unknown; message?: string }> = [];
    sharedLogger.info = ((payload: unknown, message?: string) => {
      infoLogs.push({ payload, message });
      return sharedLogger;
    }) as typeof sharedLogger.info;

    try {
      globalThis.fetch = (async () => new Response('ok', { status: 200 })) as typeof fetch;

      const app = createAppSync({
        builtins: {
          health: false,
          options: false,
          forward: true,
        },
        services: {
          forwardProxy: createForwardProxy({
            enabled: true,
            defaultTimeoutMs: 5_000,
            blockPrivateIp: false,
            rulesJson: JSON.stringify([{ prefix: '/api', target: 'https://backend.example.com' }]),
          }),
        },
        plugins: [
          definePlugin({
            name: 'hook-owner-plugin',
            setup({ services }) {
              services.forwardProxy.registerBeforeRequest(() => undefined);
              services.forwardProxy.registerAfterResponse(() => undefined);
            },
          }),
        ],
      });

      const response = await app.request('/api/ping');
      expect(response.status).toBe(200);

      const forwardedLog = infoLogs.find((entry) => entry.message === 'request forwarded') as
        | {
            payload: {
              hookOwners: {
                beforeMatch: string[];
                beforeRequest: string[];
                afterResponse: string[];
                onError: string[];
              };
            };
          }
        | undefined;

      expect(forwardedLog).toBeDefined();
      expect(forwardedLog?.payload.hookOwners).toEqual({
        beforeMatch: [],
        beforeRequest: ['hook-owner-plugin'],
        afterResponse: ['hook-owner-plugin'],
        onError: [],
      });
    } finally {
      sharedLogger.info = originalInfo;
    }
  });

  it('orders plugins by descending priority', async () => {
    const setupOrder: string[] = [];
    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        definePlugin({
          name: 'normal-plugin',
          setup({ route }) {
            setupOrder.push('normal');
            const routes = new Hono<AppBindings>();
            routes.get('/normal', (c) => c.json({ ok: true }));
            route('/', routes);
          },
        }),
        definePlugin({
          name: 'high-priority-plugin',
          meta: {
            priority: 100,
          },
          setup({ route }) {
            setupOrder.push('high');
            const routes = new Hono<AppBindings>();
            routes.get('/high', (c) => c.json({ ok: true }));
            route('/', routes);
          },
        }),
      ],
    });

    expect(setupOrder).toEqual(['high', 'normal']);
    expect((await app.request('/high')).status).toBe(200);
    expect((await app.request('/normal')).status).toBe(200);
  });

  it('skips plugins whose mode does not match the current env', async () => {
    const app = createAppSync({
      env: parseEnv({
        NODE_ENV: 'production',
        PORT: '8787',
        FORWARD_ENABLED: 'false',
      }),
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        definePlugin({
          name: 'dev-only',
          meta: {
            mode: 'development',
          },
          setup({ route }) {
            const routes = new Hono<AppBindings>();
            routes.get('/dev-only', (c) => c.json({ ok: true }));
            route('/', routes);
          },
        }),
        definePlugin({
          name: 'prod-only',
          meta: {
            mode: ['production', 'test'],
          },
          setup({ route }) {
            const routes = new Hono<AppBindings>();
            routes.get('/prod-only', (c) => c.json({ ok: true }));
            route('/', routes);
          },
        }),
      ],
    });

    expect((await app.request('/dev-only')).status).toBe(404);
    expect((await app.request('/prod-only')).status).toBe(200);
  });

  it('includes debugLabel in the async plugin sync error message', () => {
    const plugin = definePlugin({
      name: 'async-plugin',
      meta: {
        debugLabel: 'boot-sequence',
      },
      async setup() {},
    });

    expect(() =>
      createAppSync({
        builtins: {
          options: false,
          forward: false,
        },
        plugins: [plugin],
      })
    ).toThrow('async-plugin (boot-sequence)');
  });

  it('fails when a plugin dependency is missing', () => {
    const plugin = definePlugin({
      name: 'dependent-plugin',
      meta: {
        dependencies: ['base-plugin'],
      },
      setup() {},
    });

    expect(() =>
      createAppSync({
        builtins: {
          options: false,
          forward: false,
        },
        plugins: [plugin],
      })
    ).toThrow('depends on missing plugin "base-plugin"');
  });

  it('fails when enabled plugins conflict', () => {
    const alpha = definePlugin({
      name: 'alpha-plugin',
      meta: {
        conflicts: ['beta-plugin'],
      },
      setup() {},
    });

    const beta = definePlugin({
      name: 'beta-plugin',
      setup() {},
    });

    expect(() =>
      createAppSync({
        builtins: {
          options: false,
          forward: false,
        },
        plugins: [alpha, beta],
      })
    ).toThrow('conflicts with enabled plugin "beta-plugin"');
  });

  it('fails when enabled plugin names are duplicated', () => {
    const first = definePlugin({
      name: 'duplicate-plugin',
      setup() {},
    });

    const second = definePlugin({
      name: 'duplicate-plugin',
      setup() {},
    });

    expect(() =>
      createAppSync({
        builtins: {
          options: false,
          forward: false,
        },
        plugins: [first, second],
      })
    ).toThrow('Duplicate plugin name detected');
  });

  it('logs resolved and skipped plugins during startup', () => {
    const capturedLogs: Array<{ payload: unknown; message?: string }> = [];
    const logger = createLogger({ level: 'info' });
    logger.info = ((payload: unknown, message?: string) => {
      capturedLogs.push({ payload, message });
      return logger;
    }) as typeof logger.info;

    createAppSync({
      logger,
      env: parseEnv({
        NODE_ENV: 'production',
        PORT: '8787',
        FORWARD_ENABLED: 'false',
      }),
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [
        definePlugin({
          name: 'base-plugin',
          meta: {
            priority: 50,
          },
          setup() {},
        }),
        definePlugin({
          name: 'dependent-plugin',
          meta: {
            dependencies: ['base-plugin'],
          },
          setup() {},
        }),
        definePlugin({
          name: 'dev-only-plugin',
          meta: {
            mode: 'development',
          },
          setup() {},
        }),
      ],
    });

    const pluginLog = capturedLogs.find((entry) => entry.message === 'plugins resolved') as
      | {
          payload: {
            nodeEnv: string;
            enabledPlugins: Array<{ name: string; dependencies: string[] }>;
            skippedPlugins: Array<{ name: string; reason: string; requestedMode: string }>;
          };
        }
      | undefined;

    expect(pluginLog).toBeDefined();
    expect(pluginLog?.payload.nodeEnv).toBe('production');
    expect(pluginLog?.payload.enabledPlugins.map((plugin) => plugin.name)).toEqual([
      'base-plugin',
      'dependent-plugin',
    ]);
    expect(pluginLog?.payload.enabledPlugins[1]?.dependencies).toEqual(['base-plugin']);
    expect(pluginLog?.payload.skippedPlugins).toEqual([
      {
        name: 'dev-only-plugin',
        reason: 'mode',
        requestedMode: 'development',
      },
    ]);
  });

  it('shares localDebugRuntime across plugins and requests', async () => {
    const setterPlugin = definePlugin({
      name: 'runtime-setter',
      setup({ route, services }) {
        const routes = new Hono<AppBindings>();
        routes.post('/debug/runtime/set', () => {
          return Response.json(
            services.localDebugRuntime.setRuntimeState({
              loginEnv: 'daily',
              target: 'https://daily.example.com',
              configCenterHost: 'https://config.daily.example.com',
              tenant: 'cn',
              cookies: {
                session: 'abc',
              },
            })
          );
        });
        route('/', routes);
      },
    });

    const readerPlugin = definePlugin({
      name: 'runtime-reader',
      setup({ route, services }) {
        const routes = new Hono<AppBindings>();
        routes.get('/debug/runtime/state', () => Response.json(services.localDebugRuntime.getRuntimeState()));
        routes.post('/debug/runtime/clear', () => Response.json(services.localDebugRuntime.clearRuntimeState()));
        route('/', routes);
      },
    });

    const app = createAppSync({
      builtins: {
        health: false,
        options: false,
        forward: false,
      },
      plugins: [setterPlugin, readerPlugin],
    });

    const setResponse = await app.request('/debug/runtime/set', { method: 'POST' });
    expect(setResponse.status).toBe(200);

    const readResponse = await app.request('/debug/runtime/state');
    const readBody = (await readResponse.json()) as {
      loginEnv: string | null;
      target: string | null;
      configCenterHost: string | null;
      tenant: string | null;
      cookies: Record<string, string>;
      updatedAt: string | null;
    };

    expect(readResponse.status).toBe(200);
    expect(readBody.loginEnv).toBe('daily');
    expect(readBody.target).toBe('https://daily.example.com');
    expect(readBody.configCenterHost).toBe('https://config.daily.example.com');
    expect(readBody.tenant).toBe('cn');
    expect(readBody.cookies).toEqual({ session: 'abc' });
    expect(typeof readBody.updatedAt).toBe('string');

    const clearResponse = await app.request('/debug/runtime/clear', { method: 'POST' });
    const clearBody = (await clearResponse.json()) as {
      loginEnv: string | null;
      cookies: Record<string, string>;
      updatedAt: string | null;
    };

    expect(clearResponse.status).toBe(200);
    expect(clearBody.loginEnv).toBeNull();
    expect(clearBody.cookies).toEqual({});
    expect(typeof clearBody.updatedAt).toBe('string');
  });
});
