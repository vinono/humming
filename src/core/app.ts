import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { parseEnv, type AppEnv } from '../config/env';
import { createForwardProxy } from '../forward/proxy';
import { createLogger, type AppLogger } from '../logger';
import { requestIdMiddleware } from '../middleware/request-id';
import { createOptionsRoutes } from '../options/routes';
import { createOptionsService } from '../options/service';
import { createHealthRoutes } from '../routes/health';
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
      }),
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
  const plugins = options.plugins ?? [];
  const app = new Hono<AppBindings>();

  app.use('*', requestIdMiddleware);
  installErrorHandling(app, appEnv, appLogger, builtins);

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
      throw new Error(`Plugin "${plugin.name}" is async. use createApp() instead of createAppSync().`);
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
