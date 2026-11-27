/**
 * Pure geometry. No database, no network, no React.
 * Everything here is unit-testable and is the single source of truth for
 * "does it fit", "is the plan valid" and "which rooms can I walk to".
 *
 * Units: millimetres everywhere. Area helpers convert to m² at the edge.
 */
import {
  BOUNDS_TOLERANCE_MM,
  CORNER_CLEARANCE_MM,
  DELIVERY_PAISA,
  GRID_SNAP_MM,
  MAX_OPENINGS_PER_WALL,
  MIN_WALL_LENGTH_MM,
  ROTATION_SNAP_DEG,
  VAT_RATE,
} from './constants';
import type { Blueprint, Opening, Placement, Point, Space, Wall } from './schemas';
import { OPENING_RANGES } from './schemas';

export interface FieldError {
  path: string;
  message: string;
}
export interface PlanWarning {
  code: string;
  message: string;
  spaceIds?: string[];
}

const EPS = 0.5; // mm — touching edges are not overlapping

// ---------------------------------------------------------------- basics
export const dist = (a: Point, b: Point): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

export const snap = (value: number, step: number = GRID_SNAP_MM): number =>
  Math.round(value / step) * step;

export const snapRotation = (deg: number): number => {
  const snapped = Math.round(deg / ROTATION_SNAP_DEG) * ROTATION_SNAP_DEG;
  return ((snapped % 360) + 360) % 360;
};

/** Shoelace formula. Returns mm², always positive. */
export function polygonAreaMm2(polygon: Point[]): number {
  if (polygon.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export const polygonAreaM2 = (polygon: Point[]): number => polygonAreaMm2(polygon) / 1_000_000;

export function polygonPerimeterMm(polygon: Point[]): number {
  if (polygon.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < polygon.length; i++) {
    total += dist(polygon[i], polygon[(i + 1) % polygon.length]);
  }
  return total;
}

export const polygonPerimeterM = (polygon: Point[]): number => polygonPerimeterMm(polygon) / 1000;

export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function nearPolygonEdge(p: Point, polygon: Point[], tolerance: number): boolean {
  for (let i = 0; i < polygon.length; i++) {
    if (distanceToSegment(p, polygon[i], polygon[(i + 1) % polygon.length]) <= tolerance) return true;
  }
  return false;
}

const onSegment = (a: Point, b: Point, c: Point): boolean =>
  Math.min(a[0], b[0]) - EPS <= c[0] &&
  c[0] <= Math.max(a[0], b[0]) + EPS &&
  Math.min(a[1], b[1]) - EPS <= c[1] &&
  c[1] <= Math.max(a[1], b[1]) + EPS;

const orientation = (a: Point, b: Point, c: Point): number => {
  const v = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(v) < EPS) return 0;
  return v > 0 ? 1 : 2;
};

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, b, c)) return true;
  if (o2 === 0 && onSegment(a, b, d)) return true;
  if (o3 === 0 && onSegment(c, d, a)) return true;
  if (o4 === 0 && onSegment(c, d, b)) return true;
  return false;
}

