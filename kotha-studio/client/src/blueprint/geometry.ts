import type {
  BlueprintDoc,
  Floor,
  FurnitureItem,
  Opening,
  Pt,
  Room,
  Validation,
  Wall,
} from './types';

export const GRID = 100;
export const MIN_WALL = 300;
export const OPENING_CLEARANCE = 100;
export const DOOR_CLEARANCE = 600;
export const DEFAULT_WALL_THICKNESS = 120;

export const snap = (value: number, step = GRID) => Math.round(value / step) * step;
export const snapPt = (p: Pt): Pt => ({ x: snap(p.x), y: snap(p.y) });

export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
export const wallLength = (w: Wall) => dist(w.a, w.b);
export const wallAngle = (w: Wall) => Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);

export function pointOnWall(wall: Wall, offset: number, normal = 0): Pt {
  const length = wallLength(wall);
  if (length === 0) return wall.a;
  const dir = { x: (wall.b.x - wall.a.x) / length, y: (wall.b.y - wall.a.y) / length };
  const n = { x: -dir.y, y: dir.x };
  return {
    x: wall.a.x + dir.x * offset + n.x * normal,
    y: wall.a.y + dir.y * offset + n.y * normal,
  };
}

export function projectOnWall(wall: Wall, p: Pt): { offset: number; distance: number } {
  const length = wallLength(wall);
  if (length === 0) return { offset: 0, distance: dist(p, wall.a) };
  const dir = { x: (wall.b.x - wall.a.x) / length, y: (wall.b.y - wall.a.y) / length };
  const t = (p.x - wall.a.x) * dir.x + (p.y - wall.a.y) * dir.y;
  const clamped = Math.max(0, Math.min(length, t));
  const foot = { x: wall.a.x + dir.x * clamped, y: wall.a.y + dir.y * clamped };
  return { offset: clamped, distance: dist(p, foot) };
}

