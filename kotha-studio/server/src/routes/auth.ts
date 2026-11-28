import { Router } from 'express';
import {
  login,
  loginBodySchema,
  logout,
  me,
  refresh,
  register,
  registerBodySchema,
} from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

/**
 * Public auth surface. Refresh and logout read the httpOnly cookie, so only
 * register/login are rate limited by IP attempts.
 */
export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerBodySchema }), register);
authRouter.post('/login', authLimiter, validate({ body: loginBodySchema }), login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
