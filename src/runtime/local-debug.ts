import type { Context } from 'hono';
import type { AppBindings } from '../types';

export type LocalDebugRuntimeCookies = Record<string, string>;

export type LocalDebugRuntimeState = {
  loginEnv: string | null;
  target: string | null;
  configCenterHost: string | null;
  tenant: string | null;
  cookies: LocalDebugRuntimeCookies;
  updatedAt: string | null;
};

export type LocalDebugRuntimePatch = Partial<{
  loginEnv: string | null;
  target: string | null;
  configCenterHost: string | null;
  tenant: string | null;
  cookies: LocalDebugRuntimeCookies;
  updatedAt: string | null;
}>;

export type LocalDebugRuntimeService = {
  getRuntimeState(): LocalDebugRuntimeState;
  setRuntimeState(patch: LocalDebugRuntimePatch): LocalDebugRuntimeState;
  clearRuntimeState(): LocalDebugRuntimeState;
};

function cloneCookies(cookies: LocalDebugRuntimeCookies): LocalDebugRuntimeCookies {
  return { ...cookies };
}

function createEmptyState(updatedAt: string | null): LocalDebugRuntimeState {
  return {
    loginEnv: null,
    target: null,
    configCenterHost: null,
    tenant: null,
    cookies: {},
    updatedAt,
  };
}

function cloneState(state: LocalDebugRuntimeState): LocalDebugRuntimeState {
  return {
    loginEnv: state.loginEnv,
    target: state.target,
    configCenterHost: state.configCenterHost,
    tenant: state.tenant,
    cookies: cloneCookies(state.cookies),
    updatedAt: state.updatedAt,
  };
}

export function createLocalDebugRuntime(initialState?: LocalDebugRuntimePatch): LocalDebugRuntimeService {
  let currentState = createEmptyState(null);

  if (initialState) {
    currentState = {
      ...currentState,
      ...initialState,
      cookies: initialState.cookies ? cloneCookies(initialState.cookies) : currentState.cookies,
      updatedAt: initialState.updatedAt ?? new Date().toISOString(),
    };
  }

  return {
    getRuntimeState() {
      return cloneState(currentState);
    },
    setRuntimeState(patch) {
      currentState = {
        ...currentState,
        ...patch,
        cookies: patch.cookies ? cloneCookies(patch.cookies) : cloneCookies(currentState.cookies),
        updatedAt: patch.updatedAt ?? new Date().toISOString(),
      };
      return cloneState(currentState);
    },
    clearRuntimeState() {
      currentState = createEmptyState(new Date().toISOString());
      return cloneState(currentState);
    },
  };
}

export function markLocalDebugRuntimeApplied(context: Context<AppBindings>) {
  context.set('localDebugRuntimeApplied', true);
}

export function isLocalDebugRuntimeApplied(context: Context<AppBindings>) {
  return context.get('localDebugRuntimeApplied');
}
