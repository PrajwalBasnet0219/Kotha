import { useSyncExternalStore } from 'react';

export type Role = 'client' | 'designer' | 'admin';
export type ProductState = 'published' | 'draft' | 'archived';
export type ProjectState = 'draft' | 'in-review' | 'ready';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  source: 'password' | 'google';
  /** Local digest while the API is being built. The API will own real hashing. */
  secret: string;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  w: number;
  d: number;
  h: number;
  material: string;
  /** Budget guide in NPR — the studio does not sell the piece. */
  price: number;
  state: ProductState;
  updatedAt: string;
};

export type Category = { id: string; name: string };

export type ProjectRecord = {
  id: string;
  name: string;
  owner: string;
  ownerId: string;
  status: ProjectState;
  rooms: number;
  area: number;
  updatedAt: string;
};

export type Activity = { id: string; actor: string; action: string; at: string };

export type Db = {
  users: UserRecord[];
  products: Product[];
  categories: Category[];
  projects: ProjectRecord[];
  activity: Activity[];
};

const KEY = 'kotha:studio-db:v2';
const listeners = new Set<() => void>();
let cache: Db | null = null;

export function uid(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

/**
 * A stable, non-reversible-enough digest for the local store. Passwords are
 * never written to localStorage in clear text; the real API replaces this.
 */
export function localHash(value: string): string {
  let hash = 0x811c9dc5;
  const salted = `kotha::${value}`;
  for (let i = 0; i < salted.length; i++) {
    hash ^= salted.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Admin accounts are issued by Gritfeat, not self-serve. A person who has been
 * given the provisioning code can create an admin account at signup. Override
 * the code per environment with VITE_ADMIN_INVITE.
 */
export const ADMIN_INVITE_CODE =
  (import.meta.env.VITE_ADMIN_INVITE as string | undefined) ?? 'KOTHA-GRITFEAT-2026';

function seed(): Db {
  return {
    // No seeded accounts. Every account is created through signup, so the
    // product never depends on a demo login.
    users: [],
    categories: [
      { id: 'cat_seating', name: 'Seating' },
      { id: 'cat_tables', name: 'Tables' },
      { id: 'cat_storage', name: 'Storage' },
      { id: 'cat_lighting', name: 'Lighting' },
      { id: 'cat_plant', name: 'Plant' },
      { id: 'cat_textile', name: 'Textile' },
    ],
    products: [
      {
        id: 'prd_sofa',
        name: 'Two-seat sofa',
        category: 'Seating',
        w: 1840,
        d: 860,
        h: 780,
        material: 'Wool, beech frame',
        price: 89500,
        state: 'published',
        updatedAt: '2026-11-21T11:20:00+05:45',
      },
      {
        id: 'prd_chair',
        name: 'Lounge chair',
        category: 'Seating',
        w: 760,
        d: 800,
        h: 720,
        material: 'Oak, canvas',
        price: 42000,
        state: 'published',
        updatedAt: '2026-11-20T15:02:00+05:45',
      },
      {
        id: 'prd_table',
        name: 'Dining table',
        category: 'Tables',
        w: 1600,
        d: 900,
        h: 750,
        material: 'Sal wood',
        price: 54000,
        state: 'published',
        updatedAt: '2026-11-19T09:48:00+05:45',
      },
      {
        id: 'prd_shelf',
        name: 'Open shelving',
        category: 'Storage',
        w: 900,
        d: 320,
        h: 1800,
        material: 'Pine, steel pins',
        price: 32000,
        state: 'published',
        updatedAt: '2026-11-18T13:10:00+05:45',
      },
      {
        id: 'prd_lamp',
        name: 'Floor lamp',
        category: 'Lighting',
        w: 380,
        d: 380,
        h: 1620,
        material: 'Brass, linen shade',
        price: 18500,
        state: 'published',
        updatedAt: '2026-11-17T17:35:00+05:45',
      },
      {
        id: 'prd_fig',
        name: 'Fiddle-leaf fig',
        category: 'Plant',
        w: 520,
        d: 520,
        h: 1500,
        material: 'Ficus lyrata, terracotta',
        price: 4200,
        state: 'published',
        updatedAt: '2026-11-16T10:05:00+05:45',
      },
      {
        id: 'prd_chaise',
        name: 'Chaise, three-seat',
        category: 'Seating',
        w: 2900,
        d: 980,
        h: 760,
        material: 'Bouclé, walnut',
        price: 124000,
        state: 'published',
        updatedAt: '2026-11-22T12:12:00+05:45',
      },
      {
        id: 'prd_bed',
        name: 'Platform bed',
        category: 'Storage',
        w: 1600,
        d: 2000,
        h: 900,
        material: 'Teak, cotton',
        price: 98000,
        state: 'draft',
        updatedAt: '2026-11-23T08:30:00+05:45',
      },
      {
        id: 'prd_sideboard',
        name: 'Sideboard',
        category: 'Storage',
        w: 1500,
        d: 420,
        h: 750,
        material: 'Walnut veneer',
        price: 61000,
        state: 'published',
        updatedAt: '2026-11-15T14:22:00+05:45',
      },
      {
        id: 'prd_rug',
        name: 'Wool rug',
        category: 'Textile',
        w: 2400,
        d: 1700,
        h: 12,
        material: 'Hand-knotted wool',
        price: 34000,
        state: 'published',
        updatedAt: '2026-11-14T11:55:00+05:45',
      },
      {
        id: 'prd_stool',
        name: 'Workshop stool',
        category: 'Seating',
        w: 380,
        d: 380,
        h: 450,
        material: 'Ash, jute seat',
        price: 8600,
        state: 'archived',
        updatedAt: '2026-11-10T10:00:00+05:45',
      },
    ],
    projects: [],
    activity: [],
  };
}

function read(): Db {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<Db>;
    if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.users)) return seed();
    return {
      users: parsed.users,
      products: parsed.products,
      categories: parsed.categories ?? [],
      projects: parsed.projects ?? [],
      activity: parsed.activity ?? [],
    };
  } catch {
    return seed();
  }
}

export function getDb(): Db {
  if (!cache) cache = read();
  return cache;
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeDb(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDb(): Db {
  return useSyncExternalStore(subscribeDb, getDb, getDb);
}

export function mutate(fn: (db: Db) => Db): void {
  cache = fn(getDb());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* the session still works in memory */
  }
  emit();
}

export function withActivity(db: Db, actor: string, action: string): Db {
  const entry: Activity = {
    id: uid('act'),
    actor,
    action,
    at: new Date().toISOString(),
  };
  return { ...db, activity: [entry, ...db.activity].slice(0, 60) };
}

export function resetDb(): void {
  cache = seed();
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function newProduct(
  input: Pick<Product, 'name' | 'category' | 'w' | 'd' | 'h' | 'material' | 'price' | 'state'>,
): Product {
  return {
    id: uid('prd'),
    ...input,
    updatedAt: new Date().toISOString(),
  };
}

export const roleLabel = (role: Role): string =>
  role === 'admin' ? 'Admin' : role === 'designer' ? 'Designer' : 'Client';

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatNpr(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}
