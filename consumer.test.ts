import { afterAll, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const textDecoder = new TextDecoder();
const repoRoot = dirname(fileURLToPath(import.meta.url));
const tempPaths: string[] = [];

function readOutput(output?: Uint8Array<ArrayBufferLike> | null) {
  if (!output) {
    return '';
  }

  return textDecoder.decode(output).trim();
}

function createConsumerEnv(consumerDir: string) {
  return {
    ...Bun.env,
    TMPDIR: consumerDir,
    BUN_INSTALL_CACHE_DIR: join(consumerDir, '.bun-cache'),
    BUN_INSTALL_GLOBAL_DIR: join(consumerDir, '.bun-global'),
  };
}

afterAll(async () => {
  await Promise.all(
    tempPaths.map((path) =>
      rm(path, {
        recursive: true,
        force: true,
      })
    )
  );
});

describe('fresh consumer project', () => {
  it('packs and runs humming from a minimal Bun app', async () => {
    const consumerDir = await mkdtemp(join(tmpdir(), 'humming-consumer-'));
    tempPaths.push(consumerDir);
    const packageMeta = (await Bun.file(join(repoRoot, 'package.json')).json()) as {
      name: string;
      version: string;
    };
    const packageTarball = join(repoRoot, `${packageMeta.name}-${packageMeta.version}.tgz`);

    await Bun.write(
      join(consumerDir, 'package.json'),
      JSON.stringify(
        {
          name: 'humming-consumer-smoke',
          private: true,
          type: 'module',
        },
        null,
        2
      )
    );

    await Bun.write(
      join(consumerDir, 'main.ts'),
      `
import { createAppSync, parseEnv } from 'humming';

const env = parseEnv({
  PORT: '8787',
  FORWARD_ENABLED: 'false',
});

const app = createAppSync({
  env,
  builtins: {
    health: true,
    options: false,
    forward: false,
  },
});

const response = await app.request('/health');
const body = await response.json();

if (response.status !== 200 || body?.result !== true || body?.data?.status !== 'UP') {
  throw new Error(\`consumer smoke failed: \${JSON.stringify({ status: response.status, body })}\`);
}

console.log('consumer-ok');
`.trimStart()
    );

    const pack = Bun.spawnSync({
      cmd: ['bun', 'pm', 'pack'],
      cwd: repoRoot,
      env: createConsumerEnv(consumerDir),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    expect(pack.exitCode).toBe(0);
    tempPaths.push(packageTarball);

    const nodeModulesDir = join(consumerDir, 'node_modules');
    const hummingPackageDir = join(nodeModulesDir, 'humming');

    await mkdir(hummingPackageDir, { recursive: true });
    for (const dependency of ['hono', 'pino', 'zod']) {
      await symlink(join(repoRoot, 'node_modules', dependency), join(nodeModulesDir, dependency), 'dir');
    }

    const unpack = Bun.spawnSync({
      cmd: ['tar', '-xzf', packageTarball, '--strip-components=1', '-C', hummingPackageDir],
      cwd: repoRoot,
      env: createConsumerEnv(consumerDir),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    expect(unpack.exitCode).toBe(0);
    expect(readOutput(unpack.stderr)).toBe('');

    const run = Bun.spawnSync({
      cmd: ['bun', 'run', 'main.ts'],
      cwd: consumerDir,
      env: createConsumerEnv(consumerDir),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    expect(run.exitCode).toBe(0);
    expect(readOutput(run.stdout)).toContain('consumer-ok');
    expect(readOutput(run.stderr)).toBe('');
  });
});
