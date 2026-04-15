import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { parseEnv, type AppEnv } from '../config/env';
import { createFetchForwardTransport, createForwardProxy } from '../forward/proxy';
import { createLogger, type AppLogger } from '../logger';
import { requestIdMiddleware } from '../middleware/request-id';
import { createOptionsRoutes } from '../options/routes';
import { createOptionsService } from '../options/service';
import { createHealthRoutes } from '../routes/health';
import { createLocalDebugRuntime } from '../runtime/local-debug';
import type { AppBindings } from '../types';
import type { CreateAppOptions, HummingBuiltins, HummingPlugin, HummingPluginContext, HummingServices } from './types';

const DEFAULT_BUILTINS: Required<HummingBuiltins> = {
  health: true,
  options: true,
  forward: true,
};

function mergeBuiltins(builtins?: HummingBuiltins): Required<HummingBuiltins> {
  return {
    ...DEFAULT_BUILTINS,
    ...builtins,
  };
}

function createServices(appEnv: AppEnv, services?: Partial<HummingServices>): HummingServices {
  return {
    options:
      services?.options ??
      createOptionsService({
        configJson: appEnv.OPTIONS_CONFIG,
      }),
    forwardProxy:
      services?.forwardProxy ??
      createForwardProxy({
        enabled: appEnv.FORWARD_ENABLED,
        defaultTimeoutMs: appEnv.FORWARD_TIMEOUT_MS,
        blockPrivateIp: appEnv.FORWARD_BLOCK_PRIVATE_IP,
        fallbackTarget: appEnv.FORWARD_FALLBACK_TARGET,
        rulesJson: appEnv.FORWARD_RULES,
        defaultTransport: appEnv.FORWARD_TRANSPORT,
        transports: {
          fetch: createFetchForwardTransport(),
          'retry-fetch': createFetchForwardTransport({
            retry: {
              maxAttempts: appEnv.FORWARD_TRANSPORT_RETRY_MAX_ATTEMPTS,
              delayMs: appEnv.FORWARD_TRANSPORT_RETRY_DELAY_MS,
            },
          }),
        },
      }),
    localDebugRuntime: services?.localDebugRuntime ?? createLocalDebugRuntime(),
  };
}

function createPluginContext(
  app: Hono<AppBindings>,
  appEnv: AppEnv,
  appLogger: AppLogger,
  services: HummingServices
): HummingPluginContext {
  return {
    app,
    env: appEnv,
    logger: appLogger,
    services,
    use(path, middleware) {
      app.use(path, middleware);
    },
    route(path, routes) {
      app.route(path, routes);
    },
  };
}

function installErrorHandling(
  app: Hono<AppBindings>,
  appEnv: AppEnv,
  appLogger: AppLogger,
  builtins: Required<HummingBuiltins>
) {
  app.notFound((c) => {
    const errorCode = appEnv.FORWARD_ENABLED && builtins.forward ? 'FORWARD_RULE_NOT_FOUND' : 'NOT_FOUND';

    return c.json(
      {
        result: false,
        errorCode,
        errorMsg: `Route not found: ${c.req.method} ${c.req.path}`,
        requestId: c.get('requestId'),
      },
      404
    );
  });

  app.onError((err, c) => {
    const requestId = c.get('requestId');

    if (err instanceof HTTPException) {
      return c.json(
        {
          result: false,
          errorCode: `HTTP_${err.status}`,
          errorMsg: err.message,
          requestId,
        },
        err.status
      );
    }

    if (err instanceof ZodError) {
      return c.json(
        {
          result: false,
          errorCode: 'VALIDATION_ERROR',
          errorMsg: err.issues.map((issue) => issue.message).join('; '),
          requestId,
        },
        400
      );
    }

    appLogger.error({ requestId, err }, 'unhandled error');

    return c.json(
      {
        result: false,
        errorCode: 'INTERNAL_ERROR',
        errorMsg: 'Internal server error',
        requestId,
      },
      500
    );
  });
}

function buildBaseApp(options: CreateAppOptions) {
  const appEnv = options.env ?? parseEnv(Bun.env);
  const appLogger = options.logger ?? createLogger({ level: appEnv.LOG_LEVEL });
  const builtins = mergeBuiltins(options.builtins);
  const services = createServices(appEnv, options.services);
  const pluginResolution = resolvePlugins(options.plugins ?? [], appEnv);
  const plugins = pluginResolution.enabled;
  const app = new Hono<AppBindings>();

  app.use('*', requestIdMiddleware);
  installErrorHandling(app, appEnv, appLogger, builtins);
  logPluginResolution(appLogger, pluginResolution, appEnv);

  const pluginContext = createPluginContext(app, appEnv, appLogger, services);

  return {
    app,
    appEnv,
    appLogger,
    builtins,
    services,
    plugins,
    pluginContext,
  };
}

function isPluginEnabled(plugin: HummingPlugin, appEnv: AppEnv) {
  const mode = plugin.meta?.mode;

  if (!mode || mode === 'all') {
    return true;
  }

  if (Array.isArray(mode)) {
    return mode.includes(appEnv.NODE_ENV);
  }

  return mode === appEnv.NODE_ENV;
}

