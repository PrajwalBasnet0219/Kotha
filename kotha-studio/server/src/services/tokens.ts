import { createHash, randomUUID } from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env, isProd } from '../config/env';
import { unauthorized } from '../utils/errors';
import type { CookieOptions } from 'express';
import type { Role } from '@kotha/shared';

const ALGORITHM = 'HS256' as const;

export const REFRESH_COOKIE = 'kotha_refresh';

/** Refresh cookies are scoped to the auth router so other endpoints never see them. */
export const REFRESH_COOKIE_PATH = '/api/auth';

export interface AccessClaims extends JwtPayload {
  sub: string;
  role: Role;
  type: 'access';
}

export interface RefreshClaims extends JwtPayload {
  sub: string;
  role: Role;
  type: 'refresh';
  jti: string;
}

export interface AccessToken {
  token: string;
  expiresIn: number;
}

export interface RefreshToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const accessTtl = env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'];

export function signAccessToken(user: { _id: unknown; role: Role }): AccessToken {
  const token = jwt.sign(
    { sub: String(user._id), role: user.role, type: 'access' satisfies AccessClaims['type'] },
    env.JWT_ACCESS_SECRET,
    { algorithm: ALGORITHM, expiresIn: accessTtl },
  );
  const decoded = jwt.decode(token) as JwtPayload | null;
  const expiresIn =
    decoded?.exp !== undefined ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) : 15 * 60;
  return { token, expiresIn };
}

export function signRefreshToken(user: { _id: unknown; role: Role }): RefreshToken {
  const jti = randomUUID();
  const days = env.REFRESH_TOKEN_TTL_DAYS;
  const token = jwt.sign(
    { sub: String(user._id), role: user.role, type: 'refresh', jti },
    env.JWT_REFRESH_SECRET,
    { algorithm: ALGORITHM, expiresIn: `${days}d` as SignOptions['expiresIn'] },
  );
  return { token, jti, expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000) };
}

export function verifyAccessToken(token: string): AccessClaims {
  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALGORITHM] });
  } catch {
    throw unauthorized('TOKEN_INVALID', 'Invalid or expired access token');
  }
  if (typeof payload === 'string' || payload.type !== 'access' || typeof payload.sub !== 'string') {
    throw unauthorized('TOKEN_INVALID', 'Invalid access token');
  }
  return payload as AccessClaims;
}

export function verifyRefreshToken(token: string): RefreshClaims {
  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALGORITHM] });
  } catch {
    throw unauthorized('REFRESH_INVALID', 'Session is no longer valid. Sign in again.');
  }
  if (
    typeof payload === 'string' ||
    payload.type !== 'refresh' ||
    typeof payload.sub !== 'string' ||
    typeof payload.jti !== 'string'
  ) {
    throw unauthorized('REFRESH_INVALID', 'Session is no longer valid. Sign in again.');
  }
  return payload as RefreshClaims;
}

export const refreshCookieOptions = (expiresAt: Date): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: REFRESH_COOKIE_PATH,
  expires: expiresAt,
});

export const clearRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: REFRESH_COOKIE_PATH,
});
