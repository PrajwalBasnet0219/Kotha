import bcrypt from 'bcryptjs';

/** Work factor for every stored password. Deliberately slow. */
const BCRYPT_ROUNDS = 12;

/**
 * A real bcrypt hash of a throwaway string. When an email does not exist we
 * still run one comparison so that response timing does not reveal whether an
 * account exists. Never compare against a plain string or skip the work.
 */
const DUMMY_HASH = '$2a$12$G4P/efV3rGhDhIii.xPr4eHKJf8Dhx30nbM68/1AFvncUqlVUneqa';

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, BCRYPT_ROUNDS);

export const verifyPassword = (password: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(password, passwordHash);

/** Timing-safe dummy comparison for unknown accounts. Always returns false. */
export const verifyDummyPassword = async (password: string): Promise<false> => {
  await bcrypt.compare(password, DUMMY_HASH);
  return false;
};
