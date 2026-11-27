import type { RequestHandler } from 'express';
import type { Role } from '@kotha/shared';
import { forbidden, unauthorized } from '../utils/errors';

/** Coarse access: what kind of user is this. Record-level access is authorizeOwnership. */
export const authorizeRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`This action needs the ${roles.join(' or ')} role.`));
    }
    next();
  };

export const adminOnly = authorizeRole('admin');
export const designerOrAdmin = authorizeRole('designer', 'admin');
