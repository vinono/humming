import type { MiddlewareHandler } from 'hono';
import type { Context } from 'hono';
import { definePlugin } from '../core';
import type { AppBindings, AuthUser } from '../types';

type PathPattern = string | RegExp;

type AuthPluginValidationResult =
  | boolean
  | Response
  | {
      ok: boolean;
      user?: AuthUser;
      response?: Response;
    };

export type AuthPluginValidateInput = {
  context: Context<AppBindings>;
  requestId: string;
  method: string;
  path: string;
  headerValue: string;
  token: string;
  currentUser: AuthUser;
};

export type AuthPluginJwtOptions = {
  secret: string;
  issuer?: string;
  audience?: string | string[];
  algorithms?: Array<'HS256'>;
  rolesClaim?: string;
  userTransformer?: (input: {
    payload: Record<string, unknown>;
    token: string;
    headerValue: string;
  }) => AuthUser | Promise<AuthUser>;
};

export type AuthPluginRoleRule = {
  paths: PathPattern[];
  roles: string[];
  match?: 'all' | 'any';
  errorMessage?: string;
};

export type AuthPluginOptions = {
  headerName?: string;
  scheme?: string | null;
  publicPaths?: PathPattern[];
  validate?: (input: AuthPluginValidateInput) => AuthPluginValidationResult | Promise<AuthPluginValidationResult>;
  jwt?: AuthPluginJwtOptions;
  requiredRoles?: string[];
  roleRules?: AuthPluginRoleRule[];
  missingTokenMessage?: string;
  invalidTokenMessage?: string;
  forbiddenMessage?: string;
};

function isPathMatched(path: string, pattern: PathPattern): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path);
  }

  if (pattern.endsWith('*')) {
    return path.startsWith(pattern.slice(0, -1));
  }

  return path === pattern;
}

function isPublicPath(path: string, patterns: PathPattern[]): boolean {
  return patterns.some((pattern) => isPathMatched(path, pattern));
}

function unauthorizedResponse(
  c: Context<AppBindings>,
  errorCode: string,
  errorMsg: string
): Response {
  return c.json(
    {
      result: false,
      errorCode,
      errorMsg,
      requestId: c.get('requestId'),
    },
    401
  );
}

function forbiddenResponse(
  c: Context<AppBindings>,
  errorCode: string,
  errorMsg: string
): Response {
  return c.json(
    {
      result: false,
      errorCode,
      errorMsg,
      requestId: c.get('requestId'),
    },
    403
  );
}

function extractToken(headerValue: string | undefined, scheme: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  if (!scheme) {
    const token = headerValue.trim();
    return token.length > 0 ? token : null;
  }

  const prefix = `${scheme} `;
  if (!headerValue.startsWith(prefix)) {
    return null;
  }

  const token = headerValue.slice(prefix.length).trim();
  return token.length > 0 ? token : null;
}

function toBase64(value: string): string {
  const remainder = value.length % 4;
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  if (remainder === 0) {
    return normalized;
  }

  return `${normalized}${'='.repeat(4 - remainder)}`;
}

function decodeBase64UrlString(value: string): string {
  return atob(toBase64(value));
}

function decodeBase64UrlBytes(value: string): Uint8Array {
  return Uint8Array.from(decodeBase64UrlString(value), (char) => char.charCodeAt(0));
}

function parseJwtSection<T>(value: string): T {
  const decoded = decodeBase64UrlString(value);
  return JSON.parse(decoded) as T;
}

function isEqualBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    const leftByte = left[i];
    const rightByte = right[i];

    if (leftByte === undefined || rightByte === undefined) {
      return false;
    }

    diff |= leftByte ^ rightByte;
  }

  return diff === 0;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

async function verifyJwtToken(token: string, options: AuthPluginJwtOptions): Promise<Record<string, unknown>> {
  const segments = token.split('.');
  if (segments.length !== 3) {
    throw new Error('JWT must have exactly 3 sections');
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    throw new Error('JWT sections must not be empty');
  }

  const header = parseJwtSection<{ alg?: string; typ?: string }>(headerSegment);
  const payload = parseJwtSection<Record<string, unknown>>(payloadSegment);
  const algorithms = options.algorithms ?? ['HS256'];

  if (!header.alg || !algorithms.includes(header.alg as 'HS256')) {
    throw new Error(`Unsupported JWT algorithm: ${header.alg ?? 'unknown'}`);
  }

  if (header.alg !== 'HS256') {
    throw new Error(`JWT algorithm is not supported yet: ${header.alg}`);
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(options.secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signed = `${headerSegment}.${payloadSegment}`;
  const expectedSignature = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signed)
    )
  );
  const actualSignature = decodeBase64UrlBytes(signatureSegment);

  if (!isEqualBytes(expectedSignature, actualSignature)) {
    throw new Error('JWT signature is invalid');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === 'number' ? payload.exp : null;
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : null;
  const issuer = typeof payload.iss === 'string' ? payload.iss : null;
  const audiences = Array.isArray(payload.aud)
    ? payload.aud.filter((item): item is string => typeof item === 'string')
    : typeof payload.aud === 'string'
      ? [payload.aud]
      : [];

  if (exp !== null && now >= exp) {
    throw new Error('JWT has expired');
  }

  if (nbf !== null && now < nbf) {
    throw new Error('JWT is not active yet');
  }

  if (options.issuer && issuer !== options.issuer) {
    throw new Error('JWT issuer is invalid');
  }

  if (options.audience) {
    const expectedAudiences = Array.isArray(options.audience) ? options.audience : [options.audience];
    const hasAudience = expectedAudiences.some((expected) => audiences.includes(expected));
    if (!hasAudience) {
      throw new Error('JWT audience is invalid');
    }
  }

  return payload;
}

