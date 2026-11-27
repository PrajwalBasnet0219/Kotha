/**
 * Every constant that both sides of the wire must agree on.
 * Money is integer paisa. Lengths are millimetres. No exceptions.
 */

export const ROLES = ['client', 'designer', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROOM_TYPES = ['living', 'bedroom', 'study', 'kitchen', 'office', 'other'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const PROJECT_STATUSES = ['draft', 'in_progress', 'shared', 'ordered', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'packing',
  'delivered',
  'cancelled',
  'failed',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses Khalti's lookup endpoint can return. Only Completed fulfils an order. */
export const KHALTI_STATUSES = [
  'Completed',
  'Pending',
  'Initiated',
  'Refunded',
  'Expired',
  'User canceled',
  'Partially Refunded',
] as const;
export type KhaltiStatus = (typeof KHALTI_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'design_shared',
  'comment',
  'order_paid',
  'order_failed',
  'template_approved',
  'review_hidden',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const FURNITURE_MATERIALS = ['oak', 'linen', 'steel', 'glass', 'stone', 'other'] as const;
export const COLOUR_TOKENS = ['ivory', 'stone', 'graphite', 'black'] as const;

/** Monochrome finish tokens. The 3D scene maps each to a halftone pattern. */
export const WALL_FINISHES = ['paper', 'ivory', 'stone', 'graphite', 'ink'] as const;
export const FLOOR_FINISHES = ['concrete', 'oak', 'tile'] as const;

export const REVIEW_TARGETS = ['furniture', 'designer'] as const;

// ---------------------------------------------------------------- geometry
export const GRID_SNAP_MM = 100;
export const ROTATION_SNAP_DEG = 15;
export const MIN_DIM_MM = 100;
export const MAX_DIM_MM = 4000;
export const CORNER_CLEARANCE_MM = 150;
export const BOUNDS_TOLERANCE_MM = 5;
export const MAX_SPACES = 3;
export const MAX_PLACEMENTS = 60;
export const MAX_OPENINGS_PER_WALL = 4;
export const MIN_WALL_LENGTH_MM = 600;
export const DEFAULT_WALL_THICKNESS_MM = 120;
export const DEFAULT_WALL_HEIGHT_MM = 2800;

export const DOOR_WIDTH_RANGE = [600, 1800] as const;
export const DOOR_HEIGHT_RANGE = [1900, 2400] as const;
export const WINDOW_WIDTH_RANGE = [400, 2400] as const;
export const WINDOW_HEIGHT_RANGE = [400, 1800] as const;
export const WINDOW_SILL_RANGE = [0, 1500] as const;

export const CALIBRATION_RANGE_MM = [500, 20000] as const;

// ---------------------------------------------------------------- money
export const PAISA_PER_RUPEE = 100;
export const MIN_PRICE_PAISA = 100; // Rs 1
export const MAX_PRICE_PAISA = 50_000_000; // Rs 500,000
export const VAT_RATE = 0.13;
export const DELIVERY_PAISA = 150_000; // Rs 1,500 inside the valley
export const KHALTI_MIN_PAISA = 1000; // Rs 10, the gateway's own floor

// ---------------------------------------------------------------- lists
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 60;
export const FURNITURE_SORTS = ['price_asc', 'price_desc', 'newest', 'popular', 'name'] as const;
export type FurnitureSort = (typeof FURNITURE_SORTS)[number];
export const PROJECT_SORTS = ['updated', 'created', 'name'] as const;

export const UPLOAD_LIMITS = {
  planImage: 5 * 1024 * 1024,
  avatar: 2 * 1024 * 1024,
  productImage: 2 * 1024 * 1024,
  model: 5 * 1024 * 1024,
  thumbnail: 1 * 1024 * 1024,
} as const;

export const MAX_PRODUCT_IMAGES = 6;
export const HISTORY_LIMIT = 20;
export const MAX_SHARED_WITH = 5;
export const MAX_REFRESH_TOKENS = 5;
