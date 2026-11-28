import { loginSchema, registerSchema, ROLES } from '@kotha/shared';
import { z } from 'zod';
import * as authService from '../services/auth';
import {
  REFRESH_COOKIE,
  clearRefreshCookieOptions,
  refreshCookieOptions,
} from '../services/tokens';
import { validate, validated } from '../middleware/validate';
import { asyncHandler, created, ok } from '../utils/http';
import { unauthorized } from '../utils/errors';
import type { Request, Response } from 'express';

export const registerBodySchema = registerSchema.extend({
  role: z.enum(ROLES).default('client'),
  adminCode: z.string().trim().max(120).optional(),
});

export const loginBodySchema = loginSchema;

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;

const startSession = (res: Response, session: authService.SessionPayload): void => {
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions(session.refreshExpiresAt));
};

const sessionResponse = (session: authService.SessionPayload) => ({
  user: session.user,
  accessToken: session.accessToken,
  expiresIn: session.expiresIn,
});

const presentedRefreshToken = (req: Request): string | undefined => {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const register = asyncHandler(async (req, res) => {
  const body = validated<RegisterBody>(req, 'body');
  const session = await authService.register(body);
  startSession(res, session);
  return created(res, sessionResponse(session));
});

export const login = asyncHandler(async (req, res) => {
  const body = validated<LoginBody>(req, 'body');
  const session = await authService.login(body);
  startSession(res, session);
  return ok(res, sessionResponse(session));
});

export const refresh = asyncHandler(async (req, res) => {
  const token = presentedRefreshToken(req);
  if (!token) {
    throw unauthorized('REFRESH_MISSING', 'Session is no longer valid. Sign in again.');
  }
  const session = await authService.refresh(token);
  startSession(res, session);
  return ok(res, sessionResponse(session));
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(presentedRefreshToken(req));
  res.clearCookie(REFRESH_COOKIE, clearRefreshCookieOptions());
  return ok(res, { ok: true });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) throw unauthorized();
  const user = await authService.getMe(String(req.user._id));
  return ok(res, { user });
});
