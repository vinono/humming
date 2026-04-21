import type { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../config/env';
import type { ForwardProxy } from '../forward/proxy';
import type { AppLogger } from '../logger';
import type { OptionsService } from '../options/service';
import type { LocalDebugRuntimeService } from '../runtime/local-debug';
import type { AppBindings } from '../types';

export type HummingServices = {
  options: OptionsService;
  forwardProxy: ForwardProxy;
  localDebugRuntime: LocalDebugRuntimeService;
};

export type HummingPluginMode = 'all' | AppEnv['NODE_ENV'] | Array<AppEnv['NODE_ENV']>;

export type HummingPluginMeta = {
  priority?: number;
  mode?: HummingPluginMode;
  debugLabel?: string;
  dependencies?: string[];
  conflicts?: string[];
};

export type HummingPluginContext = {
  app: Hono<AppBindings>;
  env: AppEnv;
  logger: AppLogger;
  services: HummingServices;
  use: (path: string, middleware: MiddlewareHandler<AppBindings>) => void;
  route: (path: string, routes: Hono<AppBindings>) => void;
  onDispose: (handler: HummingPluginDisposeHandler) => void;
};

export type HummingPluginDisposeHandler = () => void | Promise<void>;

export type HummingPlugin = {
  name: string;
  meta?: HummingPluginMeta;
  setup: (context: HummingPluginContext) => void | HummingPluginDisposeHandler | Promise<void | HummingPluginDisposeHandler>;
};

export type HummingBuiltins = {
  health?: boolean;
  options?: boolean;
  forward?: boolean;
};

export type CreateAppOptions = {
  env?: AppEnv;
  logger?: AppLogger;
  plugins?: HummingPlugin[];
  builtins?: HummingBuiltins;
  services?: Partial<HummingServices>;
};

export type HummingApp = Hono<AppBindings> & {
  dispose: () => Promise<void>;
};
