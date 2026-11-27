import { z } from 'zod';
import {
  CALIBRATION_RANGE_MM,
  COLOUR_TOKENS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_WALL_HEIGHT_MM,
  DEFAULT_WALL_THICKNESS_MM,
  DOOR_HEIGHT_RANGE,
  DOOR_WIDTH_RANGE,
  FLOOR_FINISHES,
  FURNITURE_MATERIALS,
  FURNITURE_SORTS,
  MAX_DIM_MM,
  MAX_OPENINGS_PER_WALL,
  MAX_PAGE_SIZE,
  MAX_PLACEMENTS,
  MAX_PRICE_PAISA,
  MAX_PRODUCT_IMAGES,
  MAX_SHARED_WITH,
  MAX_SPACES,
  MIN_DIM_MM,
  MIN_PRICE_PAISA,
  MIN_WALL_LENGTH_MM,
  PROJECT_SORTS,
  PROJECT_STATUSES,
  REVIEW_TARGETS,
  ROLES,
  ROOM_TYPES,
  WALL_FINISHES,
  WINDOW_HEIGHT_RANGE,
  WINDOW_SILL_RANGE,
  WINDOW_WIDTH_RANGE,
} from './constants';

// ---------------------------------------------------------------- primitives
export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'must be a 24-character hexadecimal id');

export const point = z.tuple([z.number().finite(), z.number().finite()]);

export const email = z.string().trim().toLowerCase().email().max(160);

export const password = z
  .string()
  .min(10, 'at least 10 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'must contain a letter')
  .regex(/\d/, 'must contain a number');

export const mm = z.number().int().min(MIN_DIM_MM).max(MAX_DIM_MM);

export const paisa = z.number().int().min(MIN_PRICE_PAISA).max(MAX_PRICE_PAISA);

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

// ---------------------------------------------------------------- blueprint
export const spaceSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  type: z.enum(ROOM_TYPES),
  polygon: z.array(point).min(3).max(24),
  wallIds: z.array(z.string().min(1).max(40)).min(3).max(24),
});

export const wallSchema = z.object({
  id: z.string().min(1).max(40),
  from: point,
  to: point,
  spaceIds: z.array(z.string().min(1).max(40)).min(1).max(2),
  shared: z.boolean().default(false),
});

export const openingSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(['door', 'window']),
  wallId: z.string().min(1).max(40),
  offsetMm: z.number().int().min(0),
  widthMm: z.number().int().min(100).max(3000),
  heightMm: z.number().int().min(100).max(3000),
  sillMm: z.number().int().min(0).max(2000).default(0),
  swing: z.enum(['inward-left', 'inward-right', 'outward-left', 'outward-right']).default('inward-left'),
  connects: z.array(z.string().min(1).max(40)).max(2).default([]),
});

export const scaleSchema = z.object({
  mmPerUnit: z.number().positive().default(1),
  calibrated: z.boolean().default(false),
  reference: z
    .object({ a: point, b: point, declaredMm: z.number().int() })
    .nullable()
    .default(null),
});

export const blueprintSchema = z.object({
  schemaVersion: z.literal(2).default(2),
  revision: z.number().int().min(0).default(0),
  scale: scaleSchema.default({ mmPerUnit: 1, calibrated: false, reference: null }),
  wall: z
    .object({
      thicknessMm: z.number().int().min(60).max(400).default(DEFAULT_WALL_THICKNESS_MM),
      heightMm: z.number().int().min(2200).max(4000).default(DEFAULT_WALL_HEIGHT_MM),
    })
    .default({ thicknessMm: DEFAULT_WALL_THICKNESS_MM, heightMm: DEFAULT_WALL_HEIGHT_MM }),
  spaces: z.array(spaceSchema).min(1).max(MAX_SPACES),
  walls: z.array(wallSchema).min(3).max(72),
  openings: z.array(openingSchema).max(MAX_SPACES * 24).default([]),
  referenceImage: z
    .object({
      url: z.string().url(),
      opacity: z.number().min(0).max(1).default(0.4),
      locked: z.boolean().default(false),
    })
    .nullable()
    .default(null),
});

export const calibrateSchema = z.object({
  a: point,
  b: point,
  declaredMm: z.number().int().min(CALIBRATION_RANGE_MM[0]).max(CALIBRATION_RANGE_MM[1]),
  revision: z.number().int().min(0),
});

export const blueprintPutSchema = z.object({
  blueprint: blueprintSchema,
  revision: z.number().int().min(0),
});

export const openingCreateSchema = z.object({
  kind: z.enum(['door', 'window']),
  wallId: z.string().min(1).max(40),
  offsetMm: z.number().int().min(0),
  widthMm: z.number().int().optional(),
  heightMm: z.number().int().optional(),
  sillMm: z.number().int().min(0).max(2000).optional(),
  swing: openingSchema.shape.swing.optional(),
  revision: z.number().int().min(0),
});

export const openingPatchSchema = z
  .object({
    offsetMm: z.number().int().min(0).optional(),
    widthMm: z.number().int().optional(),
    heightMm: z.number().int().optional(),
    sillMm: z.number().int().min(0).max(2000).optional(),
    swing: openingSchema.shape.swing.optional(),
    revision: z.number().int().min(0),
  })
  .refine((v) => Object.keys(v).length > 1, 'nothing to update');

