import {
  DEFAULT_WALL_HEIGHT_MM,
  DEFAULT_WALL_THICKNESS_MM,
  GRID_SNAP_MM,
} from './constants';
import type { Blueprint, Opening, Point } from './schemas';
import type { RoomType } from './constants';

let counter = 0;
const uid = (prefix: string): string => `${prefix}_${(++counter).toString(36)}${Date.now().toString(36).slice(-4)}`;

/** Reset the id counter. Only used by tests so fixtures are deterministic. */
export const resetIds = (): void => {
  counter = 0;
};

export interface RoomSpec {
  name: string;
  type: RoomType;
  /** Width and depth in mm for a rectangle; ignored when polygon is given. */
  widthMm?: number;
  depthMm?: number;
  polygon?: Point[];
  origin?: Point;
}

/**
 * Build a valid blueprint from room specs. Adjacent rooms that share an edge
 * get one shared wall, which is what makes a doorway between them possible.
 */
export function makeBlueprint(specs: RoomSpec[], opts: { calibrated?: boolean } = {}): Blueprint {
  const spaces: Blueprint['spaces'] = [];
  const walls: Blueprint['walls'] = [];
  const edgeIndex = new Map<string, string>();

  const edgeKey = (a: Point, b: Point): string => {
    const k1 = `${a[0]},${a[1]}|${b[0]},${b[1]}`;
    const k2 = `${b[0]},${b[1]}|${a[0]},${a[1]}`;
    return k1 < k2 ? k1 : k2;
  };

  specs.forEach((spec, si) => {
    const [ox, oy] = spec.origin ?? [0, 0];
    const w = spec.widthMm ?? 4000;
    const d = spec.depthMm ?? 3000;
    const polygon: Point[] =
      spec.polygon ??
      ([[ox, oy], [ox + w, oy], [ox + w, oy + d], [ox, oy + d]] as Point[]);

    const spaceId = `sp_${si + 1}`;
    const wallIds: string[] = [];

    for (let i = 0; i < polygon.length; i++) {
      const from = polygon[i];
      const to = polygon[(i + 1) % polygon.length];
      const key = edgeKey(from, to);
      const existing = edgeIndex.get(key);
      if (existing) {
        const wall = walls.find((x) => x.id === existing);
        if (wall) {
          wall.shared = true;
          if (!wall.spaceIds.includes(spaceId)) wall.spaceIds.push(spaceId);
          wallIds.push(wall.id);
          continue;
        }
      }
      const wallId = `w${walls.length + 1}`;
      walls.push({ id: wallId, from, to, spaceIds: [spaceId], shared: false });
      edgeIndex.set(key, wallId);
      wallIds.push(wallId);
    }

    spaces.push({ id: spaceId, name: spec.name, type: spec.type, polygon, wallIds });
  });

  const calibrated = opts.calibrated ?? true;
  const first = spaces[0];
  const refA = first.polygon[0];
  const refB = first.polygon[1];

  return {
    schemaVersion: 2,
    revision: 0,
    scale: {
      mmPerUnit: 1,
      calibrated,
      reference: calibrated
        ? { a: refA, b: refB, declaredMm: Math.round(Math.hypot(refB[0] - refA[0], refB[1] - refA[1])) }
        : null,
    },
    wall: { thicknessMm: DEFAULT_WALL_THICKNESS_MM, heightMm: DEFAULT_WALL_HEIGHT_MM },
    spaces,
    walls,
    openings: [],
    referenceImage: null,
  };
}

/** Put a door on a wall, centred, with the corner clearance already respected. */
export function addDoor(
  blueprint: Blueprint,
  wallId: string,
  opts: { widthMm?: number; heightMm?: number; offsetMm?: number; id?: string } = {},
): Opening {
  const wall = blueprint.walls.find((w) => w.id === wallId);
  if (!wall) throw new Error(`unknown wall ${wallId}`);
  const len = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]);
  const widthMm = opts.widthMm ?? 900;
  const offsetMm = opts.offsetMm ?? Math.round((len - widthMm) / 2 / GRID_SNAP_MM) * GRID_SNAP_MM;
  const opening: Opening = {
    id: opts.id ?? uid('op'),
    kind: 'door',
    wallId,
    offsetMm,
    widthMm,
    heightMm: opts.heightMm ?? 2100,
    sillMm: 0,
    swing: 'inward-left',
    connects: wall.shared ? [...wall.spaceIds] : [],
  };
  blueprint.openings.push(opening);
  return opening;
}

export function addWindow(
  blueprint: Blueprint,
  wallId: string,
  opts: { widthMm?: number; heightMm?: number; sillMm?: number; offsetMm?: number; id?: string } = {},
): Opening {
  const wall = blueprint.walls.find((w) => w.id === wallId);
  if (!wall) throw new Error(`unknown wall ${wallId}`);
  const len = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]);
  const widthMm = opts.widthMm ?? 1200;
  const offsetMm = opts.offsetMm ?? Math.round((len - widthMm) / 2 / GRID_SNAP_MM) * GRID_SNAP_MM;
  const opening: Opening = {
    id: opts.id ?? uid('op'),
    kind: 'window',
    wallId,
    offsetMm,
    widthMm,
    heightMm: opts.heightMm ?? 1350,
    sillMm: opts.sillMm ?? 900,
    swing: 'inward-left',
    connects: [],
  };
  blueprint.openings.push(opening);
  return opening;
}

/** The demo plan: a living room and a kitchen sharing one wall. */
export function demoBlueprint(): Blueprint {
  const bp = makeBlueprint([
    { name: 'Living', type: 'living', widthMm: 4200, depthMm: 3600, origin: [0, 0] },
    { name: 'Kitchen', type: 'kitchen', widthMm: 3100, depthMm: 2200, origin: [4200, 0] },
  ]);
  const shared = bp.walls.find((w) => w.shared);
  if (shared) addDoor(bp, shared.id, { widthMm: 900, offsetMm: 1200, id: 'op_door' });
  const outer = bp.walls.find((w) => !w.shared && w.spaceIds[0] === 'sp_1' && w.from[1] === 3600);
  if (outer) addWindow(bp, outer.id, { id: 'op_window' });
  return bp;
}
