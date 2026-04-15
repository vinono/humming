import { describe, expect, it } from 'bun:test';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('uses defaults when optional env vars are not provided', () => {
    const parsed = parseEnv({});

    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.PORT).toBe(8787);
    expect(parsed.LOG_LEVEL).toBe('info');
    expect(parsed.FORWARD_ENABLED).toBe(true);
    expect(parsed.FORWARD_TIMEOUT_MS).toBe(15_000);
    expect(parsed.FORWARD_BLOCK_PRIVATE_IP).toBe(true);
    expect(parsed.FORWARD_RULES).toBe('[]');
    expect(parsed.FORWARD_TRANSPORT).toBe('fetch');
    expect(parsed.FORWARD_TRANSPORT_RETRY_MAX_ATTEMPTS).toBe(3);
    expect(parsed.FORWARD_TRANSPORT_RETRY_DELAY_MS).toBe(100);
  });

  it('parses boolean-like env values', () => {
    const parsed = parseEnv({
      FORWARD_ENABLED: 'false',
      FORWARD_BLOCK_PRIVATE_IP: '0',
    });

    expect(parsed.FORWARD_ENABLED).toBe(false);
    expect(parsed.FORWARD_BLOCK_PRIVATE_IP).toBe(false);
  });

  it('validates fallback URL protocol', () => {
    expect(() => parseEnv({ FORWARD_FALLBACK_TARGET: 'ftp://example.com' })).toThrow();
  });

  it('parses forward transport settings', () => {
    const parsed = parseEnv({
      FORWARD_TRANSPORT: 'retry-fetch',
      FORWARD_TRANSPORT_RETRY_MAX_ATTEMPTS: '4',
      FORWARD_TRANSPORT_RETRY_DELAY_MS: '250',
    });

    expect(parsed.FORWARD_TRANSPORT).toBe('retry-fetch');
    expect(parsed.FORWARD_TRANSPORT_RETRY_MAX_ATTEMPTS).toBe(4);
    expect(parsed.FORWARD_TRANSPORT_RETRY_DELAY_MS).toBe(250);
  });
});
