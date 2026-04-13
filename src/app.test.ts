import { describe, expect, it } from 'bun:test';
import { parseEnv } from './config/env';
import { createAppSync } from './app';

type ErrorBody = {
  result: boolean;
  errorCode: string;
  requestId: string;
};

describe('app integration', () => {
  it('returns validation errors as 400 for invalid options payload', async () => {
    const app = createAppSync({
      env: parseEnv({
        FORWARD_ENABLED: 'false',
      }),
    });
    const response = await app.request('/api/options', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ key: 'invalid-shape' }),
    });
    const body = (await response.json()) as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.result).toBe(false);
    expect(body.errorCode).toBe('VALIDATION_ERROR');
  });
});
