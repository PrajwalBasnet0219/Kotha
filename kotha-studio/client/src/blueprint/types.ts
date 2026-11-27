export type Pt = { x: number; y: number };

export type Wall = {
  id: string;
  a: Pt;
  b: Pt;
  thickness: number;
};

export type OpeningKind = 'door' | 'window';

export type Opening = {
  id: string;
  wallId: string;
  kind: OpeningKind;
  /** Centre distance from the wall start, in millimetres. */
  offset: number;
  /** Clear width, in millimetres. */
  width: number;
  height: number;
  /** Window sill height; doors use 0. */
  sill: number;
  /** Door leaf opens to +1 or -1 of the wall normal. */
  swing: 1 | -1;
};

export type Room = {
  id: string;
  name: string;
  kind: 'room' | 'stair';
  points: Pt[];
};

export type FurnitureItem = {
  id: string;
  productId: string;
  name: string;
  category: string;
  /** Centre of the footprint. */
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  /** Degrees, clockwise in plan. */
  rotation: number;
};

export type Floor = {
  id: string;
  name: string;
  walls: Wall[];
  openings: Opening[];
  rooms: Room[];
  furniture: FurnitureItem[];
};

export type BlueprintDoc = {
  version: 1;
  projectId: string;
  name: string;
  wallHeight: number;
  updatedAt: string;
  floors: Floor[];
};

export type Tool = 'select' | 'wall' | 'room' | 'stair' | 'door' | 'window' | 'furniture' | 'dimension';

export type Validation = { ok: true } | { ok: false; reason: string };