/** Size rules that depend on the opening kind. Applied by the service, not the shape. */
export const OPENING_RANGES = {
  door: { width: DOOR_WIDTH_RANGE, height: DOOR_HEIGHT_RANGE, sill: [0, 0] as const },
  window: { width: WINDOW_WIDTH_RANGE, height: WINDOW_HEIGHT_RANGE, sill: WINDOW_SILL_RANGE },
} as const;

// ---------------------------------------------------------------- auth
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email,
  password,
});

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password });
export const tokenQuerySchema = z.object({ token: z.string().min(20).max(200) });
export const changePasswordSchema = z.object({ current: z.string().min(1), next: password });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().regex(/^\+?[\d\s-]{7,15}$/).optional(),
  address: z
    .object({ line: z.string().trim().min(3).max(160), city: z.string().trim().min(2).max(60) })
    .optional(),
});

export const roleChangeSchema = z.object({
  role: z.enum(ROLES),
  note: z.string().trim().min(3).max(240),
});

// ---------------------------------------------------------------- projects
export const projectCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  roomType: z.enum(ROOM_TYPES),
});

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  roomType: z.enum(ROOM_TYPES).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export const shareSchema = z.object({ email });

export const projectQuerySchema = pagination.extend({
  q: z.string().trim().max(80).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  sort: z.enum(PROJECT_SORTS).default('updated'),
});

// ---------------------------------------------------------------- designs
export const placementSchema = z.object({
  id: z.string().min(1).max(40),
  furniture: objectId,
  spaceId: z.string().min(1).max(40),
  x: z.number().finite(),
  z: z.number().finite(),
  rotationDeg: z.number().min(0).max(360).default(0),
  qty: z.number().int().min(1).max(20).default(1),
});

export const designSaveSchema = z.object({
  placements: z.array(placementSchema).max(MAX_PLACEMENTS),
  materials: z.object({
    walls: z.enum(WALL_FINISHES).default('paper'),
    floors: z.record(z.string(), z.enum(FLOOR_FINISHES)).default({}),
  }),
  note: z.string().trim().max(240).optional(),
});

// ---------------------------------------------------------------- catalogue
export const furnitureCreateSchema = z.object({
  name: z.string().trim().min(2).max(90),
  description: z.string().trim().max(1200).default(''),
  category: objectId,
  dimensions: z.object({ w: mm, d: mm, h: mm }),
  pricePaisa: paisa,
  stock: z.number().int().min(0).max(100000).default(0),
  material: z.enum(FURNITURE_MATERIALS).default('other'),
  colourToken: z.enum(COLOUR_TOKENS).default('stone'),
  images: z.array(z.string().url()).max(MAX_PRODUCT_IMAGES).default([]),
  modelUrl: z.string().url().optional(),
});

export const furnitureUpdateSchema = furnitureCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const furnitureQuerySchema = pagination.extend({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(60).optional(),
  material: z.enum(FURNITURE_MATERIALS).optional(),
  colour: z.enum(COLOUR_TOKENS).optional(),
  min: z.coerce.number().int().min(0).optional(),
  max: z.coerce.number().int().min(0).optional(),
  sort: z.enum(FURNITURE_SORTS).default('popular'),
  includeInactive: z.coerce.boolean().default(false),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/),
  description: z.string().trim().max(300).default(''),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

// ---------------------------------------------------------------- commerce
export const addressSchema = z.object({
  line: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(60),
  slot: z.string().trim().min(2).max(60),
});

export const cartSyncSchema = z.union([
  z.object({ designId: objectId }),
  z.object({
    items: z
      .array(z.object({ furniture: objectId, qty: z.number().int().min(1).max(20) }))
      .min(1)
      .max(MAX_PLACEMENTS),
  }),
]);

export const orderCreateSchema = z.object({ address: addressSchema });

export const ORDER_STATUS_TRANSITIONS_KEYS = ['paid', 'packing', 'delivered', 'cancelled', 'failed'] as const;

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_TRANSITIONS_KEYS),
  note: z.string().trim().max(240).optional(),
});

export const confirmQuerySchema = z.object({ pidx: z.string().min(4).max(80) });

export const orderQuerySchema = pagination.extend({
  status: z.enum(['pending_payment', 'paid', 'packing', 'delivered', 'cancelled', 'failed']).optional(),
  q: z.string().trim().max(80).optional(),
});

// ---------------------------------------------------------------- social
export const reviewCreateSchema = z.object({
  targetType: z.enum(REVIEW_TARGETS),
  targetId: objectId,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(800).default(''),
});

export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(800).optional(),
});

export const commentSchema = z.object({
  anchor: z.object({
    kind: z.enum(['object', 'point']),
    id: z.string().max(40).optional(),
    x: z.number().optional(),
    z: z.number().optional(),
  }),
  body: z.string().trim().min(1).max(600),
});

export const templateCreateSchema = z.object({
  projectId: objectId,
  name: z.string().trim().min(2).max(80),
  isPublic: z.boolean().default(true),
});

// ---------------------------------------------------------------- inferred types
export type Blueprint = z.infer<typeof blueprintSchema>;
export type Space = z.infer<typeof spaceSchema>;
export type Wall = z.infer<typeof wallSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type Placement = z.infer<typeof placementSchema>;
export type Materials = z.infer<typeof designSaveSchema>['materials'];
export type Point = z.infer<typeof point>;
export type FurnitureQuery = z.infer<typeof furnitureQuerySchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;

export { MIN_WALL_LENGTH_MM, MAX_OPENINGS_PER_WALL };
