import type { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../config/env';
import type { ForwardProxy } from '../forward/proxy';
import type { AppLogger } from '../logger';
import type { OptionsService } from '../options/service';
import type { AppBindings } from '../types';

export type HummingServices = {
  options: OptionsService;
  forwardProxy: ForwardProxy;
};

export type HummingPluginContext = {
  app: Hono<AppBindings>;
  env: AppEnv;
  logger: AppLogger;
  services: HummingServices;
  use: (path: string, middleware: MiddlewareHandler<AppBindings>) => void;
  route: (path: string, routes: Hono<AppBindings>) => void;
};

export type HummingPlugin = {
  name: string;
  setup: (context: HummingPluginContext) => void | Promise<void>;
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
