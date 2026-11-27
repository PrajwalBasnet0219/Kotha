import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ADMIN_INVITE_CODE,
  localHash,
  mutate,
  uid,
  useDb,
  withActivity,
  type Role,
  type UserRecord,
} from '../lib/store';

const SESSION_KEY = 'kotha:session';
const SESSION_STORAGE_KEY = 'kotha:session';

type Result = { ok: true; user: UserRecord } | { ok: false; error: string };

type SignUpInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
  adminCode?: string;
  remember?: boolean;
};

type AuthValue = {
  user: UserRecord | null;
  signIn: (email: string, password: string, remember?: boolean) => Result;
  signUp: (input: SignUpInput) => Result;
  signInWithGoogle: (email: string, name: string) => Result;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function readSession(): string | null {
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ??
      window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string };
    return parsed.userId ?? null;
  } catch {
    return null;
  }
}

function writeSession(userId: string | null, remember = true): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    if (userId) {
      const value = JSON.stringify({ userId });
      if (remember) window.localStorage.setItem(SESSION_KEY, value);
      else window.sessionStorage.setItem(SESSION_STORAGE_KEY, value);
    }
  } catch {
    /* session still lives in memory */
  }
}

function starterProject(user: UserRecord) {
  return {
    id: uid('prj'),
    name: 'My first plan',
    owner: user.name,
    ownerId: user.id,
    status: 'draft' as const,
    rooms: 0,
    area: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useDb();
  const [userId, setUserId] = useState<string | null>(() => readSession());

  const user = useMemo(
    () => db.users.find((entry) => entry.id === userId) ?? null,
    [db.users, userId],
  );

  // A removed or role-changed account must never keep a stale session.
  useEffect(() => {
    if (userId && !db.users.some((entry) => entry.id === userId)) {
      setUserId(null);
      writeSession(null);
    }
  }, [db.users, userId]);

  const enter = useCallback((entry: UserRecord, remember = true): Result => {
    setUserId(entry.id);
    writeSession(entry.id, remember);
    return { ok: true, user: entry };
  }, []);

  const signIn = useCallback(
    (email: string, password: string, remember = true): Result => {
      const address = email.trim().toLowerCase();
      if (!address || !password) {
        return { ok: false, error: 'Enter your email and password to continue.' };
      }
      const found = db.users.find((entry) => entry.email === address);
      if (!found) {
        return { ok: false, error: 'No account uses that address. Create one to get started.' };
      }
      if (found.source === 'google') {
        return { ok: false, error: 'This account uses Google sign-in. Continue with Google instead.' };
      }
      if (found.secret !== localHash(password)) {
        return { ok: false, error: 'That password does not match this account.' };
      }
      mutate((current) => withActivity(current, found.name, 'signed in'));
      return enter(found, remember);
    },
    [db.users, enter],
  );

  const signUp = useCallback(
    ({ name, email, password, role, adminCode, remember = true }: SignUpInput): Result => {
      const address = email.trim().toLowerCase();
      const cleanName = name.trim();
      if (!cleanName) return { ok: false, error: 'Add your name so the studio knows who is drawing.' };
      if (!address) return { ok: false, error: 'Add an email address for your account.' };
      if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return { ok: false, error: 'Passwords need at least 10 characters, with a letter and a number.' };
      }
      if (db.users.some((entry) => entry.email === address)) {
        return { ok: false, error: 'An account already exists for that address. Sign in instead.' };
      }
      if (role === 'admin' && adminCode?.trim() !== ADMIN_INVITE_CODE) {
        return { ok: false, error: 'That admin provisioning code is not valid. Ask Gritfeat for access.' };
      }

      const entry: UserRecord = {
        id: uid('user'),
        name: cleanName,
        email: address,
        role,
        source: 'password',
        secret: localHash(password),
        createdAt: new Date().toISOString(),
      };
      const project = starterProject(entry);
      mutate((current) =>
        withActivity(
          {
            ...current,
            users: [...current.users, entry],
            projects: [project, ...current.projects],
          },
          entry.name,
          `joined as a ${role}`,
        ),
      );
      return enter(entry, remember);
    },
    [db.users, enter],
  );

  const signInWithGoogle = useCallback(
    (email: string, name: string): Result => {
      const address = email.trim().toLowerCase();
      const cleanName = name.trim();
      if (!address) return { ok: false, error: 'Choose a Google account to continue.' };
      const existing = db.users.find((entry) => entry.email === address);
      if (existing) {
        return enter(existing, true);
      }
      const entry: UserRecord = {
        id: uid('user'),
        name: cleanName || address.split('@')[0],
        email: address,
        role: 'client',
        source: 'google',
        secret: '',
        createdAt: new Date().toISOString(),
      };
      const project = starterProject(entry);
      mutate((current) =>
        withActivity(
          {
            ...current,
            users: [...current.users, entry],
            projects: [project, ...current.projects],
          },
          entry.name,
          'joined with Google',
        ),
      );
      return enter(entry, true);
    },
    [db.users, enter],
  );

  const signOut = useCallback(() => {
    setUserId(null);
    writeSession(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, signIn, signUp, signInWithGoogle, signOut }),
    [user, signIn, signUp, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export function roleHome(role: Role): string {
  return role === 'admin' ? '/admin' : '/studio';
}
