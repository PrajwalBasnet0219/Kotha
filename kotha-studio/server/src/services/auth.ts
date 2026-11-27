import { MAX_REFRESH_TOKENS, type Role } from '@kotha/shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { User, type UserDoc } from '../models/User';
import { conflict, forbidden, unauthorized } from '../utils/errors';
import { hashPassword, verifyDummyPassword, verifyPassword } from './password';
import {
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './tokens';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isVerified: boolean;
  avatarUrl: string;
  phone: string;
  address: { line: string; city: string };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SessionPayload {
  user: PublicUser;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
  adminCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

type UserDocument = InstanceType<typeof User>;

/**
 * Explicit allow-list. Never spread a Mongoose document into a response: the
 * schema transform is a safety net, not the contract.
 */
export function toPublicUser(user: UserDoc): PublicUser {
  const timestamps = user as unknown as { createdAt?: Date; updatedAt?: Date };
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    isVerified: user.isVerified,
    avatarUrl: user.avatarUrl ?? '',
    phone: user.phone ?? '',
    address: {
      line: user.address?.line ?? '',
      city: user.address?.city ?? '',
    },
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Drop expired sessions, then keep only the newest MAX_REFRESH_TOKENS. */
function pruneRefreshTokens(user: UserDocument): void {
  const now = Date.now();
  for (let i = user.refreshTokens.length - 1; i >= 0; i -= 1) {
    if (user.refreshTokens[i].expiresAt.getTime() <= now) user.refreshTokens.splice(i, 1);
  }
  if (user.refreshTokens.length > MAX_REFRESH_TOKENS) {
    user.refreshTokens.splice(0, user.refreshTokens.length - MAX_REFRESH_TOKENS);
  }
}

async function issueSession(user: UserDocument): Promise<SessionPayload> {
  const role = user.role as Role;
  const refresh = signRefreshToken({ _id: user._id, role });
  user.refreshTokens.push({
    hash: sha256(refresh.token),
    expiresAt: refresh.expiresAt,
    createdAt: new Date(),
  });
  pruneRefreshTokens(user);
  await user.save();

  const access = signAccessToken({ _id: user._id, role });
  return {
    user: toPublicUser(user),
    accessToken: access.token,
    expiresIn: access.expiresIn,
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
  };
}

export async function register(input: RegisterInput): Promise<SessionPayload> {
  const email = normalizeEmail(input.email);
  const role: Role = input.role ?? 'client';

  if (role === 'admin') {
    if (!input.adminCode || input.adminCode.trim() !== env.ADMIN_INVITE_CODE) {
      throw forbidden('That admin provisioning code is not valid.', 'ADMIN_CODE_INVALID');
    }
  }

  const existing = await User.findOne({ email }).select('_id').lean();
  if (existing) {
    throw conflict('EMAIL_TAKEN', 'An account already exists for that email.');
  }

  let user: UserDocument;
  try {
    user = await User.create({
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      role,
      isVerified: false,
      isActive: true,
      roleAudit:
        role === 'client'
          ? []
          : [
              {
                role,
                note:
                  role === 'admin'
                    ? 'admin provisioned at registration with the invite code'
                    : 'designer account created at registration',
                at: new Date(),
              },
            ],
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw conflict('EMAIL_TAKEN', 'An account already exists for that email.');
    }
    throw err;
  }

  logger.info({ userId: String(user._id), role }, 'user registered');
  return issueSession(user);
}

export async function login(input: LoginInput): Promise<SessionPayload> {
  const email = normalizeEmail(input.email);
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    // Keep the work comparable to a real comparison so timing does not leak.
    await verifyDummyPassword(input.password);
    throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (!user.isActive) {
    throw unauthorized('ACCOUNT_INACTIVE', 'This account is not available');
  }

  logger.info({ userId: String(user._id) }, 'user signed in');
  return issueSession(user);
}

export async function refresh(presentedToken: string): Promise<SessionPayload> {
  const claims = verifyRefreshToken(presentedToken);
  const presentedHash = sha256(presentedToken);

  const user = await User.findById(claims.sub);
  if (!user || !user.isActive) {
    throw unauthorized('REFRESH_INVALID', 'Session is no longer valid. Sign in again.');
  }

  const index = user.refreshTokens.findIndex((entry) => entry.hash === presentedHash);
  if (index === -1) {
    // Either already rotated, revoked, or forged. All equivalent from here.
    throw unauthorized('REFRESH_INVALID', 'Session is no longer valid. Sign in again.');
  }

  // Rotation: the presented token dies before the replacement is issued.
  user.refreshTokens.splice(index, 1);
  return issueSession(user);
}

export async function logout(presentedToken?: string): Promise<void> {
  if (!presentedToken) return;

  let subject: string;
  try {
    subject = verifyRefreshToken(presentedToken).sub;
  } catch {
    // An expired or malformed cookie is already useless; clearing it is enough.
    return;
  }

  await User.updateOne(
    { _id: subject },
    { $pull: { refreshTokens: { hash: sha256(presentedToken) } } },
  );
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw unauthorized('ACCOUNT_INACTIVE', 'This account is not available');
  }
  return toPublicUser(user);
}