/** A closed loop that never crosses itself. Adjacent edges share a vertex, so skip them. */
export function isSimplePolygon(polygon: Point[]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      const c = polygon[j];
      const d = polygon[(j + 1) % n];
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------- oriented boxes
export interface Footprint {
  x: number;
  z: number;
  w: number;
  d: number;
  rotationDeg: number;
}

export function obbCorners(f: Footprint): Point[] {
  const rad = (f.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = f.w / 2;
  const hd = f.d / 2;
  return ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as Point[]).map(([px, pz]) => [
    f.x + px * cos - pz * sin,
    f.z + px * sin + pz * cos,
  ]);
}

const project = (corners: Point[], axis: Point): [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (const c of corners) {
    const v = c[0] * axis[0] + c[1] * axis[1];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
};

const axesOf = (corners: Point[]): Point[] => {
  const axes: Point[] = [];
  for (let i = 0; i < 2; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const len = Math.hypot(ex, ez) || 1;
    axes.push([-ez / len, ex / len]);
  }
  return axes;
};

/** Separating-axis test. Touching footprints are allowed; overlapping ones are not. */
export function obbOverlap(a: Footprint, b: Footprint): boolean {
  const ca = obbCorners(a);
  const cb = obbCorners(b);
  for (const axis of [...axesOf(ca), ...axesOf(cb)]) {
    const [minA, maxA] = project(ca, axis);
    const [minB, maxB] = project(cb, axis);
    if (maxA <= minB + EPS || maxB <= minA + EPS) return false;
  }
  return true;
}

export function obbInsidePolygon(f: Footprint, polygon: Point[], tolerance = BOUNDS_TOLERANCE_MM): boolean {
  return obbCorners(f).every((c) => pointInPolygon(c, polygon) || nearPolygonEdge(c, polygon, tolerance));
}

// ---------------------------------------------------------------- walls and openings
export const wallLength = (wall: Wall): number => dist(wall.from, wall.to);

export const openingInterval = (o: Opening): [number, number] => [o.offsetMm, o.offsetMm + o.widthMm];

/** Where a doorway leads: a shared wall joins its two spaces, an outer wall joins nothing. */
export function deriveConnects(wall: Wall): string[] {
  return wall.shared && wall.spaceIds.length === 2 ? [...wall.spaceIds] : [];
}

export function validateOpening(
  opening: Opening,
  wall: Wall,
  wallHeightMm: number,
  siblings: Opening[],
): FieldError[] {
  const errors: FieldError[] = [];
  const ranges = OPENING_RANGES[opening.kind];
  const len = wallLength(wall);

  if (opening.widthMm < ranges.width[0] || opening.widthMm > ranges.width[1]) {
    errors.push({
      path: `openings.${opening.id}.widthMm`,
      message: `${opening.kind} width must be ${ranges.width[0]}–${ranges.width[1]} mm`,
    });
  }
  if (opening.heightMm < ranges.height[0] || opening.heightMm > ranges.height[1]) {
    errors.push({
      path: `openings.${opening.id}.heightMm`,
      message: `${opening.kind} height must be ${ranges.height[0]}–${ranges.height[1]} mm`,
    });
  }
  if (opening.sillMm + opening.heightMm > wallHeightMm) {
    errors.push({
      path: `openings.${opening.id}.heightMm`,
      message: `opening reaches ${opening.sillMm + opening.heightMm} mm but the wall is ${wallHeightMm} mm`,
    });
  }
  if (opening.offsetMm < CORNER_CLEARANCE_MM) {
    errors.push({
      path: `openings.${opening.id}.offsetMm`,
      message: `keep ${CORNER_CLEARANCE_MM} mm clear of the wall start`,
    });
  }
  if (opening.offsetMm + opening.widthMm > len - CORNER_CLEARANCE_MM) {
    errors.push({
      path: `openings.${opening.id}.offsetMm`,
      message: `opening runs past the wall end; keep ${CORNER_CLEARANCE_MM} mm clear of the corner`,
    });
  }

  const [start, end] = openingInterval(opening);
  for (const other of siblings) {
    if (other.id === opening.id) continue;
    const [os, oe] = openingInterval(other);
    if (start < oe - EPS && os < end - EPS) {
      errors.push({
        path: `openings.${opening.id}.offsetMm`,
        message: `overlaps ${other.kind} ${other.id} on the same wall`,
      });
      break;
    }
  }
  return errors;
}

// ---------------------------------------------------------------- the plan graph
export function buildAdjacency(blueprint: Blueprint): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const space of blueprint.spaces) graph.set(space.id, new Set());
  const wallsById = new Map(blueprint.walls.map((w) => [w.id, w]));

  for (const opening of blueprint.openings) {
    if (opening.kind !== 'door') continue;
    const wall = wallsById.get(opening.wallId);
    if (!wall || !wall.shared || wall.spaceIds.length !== 2) continue;
    const [a, b] = wall.spaceIds;
    graph.get(a)?.add(b);
    graph.get(b)?.add(a);
  }
  return graph;
}

