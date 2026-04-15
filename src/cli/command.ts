import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type CliTemplateName = 'basic' | 'with-plugins' | 'with-forward';

type CliOptions = {
  command: 'init';
  targetDir: string;
  template: CliTemplateName;
  force: boolean;
};

type TemplateFileMap = Record<string, string>;

type TemplateDefinition = {
  description: string;
  files(input: { projectName: string; packageVersion: string }): TemplateFileMap;
};

const CLI_TEMPLATES: Record<CliTemplateName, TemplateDefinition> = {
  basic: {
    description: 'Minimal app with core health and options only.',
    files({ projectName, packageVersion }) {
      return {
        '.gitignore': buildGitIgnore(),
        'README.md': buildGeneratedReadme({
          projectName,
          template: 'basic',
          runCommand: 'bun run dev',
        }),
        'package.json': buildGeneratedPackageJson({
          projectName,
          packageVersion,
          dependencies: {},
        }),
        'tsconfig.json': buildGeneratedTsconfig(),
        'src/main.ts': `import { createAppSync, parseEnv } from 'humming';

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

console.log(\`basic app started at http://localhost:\${server.port}\`);
`,
      };
    },
  },
  'with-plugins': {
    description: 'App with auth, metrics, rate limiting, cache, and a custom plugin route.',
    files({ projectName, packageVersion }) {
      return {
        '.gitignore': buildGitIgnore(),
        'README.md': buildGeneratedReadme({
          projectName,
          template: 'with-plugins',
          runCommand: 'bun run dev',
        }),
        'package.json': buildGeneratedPackageJson({
          projectName,
          packageVersion,
          dependencies: {
            hono: '^4.12.9',
          },
        }),
        'tsconfig.json': buildGeneratedTsconfig(),
        'src/main.ts': `import {
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
} from 'humming';
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

console.log(\`with-plugins app started at http://localhost:\${server.port}\`);
`,
      };
    },
  },
  'with-forward': {
    description: 'App with forward rules plus request and response hooks.',
    files({ projectName, packageVersion }) {
      return {
        '.gitignore': buildGitIgnore(),
        'README.md': buildGeneratedReadme({
          projectName,
          template: 'with-forward',
          runCommand: 'bun run dev',
        }),
        'package.json': buildGeneratedPackageJson({
          projectName,
          packageVersion,
          dependencies: {},
        }),
        'tsconfig.json': buildGeneratedTsconfig(),
        'src/main.ts': `import { createAppSync, definePlugin, parseEnv } from 'humming';

const upstreamPort = Number(Bun.env.UPSTREAM_PORT ?? '18901');

const env = parseEnv({
  ...Bun.env,
  PORT: Bun.env.PORT ?? '8789',
  FORWARD_ENABLED: 'true',
  FORWARD_BLOCK_PRIVATE_IP: 'false',
  FORWARD_RULES: JSON.stringify([
    {
      prefix: '/api/backend',
      target: \`http://127.0.0.1:\${upstreamPort}\`,
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

console.log(\`mock upstream started at http://localhost:\${upstreamServer.port}\`);
console.log(\`with-forward app started at http://localhost:\${server.port}\`);
`,
      };
    },
  },
};

export async function runCli(argv: string[], io = console) {
  const options = await parseCliArgs(argv);
  const packageVersion = await resolveCurrentPackageVersion();
  const absoluteTargetDir = path.resolve(options.targetDir);
  const projectName = inferProjectName(absoluteTargetDir);

  await ensureWritableTargetDir(absoluteTargetDir, options.force);

  const template = CLI_TEMPLATES[options.template];
  const files = template.files({
    projectName,
    packageVersion,
  });

  await writeTemplateFiles(absoluteTargetDir, files);

  io.log(`Created ${projectName} with the "${options.template}" template.`);
  io.log('');
  io.log(`Next steps:`);
  io.log(`  cd ${path.relative(process.cwd(), absoluteTargetDir) || '.'}`);
  io.log(`  bun install`);
  io.log(`  bun run dev`);

  return {
    projectName,
    targetDir: absoluteTargetDir,
    template: options.template,
  };
}