export function polygonArea(points: Pt[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function polygonPerimeter(points: Pt[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    total += dist(points[i], points[(i + 1) % points.length]);
  }
  return total;
}

export function polygonCentroid(points: Pt[]): Pt {
  const area = polygonArea(points);
  if (Math.abs(area) < 1e-6) {
    return {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function pointInPolygon(point: Pt, polygon: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Footprint corners of a rotated furniture item, in plan millimetres. */
export function footprintCorners(item: Pick<FurnitureItem, 'x' | 'y' | 'w' | 'd' | 'rotation'>): Pt[] {
  const rad = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = item.w / 2;
  const hd = item.d / 2;
  return [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ].map((p) => ({
    x: item.x + p.x * cos - p.y * sin,
    y: item.y + p.x * sin + p.y * cos,
  }));
}

function axesOf(points: Pt[]): Pt[] {
  const axes: Pt[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const edge = sub(b, a);
    const len = Math.hypot(edge.x, edge.y) || 1;
    axes.push({ x: -edge.y / len, y: edge.x / len });
  }
  return axes;
}

function project(points: Pt[], axis: Pt): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const value = p.x * axis.x + p.y * axis.y;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return [min, max];
}

/** Separating-axis test for two convex polygons. */
export function polygonsOverlap(a: Pt[], b: Pt[]): boolean {
  for (const axis of [...axesOf(a), ...axesOf(b)]) {
    const [aMin, aMax] = project(a, axis);
    const [bMin, bMax] = project(b, axis);
    if (aMax < bMin || bMax < aMin) return false;
  }
  return true;
}

export function segmentsIntersect(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const orient = (p: Pt, q: Pt, r: Pt) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/** A footprint is inside when its corners and edge midpoints all sit inside. */
export function footprintInsideRoom(item: FurnitureItem, room: Room): boolean {
  const corners = footprintCorners(item);
  const samples = [...corners];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    samples.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  return samples.every((p) => pointInPolygon(p, room.points));
}

export function openingSpan(floor: Floor, opening: Opening) {
  const wall = floor.walls.find((w) => w.id === opening.wallId);
  if (!wall) return null;
  const start = pointOnWall(wall, opening.offset - opening.width / 2);
  const end = pointOnWall(wall, opening.offset + opening.width / 2);
  return { wall, start, end };
}

export function validateOpening(
  floor: Floor,
  wallId: string,
  offset: number,
  width: number,
  ignoreId?: string,
): Validation {
  const wall = floor.walls.find((w) => w.id === wallId);
  if (!wall) return { ok: false, reason: 'That wall no longer exists.' };
  const length = wallLength(wall);
  if (length < MIN_WALL) return { ok: false, reason: 'The wall is too short to host an opening.' };
  if (width <= 0) return { ok: false, reason: 'The opening needs a width.' };
  if (offset - width / 2 < OPENING_CLEARANCE) {
    return { ok: false, reason: `Keep at least ${OPENING_CLEARANCE} mm between the opening and the wall end.` };
  }
  if (offset + width / 2 > length - OPENING_CLEARANCE) {
    return { ok: false, reason: `Keep at least ${OPENING_CLEARANCE} mm between the opening and the wall end.` };
  }
  const others = floor.openings.filter((o) => o.wallId === wallId && o.id !== ignoreId);
  for (const other of others) {
    const minimum = (width + other.width) / 2 + OPENING_CLEARANCE;
    if (Math.abs(other.offset - offset) < minimum) {
      return { ok: false, reason: 'This opening would overlap another opening on the same wall.' };
    }
  }
  return { ok: true };
}

function doorZones(floor: Floor, ignoreId?: string): Array<{ id: string; polygon: Pt[] }> {
  const zones: Array<{ id: string; polygon: Pt[] }> = [];
  for (const opening of floor.openings) {
    if (opening.kind !== 'door' || opening.id === ignoreId) continue;
    const span = openingSpan(floor, opening);
    if (!span) continue;
    const { wall, start, end } = span;
    const length = wallLength(wall) || 1;
    const dir = { x: (wall.b.x - wall.a.x) / length, y: (wall.b.y - wall.a.y) / length };
    const normal = { x: -dir.y, y: dir.x };
    for (const side of [1, -1] as const) {
      // Only the side that actually opens into a room needs clearance.
      const centre = {
        x: (start.x + end.x) / 2 + normal.x * (DOOR_CLEARANCE / 2) * side,
        y: (start.y + end.y) / 2 + normal.y * (DOOR_CLEARANCE / 2) * side,
      };
      if (!floor.rooms.some((room) => pointInPolygon(centre, room.points))) continue;
      zones.push({
        id: opening.id,
        polygon: [
          start,
          end,
          { x: end.x + normal.x * DOOR_CLEARANCE * side, y: end.y + normal.y * DOOR_CLEARANCE * side },
          { x: start.x + normal.x * DOOR_CLEARANCE * side, y: start.y + normal.y * DOOR_CLEARANCE * side },
        ],
      });
    }
  }
  return zones;
}

export function validateFurniture(
  floor: Floor,
  item: FurnitureItem,
  ignoreId?: string,
): Validation {
  if (floor.rooms.length === 0) {
    return { ok: false, reason: 'Draw a closed room before placing furniture.' };
  }
  const homes = floor.rooms.filter((room) => footprintInsideRoom(item, room));
  if (homes.length === 0) {
    return {
      ok: false,
      reason: 'Outside every room. A piece must sit fully inside one closed room.',
    };
  }
  const corners = footprintCorners(item);
  const neighbours = floor.furniture.filter((other) => other.id !== ignoreId);
  for (const other of neighbours) {
    if (polygonsOverlap(corners, footprintCorners(other))) {
      return { ok: false, reason: `Overlaps ${other.name}. Clear space before placing.` };
    }
  }
  for (const zone of doorZones(floor, item.id)) {
    if (polygonsOverlap(corners, zone.polygon)) {
      return { ok: false, reason: `Blocks a door. Keep ${DOOR_CLEARANCE} mm clear in front of every door.` };
    }
  }
  return { ok: true };
}

export type Estimate = {
  floorArea: number;
  wallLength: number;
  wallVolume: number;
  wallArea: number;
  openingArea: number;
  doors: number;
  windows: number;
  rooms: number;
  pieces: number;
  cementBags: number;
  sand: number;
  aggregate: number;
  steel: number;
  bricks: number;
  paint: number;
  primer: number;
  plywoodSheets: number;
  electrical: number;
  plumbing: number;
};

export function estimate(floor: Floor, wallHeight: number): Estimate {
  const floorAreaMm2 = floor.rooms.reduce((sum, room) => sum + Math.abs(polygonArea(room.points)), 0);
  const wallLengthMm = floor.walls.reduce((sum, wall) => sum + wallLength(wall), 0);
  const wallVolumeMm3 = floor.walls.reduce(
    (sum, wall) => sum + wallLength(wall) * wall.thickness * wallHeight,
    0,
  );
  const openingAreaMm2 = floor.openings.reduce(
    (sum, opening) => sum + opening.width * opening.height,
    0,
  );
  const grossWallAreaMm2 = wallLengthMm * wallHeight;
  const netWallAreaMm2 = Math.max(0, grossWallAreaMm2 - openingAreaMm2);

  const floorArea = floorAreaMm2 / 1_000_000;
  const wallVolume = wallVolumeMm3 / 1_000_000_000;
  const wallArea = grossWallAreaMm2 / 1_000_000;
  const openingArea = openingAreaMm2 / 1_000_000;
  const slabVolume = floorArea * 0.125;
  const brickwork = wallVolume;

  const doors = floor.openings.filter((o) => o.kind === 'door').length;
  const windows = floor.openings.filter((o) => o.kind === 'window').length;
  const wetRooms = floor.rooms.filter((r) => /kitchen|bath|toilet|wash/i.test(r.name)).length;

  return {
    floorArea,
    wallLength: wallLengthMm / 1000,
    wallVolume,
    wallArea,
    openingArea,
    doors,
    windows,
    rooms: floor.rooms.length,
    pieces: floor.furniture.length,
    cementBags: Math.ceil(brickwork * 1.4 + slabVolume * 6),
    sand: +(brickwork * 0.25 + slabVolume * 0.45).toFixed(2),
    aggregate: +(slabVolume * 0.85).toFixed(2),
    steel: Math.round(slabVolume * 80 + brickwork * 25),
    bricks: Math.ceil(brickwork * 500),
    paint: Math.ceil((netWallAreaMm2 / 1_000_000) * 0.25),
    primer: Math.ceil((netWallAreaMm2 / 1_000_000) * 0.1),
    plywoodSheets: Math.ceil(floorArea / 2.88),
    electrical: floor.rooms.length * 4 + 2,
    plumbing: wetRooms * 3 + 2,
  };
}

export function totalEstimate(doc: BlueprintDoc): Estimate {
  return doc.floors.reduce<Estimate>(
    (sum, floor) => {
      const e = estimate(floor, doc.wallHeight);
      return {
        floorArea: sum.floorArea + e.floorArea,
        wallLength: sum.wallLength + e.wallLength,
        wallVolume: sum.wallVolume + e.wallVolume,
        wallArea: sum.wallArea + e.wallArea,
        openingArea: sum.openingArea + e.openingArea,
        doors: sum.doors + e.doors,
        windows: sum.windows + e.windows,
        rooms: sum.rooms + e.rooms,
        pieces: sum.pieces + e.pieces,
        cementBags: sum.cementBags + e.cementBags,
        sand: +(sum.sand + e.sand).toFixed(2),
        aggregate: +(sum.aggregate + e.aggregate).toFixed(2),
        steel: sum.steel + e.steel,
        bricks: sum.bricks + e.bricks,
        paint: sum.paint + e.paint,
        primer: sum.primer + e.primer,
        plywoodSheets: sum.plywoodSheets + e.plywoodSheets,
        electrical: sum.electrical + e.electrical,
        plumbing: sum.plumbing + e.plumbing,
      };
    },
    {
      floorArea: 0, wallLength: 0, wallVolume: 0, wallArea: 0, openingArea: 0,
      doors: 0, windows: 0, rooms: 0, pieces: 0, cementBags: 0, sand: 0,
      aggregate: 0, steel: 0, bricks: 0, paint: 0, primer: 0,
      plywoodSheets: 0, electrical: 0, plumbing: 0,
    },
  );
}

export const mm = (value: number) => `${Math.round(value)} mm`;
export const m2 = (value: number) => `${value.toFixed(2)} m²`;
