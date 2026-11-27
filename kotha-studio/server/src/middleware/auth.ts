import type { RequestHandler } from 'express';
import { User } from '../models/User';
import { verifyAccessToken } from '../services/tokens';
import { forbidden, unauthorized } from '../utils/errors';
import { asyncHandler } from '../utils/http';
import type { AuthUser } from '../types/express';

const bearer = (header?: string): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

export const toAuthUser = (doc: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
}): AuthUser =>
  ({
    _id: doc._id,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    isVerified: doc.isVerified,
    isActive: doc.isActive,
  }) as AuthUser;

/** Who is calling. 401 when the token is missing, expired or tampered with. */
export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = bearer(req.header('authorization'));
  if (!token) throw unauthorized('TOKEN_MISSING', 'Authentication required');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw unauthorized('TOKEN_EXPIRED', 'Your session has expired. Sign in again.');
  }

  const user = await User.findById(payload.sub).lean();
  if (!user || !user.isActive) throw unauthorized('TOKEN_INVALID', 'Account is not available');

  req.user = toAuthUser(user);
  next();
});

/** Attaches the user when a token is present, but never blocks the request. */
export const optionalAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = bearer(req.header('authorization'));
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).lean();
    if (user && user.isActive) req.user = toAuthUser(user);
  } catch {
    /* an invalid token on a public route is simply ignored */
  }
  next();
});

export const requireVerified: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!req.user.isVerified) {
    return next(forbidden('Verify your email address before doing this.', 'EMAIL_NOT_VERIFIED'));
  }
  next();
};
