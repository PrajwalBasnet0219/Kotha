import type { Types } from 'mongoose';
import type { Role } from '@kotha/shared';
import type { ProjectDoc } from '../models/Project';

export interface AuthUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      user?: AuthUser;
      project?: ProjectDoc;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
