import { Router } from 'express';
import { Furniture, Project, User } from '../models';
import { authenticate } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimit';
import { adminOnly } from '../middleware/role';
import { asyncHandler, ok } from '../utils/http';

export const adminRouter = Router();

adminRouter.use(authenticate, adminOnly, adminLimiter);

/**
 * Small read-only surface that proves the admin guard end to end. Real admin
 * features will grow from here.
 */
adminRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [users, projects, furniture] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      Furniture.countDocuments(),
    ]);
    return ok(res, { users, projects, furniture });
  }),
);