async function resolveAuthenticatedUser(
  token: string,
  headerValue: string,
  options: AuthPluginOptions
): Promise<AuthUser> {
  if (options.jwt) {
    const payload = await verifyJwtToken(token, options.jwt);

    if (options.jwt.userTransformer) {
      return options.jwt.userTransformer({
        payload,
        token,
        headerValue,
      });
    }

    const rolesClaim = options.jwt.rolesClaim ?? 'roles';
    const subject = typeof payload.sub === 'string' ? payload.sub : undefined;
    const id =
      typeof payload.userId === 'string'
        ? payload.userId
        : typeof payload.id === 'string'
          ? payload.id
          : subject;

    return {
      token,
      headerValue,
      subject,
      id,
      roles: asStringArray(payload[rolesClaim]),
      claims: payload,
    };
  }

  return {
    token,
    headerValue,
  };
}

function getRoleRules(path: string, options: AuthPluginOptions): AuthPluginRoleRule[] {
  const rules: AuthPluginRoleRule[] = [];

  if (options.requiredRoles && options.requiredRoles.length > 0) {
    rules.push({
      paths: [/.*/],
      roles: options.requiredRoles,
      match: 'all',
      errorMessage: options.forbiddenMessage,
    });
  }

  for (const rule of options.roleRules ?? []) {
    if (rule.paths.some((pattern) => isPathMatched(path, pattern))) {
      rules.push(rule);
    }
  }

  return rules;
}

function hasRequiredRoles(user: AuthUser, rule: AuthPluginRoleRule): boolean {
  const roles = new Set(user.roles ?? []);
  const match = rule.match ?? 'all';

  if (match === 'any') {
    return rule.roles.some((role) => roles.has(role));
  }

  return rule.roles.every((role) => roles.has(role));
}

function createAuthMiddleware(options: AuthPluginOptions): MiddlewareHandler<AppBindings> {
  if (!options.validate && !options.jwt) {
    throw new Error('createAuthPlugin requires either validate() or jwt configuration');
  }

  const headerName = options.headerName ?? 'authorization';
  const scheme = options.scheme ?? 'Bearer';
  const publicPaths = options.publicPaths ?? ['/health'];
  const missingTokenMessage =
    options.missingTokenMessage ??
    `Missing ${scheme ? `${scheme} ` : ''}token in header ${headerName}`;
  const invalidTokenMessage = options.invalidTokenMessage ?? 'Unauthorized';
  const forbiddenMessage = options.forbiddenMessage ?? 'Forbidden';

  return async (c, next) => {
    if (isPublicPath(c.req.path, publicPaths)) {
      await next();
      return;
    }

    const headerValue = c.req.header(headerName);
    const token = extractToken(headerValue, scheme);

    if (!token || !headerValue) {
      return unauthorizedResponse(c, 'AUTH_TOKEN_REQUIRED', missingTokenMessage);
    }

    let currentUser: AuthUser;
    try {
      currentUser = await resolveAuthenticatedUser(token, headerValue, options);
    } catch (error) {
      return unauthorizedResponse(
        c,
        'AUTH_UNAUTHORIZED',
        error instanceof Error ? error.message : invalidTokenMessage
      );
    }

    const result = options.validate
      ? await options.validate({
          context: c,
          requestId: c.get('requestId'),
          method: c.req.method,
          path: c.req.path,
          headerValue,
          token,
          currentUser,
        })
      : true;

    if (result instanceof Response) {
      return result;
    }

    if (result === true) {
      c.set('authUser', currentUser);
      const rules = getRoleRules(c.req.path, options);
      for (const rule of rules) {
        if (!hasRequiredRoles(currentUser, rule)) {
          return forbiddenResponse(c, 'AUTH_FORBIDDEN', rule.errorMessage ?? forbiddenMessage);
        }
      }
      await next();
      return;
    }

    if (result && typeof result === 'object' && result.ok) {
      const finalUser = result.user ?? currentUser;
      c.set('authUser', finalUser);
      const rules = getRoleRules(c.req.path, options);
      for (const rule of rules) {
        if (!hasRequiredRoles(finalUser, rule)) {
          return forbiddenResponse(c, 'AUTH_FORBIDDEN', rule.errorMessage ?? forbiddenMessage);
        }
      }
      await next();
      return;
    }

    if (result && typeof result === 'object' && result.response instanceof Response) {
      return result.response;
    }

    return unauthorizedResponse(c, 'AUTH_UNAUTHORIZED', invalidTokenMessage);
  };
}

export function createAuthPlugin(options: AuthPluginOptions) {
  return definePlugin({
    name: 'auth',
    setup({ use }) {
      use('*', createAuthMiddleware(options));
    },
  });
}
