import { describe, expect, it } from 'bun:test';
import { createAppSync, definePlugin } from './core';
import { parseEnv } from './config/env';
import { Hono } from 'hono';
import type { AppBindings } from './types';
import { z } from 'zod';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

describe('Architecture Constraint: Env Isolation', () => {
  it('should not access Bun.env or process.env properties directly outside env.ts', async () => {
    const tsFiles: string[] = [];

    async function scan(dir: string) {
      const files = await readdir(dir);
      for (const file of files) {
        const fullPath = join(dir, file);
        const s = await stat(fullPath);
        if (s.isDirectory()) {
          await scan(fullPath);
        } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
          tsFiles.push(fullPath);
        }
      }
    }

    // 扫描 src 目录
    await scan(join(__dirname, '../src'));

    const illegalPattern = /(Bun|process)\.env\.[a-zA-Z0-9_]+/g;
    const destructuringPattern = /const\s*\{[^}]*\}\s*=\s*(Bun|process)\.env/g;

    for (const filePath of tsFiles) {
      // 豁免 env.ts，因为它是环境变量解析的统一入口；
      // 同时豁免 cli 目录，因为它是非运行时 CLI 工具，且包含了生成的模板文本。
      if (filePath.endsWith('config/env.ts') || filePath.includes('/src/cli/')) {
        continue;
      }

      const content = await Bun.file(filePath).text();
      // 剔除注释，以防在注释中提到 Bun.env 导致测试失败
      const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      const matches = [
        ...cleanContent.matchAll(illegalPattern),
        ...cleanContent.matchAll(destructuringPattern),
      ];

      if (matches.length > 0) {
        throw new Error(
          `Constraint Violation: Direct environment variable access found in ${filePath}. Use parseEnv() or plugin contexts instead. Violating code: ${matches.map((m) => m[0]).join(', ')}`
        );
      }
    }
  });
});

describe('Architecture Constraint: Plugin Lifecycle & Governance', () => {
  it('should prevent app creation if there is a plugin name conflict', () => {
    const pluginA = definePlugin({
      name: 'duplicate-name',
      setup() {},
    });
    const pluginB = definePlugin({
      name: 'duplicate-name',
      setup() {},
    });

    expect(() => {
      createAppSync({
        env: parseEnv({ FORWARD_ENABLED: 'false' }),
        plugins: [pluginA, pluginB],
      });
    }).toThrow(/Duplicate plugin name detected/);
  });

  it('should prevent app creation if dependencies are missing', () => {
    const pluginA = definePlugin({
      name: 'plugin-a',
      meta: {
        dependencies: ['plugin-b'],
      },
      setup() {},
    });

    expect(() => {
      createAppSync({
        env: parseEnv({ FORWARD_ENABLED: 'false' }),
        plugins: [pluginA],
      });
    }).toThrow(/depends on missing plugin "plugin-b"/);
  });

  it('should prevent app creation if conflict is detected', () => {
    const pluginA = definePlugin({
      name: 'plugin-a',
      meta: {
        conflicts: ['plugin-b'],
      },
      setup() {},
    });
    const pluginB = definePlugin({
      name: 'plugin-b',
      setup() {},
    });

    expect(() => {
      createAppSync({
        env: parseEnv({ FORWARD_ENABLED: 'false' }),
        plugins: [pluginA, pluginB],
      });
    }).toThrow(/conflicts with enabled plugin "plugin-b"/);
  });

  it('should execute teardown on app creation failure in reverse order (rollback)', () => {
    const order: string[] = [];
    const pluginA = definePlugin({
      name: 'plugin-a',
      setup(c) {
        c.onDispose(() => {
          order.push('cleanup-a');
        });
      },
    });
    const pluginB = definePlugin({
      name: 'plugin-b',
      setup() {
        throw new Error('plugin-b failed to setup');
      },
    });

    expect(() => {
      createAppSync({
        env: parseEnv({ FORWARD_ENABLED: 'false' }),
        plugins: [pluginA, pluginB],
      });
    }).toThrow(/plugin-b failed to setup/);

    expect(order).toEqual(['cleanup-a']);
  });

  it('should execute all dispose handlers in reverse order on app.dispose()', async () => {
    const order: string[] = [];
    const pluginA = definePlugin({
      name: 'plugin-a',
      setup(c) {
        c.onDispose(() => {
          order.push('cleanup-a');
        });
      },
    });
    const pluginB = definePlugin({
      name: 'plugin-b',
      setup(c) {
        c.onDispose(() => {
          order.push('cleanup-b');
        });
      },
    });

    const app = createAppSync({
      env: parseEnv({ FORWARD_ENABLED: 'false' }),
      plugins: [pluginA, pluginB],
    });

    await app.dispose();
    expect(order).toEqual(['cleanup-b', 'cleanup-a']);
  });

  it('should aggregate errors if multiple plugins fail to dispose', async () => {
    const pluginA = definePlugin({
      name: 'plugin-a',
      setup(c) {
        c.onDispose(() => {
          throw new Error('fail-a');
        });
      },
    });
    const pluginB = definePlugin({
      name: 'plugin-b',
      setup(c) {
        c.onDispose(() => {
          throw new Error('fail-b');
        });
      },
    });

    const app = createAppSync({
      env: parseEnv({ FORWARD_ENABLED: 'false' }),
      plugins: [pluginA, pluginB],
    });

    expect(app.dispose()).rejects.toThrow(AggregateError);
  });
});

describe('Architecture Constraint: Error Response Format', () => {
  it('should return 400 VALIDATION_ERROR when ZodError is thrown in request flow', async () => {
    const brokenPlugin = definePlugin({
      name: 'broken-zod',
      setup({ route }) {
        const routes = new Hono<AppBindings>();
        routes.get('/zod-error', () => {
          z.string().parse(123);
        });
        route('/', routes);
      },
    });

    const app = createAppSync({
      env: parseEnv({ FORWARD_ENABLED: 'false' }),
      plugins: [brokenPlugin],
    });

    const response = await app.request('/zod-error');
    const body = (await response.json()) as { result: boolean; errorCode: string };

    expect(response.status).toBe(400);
    expect(body.result).toBe(false);
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should return 500 INTERNAL_ERROR when unhandled Error is thrown in request flow', async () => {
    const brokenPlugin = definePlugin({
      name: 'broken-internal',
      setup({ route }) {
        const routes = new Hono<AppBindings>();
        routes.get('/internal-error', () => {
          throw new Error('something went wrong');
        });
        route('/', routes);
      },
    });

    const app = createAppSync({
      env: parseEnv({ FORWARD_ENABLED: 'false' }),
      plugins: [brokenPlugin],
    });

    const response = await app.request('/internal-error');
    const body = (await response.json()) as { result: boolean; errorCode: string };

    expect(response.status).toBe(500);
    expect(body.result).toBe(false);
    expect(body.errorCode).toBe('INTERNAL_ERROR');
  });
});

