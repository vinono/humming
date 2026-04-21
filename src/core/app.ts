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
import type {
  CreateAppOptions,
  HummingApp,
  HummingBuiltins,
  HummingPlugin,
  HummingPluginContext,
  HummingPluginDisposeHandler,
  HummingServices,
} from './types';

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

type RegisteredPluginDisposeHandler = {
  handler: HummingPluginDisposeHandler;
  pluginName: string;
};

type ObservedRoute = {
  method: string;
  path: string;
};

type PluginRouteMountObservation = {
  mountPath: string;
  routes: ObservedRoute[];
};

type PluginSetupObservation = {
  name: string;
  debugLabel: string | null;
  middlewarePaths: string[];
  routeMounts: PluginRouteMountObservation[];
  optionSources: string[];
  forwardHooks: {
    beforeMatch: number;
    beforeRequest: number;
    afterResponse: number;
    onError: number;
  };
  disposeHandlers: number;
};

function normalizeObservedPath(path: string) {
  if (!path || path === '/') {
    return '/';
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.replace(/\/{2,}/g, '/');
}

function joinObservedRoutePath(mountPath: string, routePath: string) {
  const normalizedMountPath = normalizeObservedPath(mountPath);
  const normalizedRoutePath = normalizeObservedPath(routePath);

  if (normalizedMountPath === '/') {
    return normalizedRoutePath;
  }

  if (normalizedRoutePath === '/') {
    return normalizedMountPath;
  }

  return `${normalizedMountPath}${normalizedRoutePath}`.replace(/\/{2,}/g, '/');
}

function inspectMountedRoutes(routes: Hono<AppBindings>, mountPath: string): ObservedRoute[] {
  const routeEntries = (routes as Hono<AppBindings> & {
    routes?: Array<{ method?: string; path?: string }>;
  }).routes;

  if (!Array.isArray(routeEntries)) {
    return [];
  }

  return routeEntries
    .filter((route) => typeof route.method === 'string' && typeof route.path === 'string')
    .map((route) => ({
      method: route.method!,
      path: joinObservedRoutePath(mountPath, route.path!),
    }));
}

function createPluginSetupObservation(plugin: HummingPlugin): PluginSetupObservation {
  return {
    name: plugin.name,
    debugLabel: plugin.meta?.debugLabel?.trim() || null,
    middlewarePaths: [],
    routeMounts: [],
    optionSources: [],
    forwardHooks: {
      beforeMatch: 0,
      beforeRequest: 0,
      afterResponse: 0,
      onError: 0,
    },
    disposeHandlers: 0,
  };
}

function createPluginContext(
  plugin: HummingPlugin,
  app: Hono<AppBindings>,
  appEnv: AppEnv,
  appLogger: AppLogger,
  services: HummingServices,
  observation: PluginSetupObservation,
  registerDisposeHandler: (handler: HummingPluginDisposeHandler) => void
): HummingPluginContext {
  const observedServices: HummingServices = {
    options: {
      ...services.options,
      registerSource(type, resolver) {
        observation.optionSources.push(type);
        services.options.registerSource(type, resolver);
      },
    },
    forwardProxy: {
      ...services.forwardProxy,
      registerBeforeMatch(hook, options) {
        observation.forwardHooks.beforeMatch += 1;
        services.forwardProxy.registerBeforeMatch(hook, {
          ...options,
          owner: options?.owner ?? describePlugin(plugin),
        });
      },
      registerBeforeRequest(hook, options) {
        observation.forwardHooks.beforeRequest += 1;
        services.forwardProxy.registerBeforeRequest(hook, {
          ...options,
          owner: options?.owner ?? describePlugin(plugin),
        });
      },
      registerAfterResponse(hook, options) {
        observation.forwardHooks.afterResponse += 1;
        services.forwardProxy.registerAfterResponse(hook, {
          ...options,
          owner: options?.owner ?? describePlugin(plugin),
        });
      },
      registerOnError(hook, options) {
        observation.forwardHooks.onError += 1;
        services.forwardProxy.registerOnError(hook, {
          ...options,
          owner: options?.owner ?? describePlugin(plugin),
        });
      },
      registerHooks(hooks, options) {
        if (hooks.beforeMatch) {
          observation.forwardHooks.beforeMatch += 1;
        }
        if (hooks.beforeRequest) {
          observation.forwardHooks.beforeRequest += 1;
        }
        if (hooks.afterResponse) {
          observation.forwardHooks.afterResponse += 1;
        }
        if (hooks.onError) {
          observation.forwardHooks.onError += 1;
        }
        services.forwardProxy.registerHooks(hooks, {
          ...options,
          owner: options?.owner ?? describePlugin(plugin),
        });
      },
    },
    localDebugRuntime: services.localDebugRuntime,
  };

  return {
    app,
    env: appEnv,
    logger: appLogger,
    services: observedServices,
    use(path, middleware) {
      observation.middlewarePaths.push(path);
      app.use(path, middleware);
    },
    route(path, routes) {
      observation.routeMounts.push({
        mountPath: path,
        routes: inspectMountedRoutes(routes, path),
      });
      app.route(path, routes);
    },
    onDispose(handler) {
      registerDisposeHandler(handler);
    },
  };
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function createDisposeErrorMessage(failedPlugins: string[]) {
  if (failedPlugins.length === 1) {
    return `Plugin disposal failed in "${failedPlugins[0]}".`;
  }

  return `Plugin disposal failed in ${failedPlugins.length} handlers.`;
}

async function executeDisposeHandlers(
  appLogger: AppLogger,
  disposeHandlers: RegisteredPluginDisposeHandler[]
) {
  const errors: Error[] = [];
  const failedPlugins: string[] = [];

  for (const entry of [...disposeHandlers].reverse()) {
    try {
      await entry.handler();
    } catch (error) {
      const normalizedError = toError(error);
      errors.push(normalizedError);
      failedPlugins.push(entry.pluginName);
      appLogger.error(
        {
          plugin: entry.pluginName,
          err: normalizedError,
        },
        'plugin dispose failed'
      );
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, createDisposeErrorMessage(failedPlugins));
  }
}

function executeDisposeHandlersSyncOnFailure(
  appLogger: AppLogger,
  disposeHandlers: RegisteredPluginDisposeHandler[]
) {
  const errors: Error[] = [];
  const failedPlugins: string[] = [];

  for (const entry of [...disposeHandlers].reverse()) {
    try {
      const result = entry.handler();
      if (result instanceof Promise) {
        void result.catch((error) => {
          const normalizedError = toError(error);
          appLogger.error(
            {
              plugin: entry.pluginName,
              err: normalizedError,
            },
            'plugin dispose failed during sync startup rollback'
          );
        });
      }
    } catch (error) {
      const normalizedError = toError(error);
      errors.push(normalizedError);
      failedPlugins.push(entry.pluginName);
      appLogger.error(
        {
          plugin: entry.pluginName,
          err: normalizedError,
        },
        'plugin dispose failed during sync startup rollback'
      );
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, createDisposeErrorMessage(failedPlugins));
  }
}

function summarizePluginObservations(observations: PluginSetupObservation[]) {
  return observations.map((observation) => ({
    name: observation.name,
    debugLabel: observation.debugLabel,
    middlewareCount: observation.middlewarePaths.length,
    middlewarePaths: observation.middlewarePaths,
    routeMountCount: observation.routeMounts.length,
    routeCount: observation.routeMounts.reduce((total, routeMount) => total + routeMount.routes.length, 0),
    routeMounts: observation.routeMounts,
    optionSources: observation.optionSources,
    forwardHooks: observation.forwardHooks,
    disposeHandlers: observation.disposeHandlers,
  }));
}

function logPluginSetupObservability(appLogger: AppLogger, observations: PluginSetupObservation[]) {
  if (observations.length === 0) {
    return;
  }

  appLogger.info(
    {
      pluginSetup: summarizePluginObservations(observations),
    },
    'plugin setup observed'
  );
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
  const disposeHandlers: RegisteredPluginDisposeHandler[] = [];
  const pluginObservations = new Map<HummingPlugin, PluginSetupObservation>();
  let disposePromise: Promise<void> | null = null;

  app.use('*', requestIdMiddleware);
  installErrorHandling(app, appEnv, appLogger, builtins);
  logPluginResolution(appLogger, pluginResolution, appEnv);
  const getPluginObservation = (plugin: HummingPlugin) => {
    let observation = pluginObservations.get(plugin);

    if (!observation) {
      observation = createPluginSetupObservation(plugin);
      pluginObservations.set(plugin, observation);
    }

    return observation;
  };
  const registerPluginDisposeHandler = (plugin: HummingPlugin, handler: HummingPluginDisposeHandler) => {
    getPluginObservation(plugin).disposeHandlers += 1;
    disposeHandlers.push({
      handler,
      pluginName: describePlugin(plugin),
    });
  };
  const createPluginRuntimeContext = (plugin: HummingPlugin) =>
    createPluginContext(
      plugin,
      app,
      appEnv,
      appLogger,
      services,
      getPluginObservation(plugin),
      (handler) => registerPluginDisposeHandler(plugin, handler)
    );

  const dispose = async () => {
    if (!disposePromise) {
      disposePromise = executeDisposeHandlers(appLogger, disposeHandlers).finally(() => {
        disposeHandlers.length = 0;
      });
    }

    return disposePromise;
  };

  const hummingApp = app as HummingApp;
  hummingApp.dispose = dispose;

  return {
    app: hummingApp,
    appEnv,
    appLogger,
    builtins,
    services,
    plugins,
    createPluginRuntimeContext,
    registerPluginDisposeHandler,
    getPluginObservations() {
      return plugins.map((plugin) => getPluginObservation(plugin));
    },
    dispose,
    disposeSyncOnFailure() {
      executeDisposeHandlersSyncOnFailure(appLogger, disposeHandlers);
      disposeHandlers.length = 0;
    },
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

export function createAppSync(options: CreateAppOptions = {}): HummingApp {
  const runtime = buildBaseApp(options);

  try {
    for (const plugin of runtime.plugins) {
      const result = plugin.setup(runtime.createPluginRuntimeContext(plugin));
      if (result instanceof Promise) {
        throw new Error(`Plugin "${describePlugin(plugin)}" is async. use createApp() instead of createAppSync().`);
      }
      if (typeof result === 'function') {
        runtime.registerPluginDisposeHandler(plugin, result);
      }
    }

    installBuiltins(runtime.app, runtime.builtins, runtime.services);
    installForwardTerminal(runtime.app, runtime.builtins, runtime.services);
    logPluginSetupObservability(runtime.appLogger, runtime.getPluginObservations());
    return runtime.app;
  } catch (error) {
    try {
      runtime.disposeSyncOnFailure();
    } catch (disposeError) {
      throw new AggregateError([toError(error), ...((disposeError as AggregateError).errors ?? [disposeError]).map(toError)], 'Failed to create app and dispose partially initialized plugins.');
    }

    throw error;
  }
}

export async function createApp(options: CreateAppOptions = {}): Promise<HummingApp> {
  const runtime = buildBaseApp(options);

  try {
    for (const plugin of runtime.plugins) {
      const result = await plugin.setup(runtime.createPluginRuntimeContext(plugin));
      if (typeof result === 'function') {
        runtime.registerPluginDisposeHandler(plugin, result);
      }
    }

    installBuiltins(runtime.app, runtime.builtins, runtime.services);
    installForwardTerminal(runtime.app, runtime.builtins, runtime.services);
    logPluginSetupObservability(runtime.appLogger, runtime.getPluginObservations());
    return runtime.app;
  } catch (error) {
    try {
      await runtime.dispose();
    } catch (disposeError) {
      const disposeErrors = disposeError instanceof AggregateError ? Array.from(disposeError.errors, toError) : [toError(disposeError)];
      throw new AggregateError(
        [toError(error), ...disposeErrors],
        'Failed to create app and dispose partially initialized plugins.'
      );
    }

    throw error;
  }
}
