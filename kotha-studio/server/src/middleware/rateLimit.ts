import rateLimit, { type Options } from 'express-rate-limit';
import { env, isTest } from '../config/env';
import type { Request, Response } from 'express';

const limitBody = (message: string) => (req: Request, res: Response) => {
  res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
};

const base: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Tests run every request from one address; the limiter itself is exercised
  // in production settings rather than being disabled by the test suite.
  skip: () => isTest,
};

/** Broad ceiling for the whole API. */
export const globalLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  handler: limitBody('Too many requests. Slow down and try again shortly.'),
});

/** Credential endpoints get their own, much tighter bucket. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  handler: limitBody('Too many sign-in attempts. Try again in 15 minutes.'),
});

/** Used by an admin route that may be polled more often than the rest. */
export const adminLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 120,
  handler: limitBody('Too many admin requests. Try again shortly.'),
});
