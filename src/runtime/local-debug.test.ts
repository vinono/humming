import { describe, expect, it } from 'bun:test';
import { createLocalDebugRuntime } from './local-debug';

describe('local debug runtime', () => {
  it('stores, clones, and clears runtime state', () => {
    const runtime = createLocalDebugRuntime();

    expect(runtime.getRuntimeState()).toEqual({
      loginEnv: null,
      target: null,
      configCenterHost: null,
      tenant: null,
      cookies: {},
      updatedAt: null,
    });

    const updated = runtime.setRuntimeState({
      loginEnv: 'daily',
      target: 'https://daily.example.com',
      configCenterHost: 'https://config.daily.example.com',
      tenant: 'cn',
      cookies: {
        session: 'abc',
      },
    });

    expect(updated.loginEnv).toBe('daily');
    expect(updated.target).toBe('https://daily.example.com');
    expect(updated.configCenterHost).toBe('https://config.daily.example.com');
    expect(updated.tenant).toBe('cn');
    expect(updated.cookies).toEqual({
      session: 'abc',
    });
    expect(typeof updated.updatedAt).toBe('string');

    const snapshot = runtime.getRuntimeState();
    snapshot.cookies.session = 'tampered';

    expect(runtime.getRuntimeState().cookies.session).toBe('abc');

    const cleared = runtime.clearRuntimeState();

    expect(cleared.loginEnv).toBeNull();
    expect(cleared.target).toBeNull();
    expect(cleared.configCenterHost).toBeNull();
    expect(cleared.tenant).toBeNull();
    expect(cleared.cookies).toEqual({});
    expect(typeof cleared.updatedAt).toBe('string');
  });
});