export async function parseCliArgs(argv: string[]): Promise<CliOptions> {
  if (argv[0] === '--help' || argv[0] === '-h') {
    throw new Error(buildHelpText());
  }

  const [command = 'init', maybeTargetDir, ...rest] = argv;

  if (command !== 'init' && command !== 'new') {
    throw new Error(
      `Unknown command "${command}". Supported commands: init`
    );
  }

  let targetDir = maybeTargetDir ?? '.';
  let template: CliTemplateName = 'basic';
  let force = false;

  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index];

    if (!current) {
      continue;
    }

    if (current === '--force') {
      force = true;
      continue;
    }

    if (current === '--template' || current === '-t') {
      const value = rest[index + 1];
      if (!value) {
        throw new Error('Missing value for --template');
      }
      if (!isCliTemplateName(value)) {
        throw new Error(
          `Unknown template "${value}". Available templates: ${listTemplateNames().join(', ')}`
        );
      }
      template = value;
      index += 1;
      continue;
    }

    if (current === '--help' || current === '-h') {
      throw new Error(buildHelpText());
    }

    if (current.startsWith('-')) {
      throw new Error(`Unknown option "${current}"`);
    }

    throw new Error(`Unexpected argument "${current}"`);
  }

  return {
    command: 'init',
    targetDir,
    template,
    force,
  };
}

function isCliTemplateName(value: string): value is CliTemplateName {
  return value in CLI_TEMPLATES;
}

function listTemplateNames() {
  return Object.keys(CLI_TEMPLATES) as CliTemplateName[];
}

function buildHelpText() {
  return [
    'Usage:',
    '  humming init <dir> [--template basic|with-plugins|with-forward] [--force]',
    '',
    'Templates:',
    ...listTemplateNames().map((name) => `  ${name}: ${CLI_TEMPLATES[name].description}`),
  ].join('\n');
}

async function resolveCurrentPackageVersion() {
  const packageJsonPath = await findNearestPackageJson(new URL('.', import.meta.url));
  const raw = await readFile(packageJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as { version?: string };
  return parsed.version ? `^${parsed.version}` : 'latest';
}

async function findNearestPackageJson(startUrl: URL) {
  let currentDir = path.dirname(fileURLToPath(startUrl));

  while (true) {
    const candidate = path.join(currentDir, 'package.json');

    try {
      await readFile(candidate, 'utf8');
      return candidate;
    } catch {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        throw new Error('Unable to locate package.json for CLI templates.');
      }
      currentDir = parentDir;
    }
  }
}

function inferProjectName(targetDir: string) {
  const baseName = path.basename(targetDir);
  const normalized = sanitizePackageName(baseName === '' ? 'humming-app' : baseName);
  return normalized || 'humming-app';
}

function sanitizePackageName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function ensureWritableTargetDir(targetDir: string, force: boolean) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(targetDir);

  if (entries.length > 0 && !force) {
    throw new Error(
      `Target directory is not empty: ${targetDir}. Use --force to continue.`
    );
  }
}

async function writeTemplateFiles(targetDir: string, files: TemplateFileMap) {
  for (const [relativePath, content] of Object.entries(files)) {
    const outputPath = path.join(targetDir, relativePath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, 'utf8');
  }
}

function buildGitIgnore() {
  return `node_modules
.DS_Store
dist
`;
}

function buildGeneratedTsconfig() {
  return `{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "strict": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "types": ["bun-types"]
  }
}
`;
}

function buildGeneratedPackageJson(input: {
  projectName: string;
  packageVersion: string;
  dependencies: Record<string, string>;
}) {
  const packageJson = {
    name: input.projectName,
    private: true,
    type: 'module',
    scripts: {
      dev: 'bun --watch src/main.ts',
      start: 'bun src/main.ts',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      humming: input.packageVersion,
      ...input.dependencies,
    },
    devDependencies: {
      '@types/bun': 'latest',
      typescript: '^5.8.3',
    },
    packageManager: 'bun@1.3.11',
  };

  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

function buildGeneratedReadme(input: {
  projectName: string;
  template: CliTemplateName;
  runCommand: string;
}) {
  return `# ${input.projectName}

Generated by \`humming\` using the \`${input.template}\` template.

## Getting Started

\`\`\`bash
bun install
${input.runCommand}
\`\`\`

Open the app after startup:

- health: \`/health\`
- options: \`/api/options\`

If you chose the \`with-plugins\` template, try:

\`\`\`bash
curl -i -H "Authorization: Bearer demo-token" http://localhost:8788/api/hello
\`\`\`
`;
}