function comparePlugins(left: { plugin: HummingPlugin; index: number }, right: { plugin: HummingPlugin; index: number }) {
  const leftPriority = left.plugin.meta?.priority ?? 0;
  const rightPriority = right.plugin.meta?.priority ?? 0;

  if (leftPriority !== rightPriority) {
    return rightPriority - leftPriority;
  }

  return left.index - right.index;
}

function resolvePlugins(plugins: HummingPlugin[], appEnv: AppEnv) {
  const candidates = plugins
    .map((plugin, index) => ({ plugin, index }))
    .map((entry) => ({
      ...entry,
      enabled: isPluginEnabled(entry.plugin, appEnv),
    }));

  const enabledEntries = candidates.filter((entry) => entry.enabled).sort(comparePlugins);
  const skippedEntries = candidates
    .filter((entry) => !entry.enabled)
    .map(({ plugin }) => ({
      name: plugin.name,
      reason: 'mode',
      requestedMode: plugin.meta?.mode ?? 'all',
    }));
  const enabledPlugins = enabledEntries.map(({ plugin }) => plugin);

  validatePluginGraph(enabledPlugins);

  return {
    enabled: enabledPlugins,
    skipped: skippedEntries,
  };
}

function describePlugin(plugin: HummingPlugin) {
  const debugLabel = plugin.meta?.debugLabel?.trim();
  return debugLabel ? `${plugin.name} (${debugLabel})` : plugin.name;
}

function validatePluginGraph(plugins: HummingPlugin[]) {
  const seenNames = new Set<string>();

  for (const plugin of plugins) {
    if (seenNames.has(plugin.name)) {
      throw new Error(`Duplicate plugin name detected: "${plugin.name}"`);
    }
    seenNames.add(plugin.name);
  }

  for (const plugin of plugins) {
    for (const dependency of plugin.meta?.dependencies ?? []) {
      if (!seenNames.has(dependency)) {
        throw new Error(`Plugin "${describePlugin(plugin)}" depends on missing plugin "${dependency}".`);
      }
    }

    for (const conflict of plugin.meta?.conflicts ?? []) {
      if (seenNames.has(conflict)) {
        throw new Error(`Plugin "${describePlugin(plugin)}" conflicts with enabled plugin "${conflict}".`);
      }
    }
  }
}

function logPluginResolution(
  appLogger: AppLogger,
  pluginResolution: {
    enabled: HummingPlugin[];
    skipped: Array<{ name: string; reason: string; requestedMode: unknown }>;
  },
  appEnv: AppEnv
) {
  if (pluginResolution.enabled.length === 0 && pluginResolution.skipped.length === 0) {
    return;
  }

  appLogger.info(
    {
      nodeEnv: appEnv.NODE_ENV,
      enabledPlugins: pluginResolution.enabled.map((plugin) => ({
        name: plugin.name,
        priority: plugin.meta?.priority ?? 0,
        mode: plugin.meta?.mode ?? 'all',
        debugLabel: plugin.meta?.debugLabel ?? null,
        dependencies: plugin.meta?.dependencies ?? [],
        conflicts: plugin.meta?.conflicts ?? [],
      })),
      skippedPlugins: pluginResolution.skipped,
    },
    'plugins resolved'
  );
}

function installBuiltins(
  app: Hono<AppBindings>,
  builtins: Required<HummingBuiltins>,
  services: HummingServices
) {
  if (builtins.health) {
    app.route('/', createHealthRoutes());
  }

  if (builtins.options) {
    app.route('/', createOptionsRoutes(services.options));
  }
}

function installForwardTerminal(
  app: Hono<AppBindings>,
  builtins: Required<HummingBuiltins>,
  services: HummingServices
) {
  app.all('*', async (c) => {
    if (builtins.forward) {
      const forwardedResponse = await services.forwardProxy.tryForwardRequest(c);
      if (forwardedResponse) {
        return forwardedResponse;
      }
    }

    return c.notFound();
  });
}

export function definePlugin(plugin: HummingPlugin): HummingPlugin {
  return plugin;
}

export function createAppSync(options: CreateAppOptions = {}) {
  const runtime = buildBaseApp(options);

  for (const plugin of runtime.plugins) {
    const result = plugin.setup(runtime.pluginContext);
    if (result instanceof Promise) {
      throw new Error(`Plugin "${describePlugin(plugin)}" is async. use createApp() instead of createAppSync().`);
    }
  }

  installBuiltins(runtime.app, runtime.builtins, runtime.services);
  installForwardTerminal(runtime.app, runtime.builtins, runtime.services);
  return runtime.app;
}

export async function createApp(options: CreateAppOptions = {}) {
  const runtime = buildBaseApp(options);

  for (const plugin of runtime.plugins) {
    await plugin.setup(runtime.pluginContext);
  }

  installBuiltins(runtime.app, runtime.builtins, runtime.services);
  installForwardTerminal(runtime.app, runtime.builtins, runtime.services);
  return runtime.app;
}
