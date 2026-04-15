import { afterEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseCliArgs, runCli } from './command';

const temporaryDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('humming cli', () => {
  it('parses init arguments with template and force flags', async () => {
    const parsed = await parseCliArgs(['init', 'demo-app', '--template', 'with-plugins', '--force']);

    expect(parsed).toEqual({
      command: 'init',
      targetDir: 'demo-app',
      template: 'with-plugins',
      force: true,
    });
  });

  it('creates a basic starter project', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'humming-cli-basic-'));
    temporaryDirs.push(directory);
    const outputDir = path.join(directory, 'demo-basic');

    const logs: string[] = [];
    await runCli(['init', outputDir], {
      log(message?: unknown) {
        logs.push(String(message ?? ''));
      },
    } as typeof console);

    const packageJson = JSON.parse(await readFile(path.join(outputDir, 'package.json'), 'utf8')) as {
      name: string;
      dependencies: Record<string, string>;
    };
    const mainFile = await readFile(path.join(outputDir, 'src/main.ts'), 'utf8');

    expect(packageJson.name).toBe('demo-basic');
    expect(packageJson.dependencies.humming).toBeTruthy();
    expect(mainFile).toContain("createAppSync");
    expect(mainFile).toContain("FORWARD_ENABLED");
    expect(logs.some((line) => line.includes('Created demo-basic'))).toBe(true);
  });

  it('creates the with-plugins template with hono dependency', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'humming-cli-plugins-'));
    temporaryDirs.push(directory);
    const outputDir = path.join(directory, 'demo-plugins');

    await runCli(['init', outputDir, '--template', 'with-plugins']);

    const packageJson = JSON.parse(await readFile(path.join(outputDir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const mainFile = await readFile(path.join(outputDir, 'src/main.ts'), 'utf8');

    expect(packageJson.dependencies.hono).toBe('^4.12.9');
    expect(mainFile).toContain("createAuthPlugin");
    expect(mainFile).toContain("Hono");
  });

  it('refuses to write into a non-empty directory without force', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'humming-cli-force-'));
    temporaryDirs.push(directory);
    const outputDir = path.join(directory, 'existing-app');
    await mkdir(outputDir, { recursive: true });
    await Bun.write(path.join(outputDir, 'keep.txt'), 'keep');

    await expect(runCli(['init', outputDir])).rejects.toThrow('Target directory is not empty');
  });
});
