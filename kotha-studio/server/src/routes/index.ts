import { Router } from 'express';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { ok } from '../utils/http';

export const API_VERSION = '1.0.0';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) =>
  ok(res, {
    ok: true,
    uptime: Math.round(process.uptime() * 1000) / 1000,
    version: API_VERSION,
  }),
);

apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);