/** Rooms you cannot walk to from the entrance. A warning, never a hard failure. */
export function unreachableSpaces(blueprint: Blueprint, entranceSpaceId?: string): string[] {
  const graph = buildAdjacency(blueprint);
  const ids = blueprint.spaces.map((s) => s.id);
  if (ids.length <= 1) return [];
  const start = entranceSpaceId && graph.has(entranceSpaceId) ? entranceSpaceId : ids[0];
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift() as string;
    for (const next of graph.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return ids.filter((id) => !seen.has(id));
}

// ---------------------------------------------------------------- whole-plan validation
export interface BlueprintReport {
  errors: FieldError[];
  warnings: PlanWarning[];
  areas: { spaceId: string; areaM2: number; perimeterM: number }[];
}

export function validateBlueprint(blueprint: Blueprint): BlueprintReport {
  const errors: FieldError[] = [];
  const warnings: PlanWarning[] = [];
  const areas: BlueprintReport['areas'] = [];
  const wallsById = new Map(blueprint.walls.map((w) => [w.id, w]));

  blueprint.spaces.forEach((space: Space, si: number) => {
    if (!isSimplePolygon(space.polygon)) {
      errors.push({ path: `spaces.${si}.polygon`, message: 'the wall loop crosses itself' });
    }
    const areaM2 = polygonAreaM2(space.polygon);
    if (areaM2 < 1) {
      errors.push({ path: `spaces.${si}.polygon`, message: 'a room must enclose at least 1 m²' });
    }
    areas.push({
      spaceId: space.id,
      areaM2: round2(areaM2),
      perimeterM: round2(polygonPerimeterM(space.polygon)),
    });
    for (const wallId of space.wallIds) {
      const wall = wallsById.get(wallId);
      if (!wall) {
        errors.push({ path: `spaces.${si}.wallIds`, message: `unknown wall ${wallId}` });
      } else if (!wall.spaceIds.includes(space.id)) {
        errors.push({ path: `spaces.${si}.wallIds`, message: `wall ${wallId} does not belong to ${space.id}` });
      }
    }
  });

  blueprint.walls.forEach((wall: Wall, wi: number) => {
    if (wallLength(wall) < MIN_WALL_LENGTH_MM) {
      errors.push({ path: `walls.${wi}`, message: `walls must be at least ${MIN_WALL_LENGTH_MM} mm` });
    }
    if (wall.shared && wall.spaceIds.length !== 2) {
      errors.push({ path: `walls.${wi}.spaceIds`, message: 'a shared wall joins exactly two spaces' });
    }
  });

  const perWall = new Map<string, number>();
  blueprint.openings.forEach((opening: Opening) => {
    const wall = wallsById.get(opening.wallId);
    if (!wall) {
      errors.push({ path: `openings.${opening.id}.wallId`, message: 'unknown wall' });
      return;
    }
    perWall.set(wall.id, (perWall.get(wall.id) ?? 0) + 1);
    errors.push(...validateOpening(opening, wall, blueprint.wall.heightMm, blueprint.openings));
    const expected = deriveConnects(wall);
    if (opening.kind === 'door' && expected.length === 2) {
      const same = expected.every((id) => opening.connects.includes(id)) && opening.connects.length === 2;
      if (!same) {
        errors.push({
          path: `openings.${opening.id}.connects`,
          message: `this doorway joins ${expected.join(' and ')}`,
        });
      }
    }
  });

  for (const [wallId, count] of perWall) {
    if (count > MAX_OPENINGS_PER_WALL) {
      errors.push({ path: `openings`, message: `wall ${wallId} carries more than ${MAX_OPENINGS_PER_WALL} openings` });
    }
  }

  if (!blueprint.scale.calibrated) {
    warnings.push({
      code: 'NOT_CALIBRATED',
      message: 'The plan has no real scale yet. Dimensions are grid units and ordering is disabled.',
    });
  }

  const isolated = unreachableSpaces(blueprint);
  if (isolated.length) {
    warnings.push({
      code: 'SPACE_UNREACHABLE',
      message: `${isolated.length} space(s) have no doorway from the entrance.`,
      spaceIds: isolated,
    });
  }

  return { errors, warnings, areas };
}

// ---------------------------------------------------------------- placements
export interface PlacementLike extends Placement {
  dimensions: { w: number; d: number; h: number };
}

export function validatePlacements(
  placements: PlacementLike[],
  blueprint: Blueprint,
): FieldError[] {
  const errors: FieldError[] = [];
  const spacesById = new Map(blueprint.spaces.map((s) => [s.id, s]));
  const boxes: { placement: PlacementLike; footprint: Footprint }[] = [];

  placements.forEach((p, i) => {
    const space = spacesById.get(p.spaceId);
    if (!space) {
      errors.push({ path: `placements.${i}.spaceId`, message: 'unknown space' });
      return;
    }
    const footprint: Footprint = {
      x: p.x,
      z: p.z,
      w: p.dimensions.w * p.qty ** 0, // qty never changes a footprint
      d: p.dimensions.d,
      rotationDeg: p.rotationDeg,
    };
    if (!obbInsidePolygon(footprint, space.polygon)) {
      errors.push({ path: `placements.${i}`, message: 'footprint exceeds the floor polygon' });
    }
    if (p.dimensions.h > blueprint.wall.heightMm) {
      errors.push({ path: `placements.${i}`, message: 'taller than the ceiling' });
    }
    boxes.push({ placement: p, footprint });
  });

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.placement.spaceId !== b.placement.spaceId) continue;
      if (obbOverlap(a.footprint, b.footprint)) {
        errors.push({ path: `placements.${j}`, message: `overlaps placement ${a.placement.id}` });
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------- money
export interface MoneyTotals {
  subtotalPaisa: number;
  deliveryPaisa: number;
  vatPaisa: number;
  totalPaisa: number;
}

/** VAT is rounded once, at the end. Never per line. */
export function computeTotals(
  lines: { unitPaisa: number; qty: number }[],
  opts: { deliveryPaisa?: number; vatRate?: number } = {},
): MoneyTotals {
  const subtotalPaisa = lines.reduce((sum, l) => sum + l.unitPaisa * l.qty, 0);
  const deliveryPaisa = opts.deliveryPaisa ?? (subtotalPaisa > 0 ? DELIVERY_PAISA : 0);
  const vatPaisa = Math.round(subtotalPaisa * (opts.vatRate ?? VAT_RATE));
  return {
    subtotalPaisa,
    deliveryPaisa,
    vatPaisa,
    totalPaisa: subtotalPaisa + deliveryPaisa + vatPaisa,
  };
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Nepali grouping: 126478 -> "1,26,478". Rupees, not paisa. */
export function formatNpr(paisa: number): string {
  const rupees = Math.round(paisa / 100);
  const s = String(Math.abs(rupees));
  if (s.length <= 3) return `${rupees < 0 ? '-' : ''}${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rupees < 0 ? '-' : ''}${grouped},${last3}`;
}

export const formatMm = (mm: number): string => `${mm} mm`;
export const formatM = (mm: number): string => `${(mm / 1000).toFixed(2)} m`;
