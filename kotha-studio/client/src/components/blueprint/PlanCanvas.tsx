import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '../../lib/store';
import {
  DEFAULT_WALL_THICKNESS,
  GRID,
  MIN_WALL,
  dist,
  estimate,
  openingSpan,
  pointInPolygon,
  pointOnWall,
  polygonArea,
  polygonCentroid,
  projectOnWall,
  snap,
  snapPt,
  validateFurniture,
  validateOpening,
  wallAngle,
  wallLength,
} from '../../blueprint/geometry';
import type { Floor, FurnitureItem, Opening, Pt, Room, Tool, Wall } from '../../blueprint/types';
import { uid } from '../../lib/store';

export type Selection =
  | { kind: 'wall'; id: string }
  | { kind: 'room'; id: string }
  | { kind: 'opening'; id: string }
  | { kind: 'furniture'; id: string }
  | null;

type LayerState = {
  grid: boolean;
  walls: boolean;
  openings: boolean;
  furniture: boolean;
  rooms: boolean;
  dimensions: boolean;
  clearances: boolean;
};

type PlanCanvasProps = {
  floor: Floor;
  tool: Tool;
  selected: Selection;
  layers: LayerState;
  activeProduct: Product | null;
  background: { src: string; width: number; height: number } | null;
  calibrationPoints: Pt[];
  calibrationActive: boolean;
  /** A marquee can highlight several objects while one stays selected. */
  highlight?: string[];
  onSelect: (selection: Selection) => void;
  onHighlight: (ids: string[]) => void;
  onChange: (updater: (floor: Floor) => Floor) => void;
  onStatus: (message: string, tone?: 'ok' | 'error' | 'info') => void;
  onCalibrationPick: (p: Pt) => void;
  onRequestTool?: (tool: Tool) => void;
};

type WallPreview = { a: Pt; b: Pt };

type Drag =
  | { kind: 'furniture'; id: string; start: Pt; origin: { x: number; y: number }; preview: FurnitureItem; moved: boolean }
  | { kind: 'opening'; id: string; wallId: string; startOffset: number; preview: number; moved: boolean }
  | { kind: 'wall'; id: string; start: Pt; preview: WallPreview; moved: boolean }
  | { kind: 'room'; id: string; start: Pt; preview: Pt[]; startPoints: Pt[]; moved: boolean }
  | { kind: 'marquee'; start: Pt; current: Pt; moved: boolean }
  | { kind: 'pan'; startClient: Pt; startCenter: Pt };

const zip = 'kotha-' + Math.random().toString(36).slice(2, 8);

function nearestWall(floor: Floor, p: Pt): { wall: Wall; offset: number; distance: number } | null {
  let best: { wall: Wall; offset: number; distance: number } | null = null;
  for (const wall of floor.walls) {
    const hit = projectOnWall(wall, p);
    if (!best || hit.distance < best.distance) best = { wall, ...hit };
  }
  if (!best || best.distance > 420) return null;
  return best;
}

function roomForPoint(floor: Floor, p: Pt): Room | null {
  return floor.rooms.find((room) => pointInPolygon(p, room.points)) ?? null;
}

/** Snap to an existing wall endpoint so runs join instead of doubling up. */
function snapEndpoint(floor: Floor, p: Pt, tolerance = 320): Pt {
  let best: { p: Pt; distance: number } | null = null;
  for (const wall of floor.walls) {
    for (const endpoint of [wall.a, wall.b]) {
      const distance = dist(p, endpoint);
      if (distance <= tolerance && (!best || distance < best.distance)) {
        best = { p: endpoint, distance };
      }
    }
  }
  return best ? best.p : p;
}

const samePoint = (a: Pt, b: Pt) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;

function sameWall(a: Wall, b: Wall): boolean {
  return (
    (samePoint(a.a, b.a) && samePoint(a.b, b.b)) ||
    (samePoint(a.a, b.b) && samePoint(a.b, b.a))
  );
}

function segmentsForWall(floor: Floor, wall: Wall): Array<[Pt, Pt]> {
  const openings = floor.openings
    .filter((opening) => opening.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);
  const length = wallLength(wall);
  const out: Array<[Pt, Pt]> = [];
  let cursor = 0;
  for (const opening of openings) {
    const start = Math.max(0, opening.offset - opening.width / 2);
    const end = Math.min(length, opening.offset + opening.width / 2);
    if (start > cursor + 1) out.push([pointOnWall(wall, cursor), pointOnWall(wall, start)]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < length - 1) out.push([pointOnWall(wall, cursor), pointOnWall(wall, length)]);
  if (out.length === 0 && length > 0) out.push([wall.a, wall.b]);
  return out;
}

function outwardNormal(wall: Wall, floor: Floor): Pt {
  const angle = wallAngle(wall);
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const mid = pointOnWall(wall, wallLength(wall) / 2);
  const room = floor.rooms.find((entry) => pointInPolygon(mid, entry.points));
  if (room) {
    const c = polygonCentroid(room.points);
    if ((c.x - mid.x) * normal.x + (c.y - mid.y) * normal.y > 0) {
      return { x: -normal.x, y: -normal.y };
    }
  }
  return normal;
}

/** Recognisable plan symbols instead of a bare rectangle. Drawn in the
 *  item's local millimetres, so the parent's rotate() keeps them aligned. */
function FurnitureSymbol({
  item,
  invalid,
  selected,
  highlighted,
}: {
  item: FurnitureItem;
  invalid: boolean;
  selected: boolean;
  highlighted: boolean;
}) {
  const w = item.w;
  const d = item.d;
  const ink = invalid ? '#b3261e' : 'var(--ink)';
  const soft = 'var(--ink-38, #999)';
  const base = {
    fill: 'var(--paper, #fff)',
    fillOpacity: 0.94,
    stroke: ink,
    strokeWidth: selected || highlighted ? 26 : 16,
  };
  const category = item.category.toLowerCase();
  const halfW = w / 2;
  const halfD = d / 2;

  let shape: React.ReactNode;
  if (category.includes('seating')) {
    const back = Math.max(60, d * 0.2);
    const arm = Math.max(50, w * 0.12);
    shape = (
      <>
        <rect x={-halfW} y={-halfD} width={w} height={d} rx={Math.min(70, d * 0.12)} {...base} />
        <rect x={-halfW} y={-halfD} width={w} height={back} rx={30} fill="var(--ink)" fillOpacity={0.14} stroke="none" />
        <rect x={-halfW} y={-halfD} width={arm} height={d} rx={26} fill="var(--ink)" fillOpacity={0.08} stroke="none" />
        <rect x={halfW - arm} y={-halfD} width={arm} height={d} rx={26} fill="var(--ink)" fillOpacity={0.08} stroke="none" />
        <line x1={-halfW + arm} y1={-halfD + back} x2={halfW - arm} y2={-halfD + back} stroke={soft} strokeWidth={10} />
        <line x1={0} y1={-halfD + back} x2={0} y2={halfD} stroke={soft} strokeWidth={8} />
      </>
    );
  } else if (category.includes('table')) {
    const leg = Math.min(70, w * 0.06);
    shape = (
      <>
        <rect x={-halfW} y={-halfD} width={w} height={d} rx={Math.min(50, d * 0.1)} {...base} />
        <rect x={-halfW + 60} y={-halfD + 60} width={w - 120} height={d - 120} rx={20} fill="none" stroke={soft} strokeWidth={8} />
        {[
          [-halfW + leg, -halfD + leg],
          [halfW - leg, -halfD + leg],
          [-halfW + leg, halfD - leg],
          [halfW - leg, halfD - leg],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={leg * 0.5} fill="var(--ink)" fillOpacity={0.22} />
        ))}
      </>
    );
  } else if (category.includes('storage')) {
    shape = (
      <>
        <rect x={-halfW} y={-halfD} width={w} height={d} rx={30} {...base} />
        <line x1={0} y1={-halfD} x2={0} y2={halfD} stroke={soft} strokeWidth={10} />
        <line x1={-halfW + 50} y1={0} x2={-50} y2={0} stroke={soft} strokeWidth={8} strokeDasharray="40 30" />
        <line x1={50} y1={0} x2={halfW - 50} y2={0} stroke={soft} strokeWidth={8} strokeDasharray="40 30" />
      </>
    );
  } else if (category.includes('light')) {
    const r = Math.min(halfW, halfD);
    shape = (
      <>
        <circle cx={0} cy={0} r={r} {...base} />
        <circle cx={0} cy={0} r={r * 0.45} fill="none" stroke={soft} strokeWidth={8} />
        <line x1={-r * 1.35} y1={0} x2={r * 1.35} y2={0} stroke={soft} strokeWidth={7} />
        <line x1={0} y1={-r * 1.35} x2={0} y2={r * 1.35} stroke={soft} strokeWidth={7} />
      </>
    );
  } else if (category.includes('plant')) {
    const r = Math.min(halfW, halfD);
    shape = (
      <>
        <circle cx={0} cy={0} r={r} {...base} />
        <path d={`M 0 ${r * 0.65} C ${-r * 0.8} ${r * 0.1}, ${-r * 0.3} ${-r * 0.75}, 0 ${-r * 0.9}`} fill="none" stroke={soft} strokeWidth={10} strokeLinecap="round" />
        <path d={`M 0 ${r * 0.65} C ${r * 0.8} ${r * 0.1}, ${r * 0.35} ${-r * 0.7}, 0 ${-r * 0.9}`} fill="none" stroke={soft} strokeWidth={10} strokeLinecap="round" />
        <path d={`M 0 ${r * 0.6} V ${-r * 0.35}`} stroke={soft} strokeWidth={8} strokeLinecap="round" />
      </>
    );
  } else if (category.includes('textile')) {
    shape = (
      <>
        <rect x={-halfW} y={-halfD} width={w} height={d} rx={Math.min(30, d * 0.08)} {...base} />
        {[-0.25, 0, 0.25].map((t) => (
          <path
            key={t}
            d={`M ${-halfW + 50} ${halfD * t} q ${w / 8} ${-d * 0.08} ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0`}
            fill="none"
            stroke={soft}
            strokeWidth={8}
          />
        ))}
      </>
    );
  } else {
    shape = (
      <>
        <rect x={-halfW} y={-halfD} width={w} height={d} rx={40} {...base} />
        <line x1={-halfW} y1={-halfD} x2={halfW} y2={halfD} stroke={soft} strokeWidth={8} />
        <line x1={halfW} y1={-halfD} x2={-halfW} y2={halfD} stroke={soft} strokeWidth={8} />
      </>
    );
  }

  return <>{shape}</>;
}

/** Treads and an up arrow for a stair void. */
function StairSymbol({ points }: { points: Pt[] }) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const horizontal = x1 - x0 >= y1 - y0;
  const length = horizontal ? x1 - x0 : y1 - y0;
  const treads = Math.max(3, Math.min(16, Math.round(length / 280)));
  const lines = Array.from({ length: treads - 1 }, (_, i) => {
    const t = (i + 1) / treads;
    return horizontal ? (
      <line key={i} x1={x0 + length * t} y1={y0} x2={x0 + length * t} y2={y1} stroke="var(--ink)" strokeWidth={10} opacity={0.4} />
    ) : (
      <line key={i} x1={x0} y1={y0 + length * t} x2={x1} y2={y0 + length * t} stroke="var(--ink)" strokeWidth={10} opacity={0.4} />
    );
  });
  const arrow = horizontal
    ? { x1: x0 + length * 0.16, y1: (y0 + y1) / 2, x2: x0 + length * 0.84, y2: (y0 + y1) / 2 }
    : { x1: (x0 + x1) / 2, y1: y1 - length * 0.16, x2: (x0 + x1) / 2, y2: y0 + length * 0.16 };
  const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
  const head = 320;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {lines}
      <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} stroke="var(--ink)" strokeWidth={16} opacity={0.6} />
      <polygon
        points={`${arrow.x2},${arrow.y2} ${arrow.x2 - head * Math.cos(angle - 0.4)},${arrow.y2 - head * Math.sin(angle - 0.4)} ${arrow.x2 - head * Math.cos(angle + 0.4)},${arrow.y2 - head * Math.sin(angle + 0.4)}`}
        fill="var(--ink)"
        opacity={0.6}
      />
      <text
        x={(arrow.x1 + arrow.x2) / 2}
        y={(arrow.y1 + arrow.y2) / 2 - 160}
        textAnchor="middle"
        fontSize={360}
        fontWeight={600}
        fill="var(--ink)"
        opacity={0.55}
      >
        UP
      </text>
    </g>
  );
}

export function PlanCanvas({
  floor,
  tool,
  selected,
  layers,
  activeProduct,
  background,
  calibrationPoints,
  calibrationActive,
  highlight = [],
  onSelect,
  onHighlight,
  onChange,
  onStatus,
  onCalibrationPick,
  onRequestTool,
}: PlanCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });
  const [center, setCenter] = useState<Pt>({ x: 2100, y: 1800 });
  const [zoom, setZoom] = useState(0.12);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [hover, setHover] = useState<Pt | null>(null);
  const [rectStart, setRectStart] = useState<Pt | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const space = useRef(false);
  const didFit = useRef(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(() => {
      setSize({ w: wrap.clientWidth, h: wrap.clientHeight });
    });
    observer.observe(wrap);
    setSize({ w: wrap.clientWidth, h: wrap.clientHeight });
    return () => observer.disconnect();
  }, []);

  const viewW = size.w / zoom;
  const viewH = size.h / zoom;
  const view = { x: center.x - viewW / 2, y: center.y - viewH / 2, w: viewW, h: viewH };

  const fit = useCallback(() => {
    const points: Pt[] = [];
    floor.walls.forEach((wall) => points.push(wall.a, wall.b));
    floor.rooms.forEach((room) => points.push(...room.points));
    if (points.length === 0) {
      setCenter({ x: 2100, y: 1800 });
      setZoom(0.12);
      return;
    }
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));
    const w = Math.max(1200, maxX - minX);
    const h = Math.max(1200, maxY - minY);
    const z = Math.min((size.w - 120) / (w * 1.35), (size.h - 120) / (h * 1.35));
    setCenter({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
    setZoom(Math.max(0.02, Math.min(1.2, z)));
  }, [floor.rooms, floor.walls, size.h, size.w]);

  useEffect(() => {
    if (didFit.current || size.w < 50) return;
    didFit.current = true;
    fit();
  }, [fit, size.w]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space') space.current = event.type === 'keydown';
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  // Native wheel listener so zooming can cancel the page scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;
      const before = { x: center.x + px / zoom, y: center.y + py / zoom };
      const factor = Math.exp(-event.deltaY * 0.0014);
      const nextZoom = Math.max(0.01, Math.min(2.5, zoom * factor));
      setZoom(nextZoom);
      setCenter({ x: before.x - px / nextZoom, y: before.y - py / nextZoom });
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [center, zoom]);

  const toWorld = useCallback(
    (event: { clientX: number; clientY: number }): Pt => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: center.x + (event.clientX - rect.left - rect.width / 2) / zoom,
        y: center.y + (event.clientY - rect.top - rect.height / 2) / zoom,
      };
    },
    [center, zoom],
  );

  const snapWithAngle = (last: Pt, raw: Pt): Pt => {
    const angle = Math.atan2(raw.y - last.y, raw.x - last.x);
    const snapped = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
    const distance = Math.max(GRID, snap(dist(last, raw)));
    const point = {
      x: snap(last.x + Math.cos(snapped) * distance),
      y: snap(last.y + Math.sin(snapped) * distance),
    };
    // Join to a nearby existing corner when one is close enough to be intended.
    const endpoint = snapEndpoint(floor, point);
    return dist(endpoint, last) >= MIN_WALL ? endpoint : point;
  };

  const commitFloor = (updater: (current: Floor) => Floor) => onChange(updater);

  const finishWallRun = (points: Pt[]) => {
    if (points.length < 2) {
      setDraft([]);
      return;
    }
    const clean = points.filter((p, i) => i === 0 || dist(p, points[i - 1]) >= MIN_WALL);
    if (clean.length < 2) {
      onStatus(`Walls need at least ${MIN_WALL} mm between points.`, 'error');
      setDraft([]);
      return;
    }
    const closed = clean.length >= 4 && dist(clean[0], clean[clean.length - 1]) < 400;
    const loop = closed ? clean.slice(0, -1) : clean;
    const walls: Wall[] = [];
    for (let i = 0; i < loop.length - 1; i++) {
      walls.push({ id: uid('wall'), a: loop[i], b: loop[i + 1], thickness: DEFAULT_WALL_THICKNESS });
    }
    if (closed) {
      walls.push({ id: uid('wall'), a: loop[loop.length - 1], b: loop[0], thickness: DEFAULT_WALL_THICKNESS });
    }
    commitFloor((current) => {
      // A shared wall is drawn once; later rooms reuse it instead of stacking.
      const added = walls.filter((wall) => !current.walls.some((existing) => sameWall(existing, wall)));
      const knownRooms = closed
        ? current.rooms.some(
            (room) =>
              room.points.length === loop.length &&
              room.points.every((point, index) => samePoint(point, loop[index])),
          )
        : false;
      return {
        ...current,
        walls: [...current.walls, ...added],
        rooms: closed && !knownRooms
          ? [...current.rooms, { id: uid('room'), name: `Room ${current.rooms.length + 1}`, kind: 'room', points: loop }]
          : current.rooms,
      };
    });
    onStatus(closed ? `Closed room added — ${loop.length} walls.` : `${walls.length} wall run${walls.length === 1 ? '' : 's'} added.`, 'ok');
    setDraft([]);
  };

  const finishRect = (a: Pt, b: Pt) => {
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const y2 = Math.max(a.y, b.y);
    if (x2 - x1 < MIN_WALL || y2 - y1 < MIN_WALL) {
      onStatus(`A room needs at least ${MIN_WALL} mm on both sides.`, 'error');
      return;
    }
    const points: Pt[] = [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
      { x: x1, y: y2 },
    ];
    const walls: Wall[] = points.map((p, i) => ({
      id: uid('wall'),
      a: p,
      b: points[(i + 1) % points.length],
      thickness: DEFAULT_WALL_THICKNESS,
    }));
    const name = `Room ${floor.rooms.length + 1}`;
    commitFloor((current) => {
      const added = walls.filter((wall) => !current.walls.some((existing) => sameWall(existing, wall)));
      return {
        ...current,
        walls: [...current.walls, ...added],
        rooms: [...current.rooms, { id: uid('room'), name, kind: tool === 'stair' ? 'stair' : 'room', points }],
      };
    });
    onStatus(`${tool === 'stair' ? 'Stair void' : 'Room'} added — ${((x2 - x1) * (y2 - y1) / 1_000_000).toFixed(2)} m².`, 'ok');
  };

  const placeOpening = (p: Pt, kind: 'door' | 'window') => {
    const hit = nearestWall(floor, p);
    if (!hit) {
      onStatus('Click directly on a wall to place an opening.', 'error');
      return;
    }
    const width = kind === 'door' ? 900 : 1200;
    const offset = snap(hit.offset, 50);
    const check = validateOpening(floor, hit.wall.id, offset, width);
    if (!check.ok) {
      onStatus(check.reason, 'error');
      return;
    }
    const opening: Opening = {
      id: uid('opening'),
      wallId: hit.wall.id,
      kind,
      offset,
      width,
      height: kind === 'door' ? 2100 : 1350,
      sill: kind === 'door' ? 0 : 900,
      swing: 1,
    };
    commitFloor((current) => ({ ...current, openings: [...current.openings, opening] }));
    onSelect({ kind: 'opening', id: opening.id });
    onStatus(`${kind === 'door' ? 'Door' : 'Window'} placed — ${width} mm wide.`, 'ok');
  };

  const placeFurniture = (p: Pt) => {
    if (!activeProduct) {
      onStatus('Choose a piece from the catalogue first.', 'info');
      return;
    }
    const item: FurnitureItem = {
      id: uid('piece'),
      productId: activeProduct.id,
      name: activeProduct.name,
      category: activeProduct.category,
      x: p.x,
      y: p.y,
      w: activeProduct.w,
      d: activeProduct.d,
      h: activeProduct.h,
      rotation: 0,
    };
    const check = validateFurniture(floor, item);
    if (!check.ok) {
      onStatus(check.reason, 'error');
      return;
    }
    commitFloor((current) => ({ ...current, furniture: [...current.furniture, item] }));
    onSelect({ kind: 'furniture', id: item.id });
    onStatus(`${item.name} placed inside ${roomForPoint(floor, p)?.name ?? 'the room'}.`, 'ok');
  };

  const onBackgroundPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button === 1 || space.current) {
      event.preventDefault();
      setDrag({ kind: 'pan', startClient: { x: event.clientX, y: event.clientY }, startCenter: center });
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
      return;
    }
    if (calibrationActive) {
      onCalibrationPick(snapPt(toWorld(event)));
      return;
    }
    const p = snapEndpoint(floor, snapPt(toWorld(event)));
    if (tool === 'wall') {
      if (draft.length === 0) {
        setDraft([p]);
        return;
      }
      if (dist(p, draft[0]) < 350 && draft.length >= 3) {
        finishWallRun([...draft, draft[0]]);
        return;
      }
      const next = snapWithAngle(draft[draft.length - 1], toWorld(event));
      if (dist(next, draft[draft.length - 1]) < MIN_WALL) {
        onStatus(`Walls need at least ${MIN_WALL} mm between points.`, 'error');
        return;
      }
      setDraft([...draft, next]);
      return;
    }
    if (tool === 'room' || tool === 'stair') {
      setRectStart(p);
      setHover(p);
      return;
    }
    if (tool === 'door') return placeOpening(toWorld(event), 'door');
    if (tool === 'window') return placeOpening(toWorld(event), 'window');
    if (tool === 'furniture') return placeFurniture(snapPt(toWorld(event)));
    // Select tool on empty sheet: begin a marquee. A click without movement
    // still clears the selection.
    onHighlight([]);
    setDrag({ kind: 'marquee', start: p, current: p, moved: false });
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const p = toWorld(event);
    setHover(p);
    if (drag?.kind === 'pan') {
      const dx = (event.clientX - drag.startClient.x) / zoom;
      const dy = (event.clientY - drag.startClient.y) / zoom;
      setCenter({ x: drag.startCenter.x - dx, y: drag.startCenter.y - dy });
      return;
    }
    if (drag?.kind === 'furniture') {
      const snapP = snapPt(p);
      const origin = drag.origin;
      const dx = snapP.x - drag.start.x;
      const dy = snapP.y - drag.start.y;
      const next = { ...drag.preview, x: origin.x + dx, y: origin.y + dy };
      setDrag({ ...drag, preview: next, moved: drag.moved || Math.abs(dx) + Math.abs(dy) > 1 });
      return;
    }
    if (drag?.kind === 'opening') {
      const wall = floor.walls.find((w) => w.id === drag.wallId);
      if (!wall) return;
      const hit = projectOnWall(wall, p);
      const offset = snap(Math.max(0, Math.min(wallLength(wall), hit.offset)), 50);
      setDrag({ ...drag, preview: offset, moved: drag.moved || Math.abs(offset - drag.startOffset) > 1 });
      return;
    }
    if (drag?.kind === 'marquee') {
      setDrag({ ...drag, current: p, moved: drag.moved || dist(drag.start, p) > 12 / zoom });
      return;
    }
    if (drag?.kind === 'wall') {
      const wall = floor.walls.find((entry) => entry.id === drag.id);
      if (!wall) return;
      const dx = snap(p.x - drag.start.x);
      const dy = snap(p.y - drag.start.y);
      setDrag({
        ...drag,
        preview: {
          a: { x: wall.a.x + dx, y: wall.a.y + dy },
          b: { x: wall.b.x + dx, y: wall.b.y + dy },
        },
        moved: drag.moved || Math.abs(dx) + Math.abs(dy) > 1,
      });
      return;
    }
    if (drag?.kind === 'room') {
      const dx = snap(p.x - drag.start.x);
      const dy = snap(p.y - drag.start.y);
      setDrag({
        ...drag,
        preview: drag.startPoints.map((point) => ({ x: point.x + dx, y: point.y + dy })),
        moved: drag.moved || Math.abs(dx) + Math.abs(dy) > 1,
      });
    }
  };

  const marqueeHits = (a: Pt, b: Pt): string[] => {
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const y2 = Math.max(a.y, b.y);
    const inside = (p: Pt) => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
    const overlap = (p: Pt, q: Pt) =>
      Math.max(p.x, q.x) >= x1 && Math.min(p.x, q.x) <= x2 &&
      Math.max(p.y, q.y) >= y1 && Math.min(p.y, q.y) <= y2;

    const ids: string[] = [];
    for (const wall of floor.walls) {
      if (inside(wall.a) || inside(wall.b) || overlap(wall.a, wall.b)) ids.push(wall.id);
    }
    for (const room of floor.rooms) {
      if (room.points.some(inside) || inside(polygonCentroid(room.points))) ids.push(room.id);
    }
    for (const opening of floor.openings) {
      const span = openingSpan(floor, opening);
      if (span && inside({ x: (span.start.x + span.end.x) / 2, y: (span.start.y + span.end.y) / 2 })) {
        ids.push(opening.id);
      }
    }
    for (const item of floor.furniture) {
      if (inside({ x: item.x, y: item.y })) ids.push(item.id);
    }
    return ids;
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (drag?.kind === 'pan') {
      setDrag(null);
      return;
    }
    if (drag?.kind === 'marquee') {
      if (drag.moved) {
        const ids = marqueeHits(drag.start, drag.current);
        onHighlight(ids);
        if (ids.length === 1) {
          const id = ids[0];
          const kind = id.startsWith('wall_')
            ? 'wall'
            : id.startsWith('room_')
              ? 'room'
              : id.startsWith('opening_')
                ? 'opening'
                : 'furniture';
          onSelect({ kind, id } as Selection);
        } else if (ids.length > 1) {
          onStatus(`${ids.length} objects highlighted. Delete removes all of them.`, 'info');
        }
      } else {
        onSelect(null);
      }
      setDrag(null);
      return;
    }
    if (drag?.kind === 'wall') {
      if (drag.moved) {
        const from = floor.walls.find((wall) => wall.id === drag.id);
        if (from) {
          const dx = drag.preview.a.x - from.a.x;
          const dy = drag.preview.a.y - from.a.y;
          const moved = (point: Pt) => ({ x: point.x + dx, y: point.y + dy });
          const touches = (point: Pt) =>
            (Math.abs(point.x - from.a.x) < 1 && Math.abs(point.y - from.a.y) < 1) ||
            (Math.abs(point.x - from.b.x) < 1 && Math.abs(point.y - from.b.y) < 1);
          commitFloor((current) => ({
            ...current,
            walls: current.walls.map((wall) => {
              if (wall.id === drag.id) {
                return { ...wall, a: moved(wall.a), b: moved(wall.b) };
              }
              // Keep corners joined: every endpoint that met the moved wall moves with it.
              return { ...wall, a: touches(wall.a) ? moved(wall.a) : wall.a, b: touches(wall.b) ? moved(wall.b) : wall.b };
            }),
            rooms: current.rooms.map((room) => ({
              ...room,
              points: room.points.map((point) => (touches(point) ? moved(point) : point)),
            })),
          }));
          onStatus('Wall moved. Joined corners came with it.', 'ok');
        }
      }
      setDrag(null);
      return;
    }
    if (drag?.kind === 'room') {
      if (drag.moved) {
        const dx = drag.preview[0].x - drag.startPoints[0].x;
        const dy = drag.preview[0].y - drag.startPoints[0].y;
        const matches = (point: Pt) =>
          drag.startPoints.some((origin) => Math.abs(origin.x - point.x) < 1 && Math.abs(origin.y - point.y) < 1);
        const moved = (point: Pt) => ({ x: point.x + dx, y: point.y + dy });
        commitFloor((current) => ({
          ...current,
          rooms: current.rooms.map((room) =>
            room.id === drag.id ? { ...room, points: drag.preview } : room,
          ),
          walls: current.walls.map((wall) => ({
            ...wall,
            a: matches(wall.a) ? moved(wall.a) : wall.a,
            b: matches(wall.b) ? moved(wall.b) : wall.b,
          })),
          furniture: current.furniture.map((item) =>
            pointInPolygon({ x: item.x, y: item.y }, drag.startPoints)
              ? { ...item, x: item.x + dx, y: item.y + dy }
              : item,
          ),
        }));
        onStatus('Room moved with its walls and furniture.', 'ok');
      }
      setDrag(null);
      return;
    }
    if (drag?.kind === 'furniture') {
      if (!drag.moved) {
        setDrag(null);
        return;
      }
      const check = validateFurniture(floor, drag.preview);
      if (check.ok) {
        const preview = drag.preview;
        commitFloor((current) => ({
          ...current,
          furniture: current.furniture.map((item) => (item.id === preview.id ? preview : item)),
        }));
        onStatus(`${preview.name} moved.`, 'ok');
      } else {
        onStatus(check.reason, 'error');
      }
      setDrag(null);
      return;
    }
    if (drag?.kind === 'opening') {
      if (!drag.moved) {
        setDrag(null);
        return;
      }
      const opening = floor.openings.find((o) => o.id === drag.id);
      if (opening) {
        const check = validateOpening(floor, drag.wallId, drag.preview, opening.width, opening.id);
        if (check.ok) {
          const offset = drag.preview;
          commitFloor((current) => ({
            ...current,
            openings: current.openings.map((o) => (o.id === opening.id ? { ...o, offset } : o)),
          }));
          onStatus('Opening moved along the wall.', 'ok');
        } else {
          onStatus(check.reason, 'error');
        }
      }
      setDrag(null);
      return;
    }
    if (rectStart) {
      finishRect(rectStart, snapPt(toWorld(event)));
      setRectStart(null);
    }
  };

  const startFurnitureDrag = (event: React.PointerEvent, item: FurnitureItem) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    onSelect({ kind: 'furniture', id: item.id });
    const p = snapPt(toWorld(event));
    setDrag({
      kind: 'furniture',
      id: item.id,
      start: p,
      origin: { x: item.x, y: item.y },
      preview: item,
      moved: false,
    });
    onHighlight([]);
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const startOpeningDrag = (event: React.PointerEvent, opening: Opening) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    onSelect({ kind: 'opening', id: opening.id });
    onHighlight([]);
    setDrag({
      kind: 'opening',
      id: opening.id,
      wallId: opening.wallId,
      startOffset: opening.offset,
      preview: opening.offset,
      moved: false,
    });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const startWallDrag = (event: React.PointerEvent, wall: Wall) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    onSelect({ kind: 'wall', id: wall.id });
    onHighlight([]);
    setDrag({
      kind: 'wall',
      id: wall.id,
      start: snapPt(toWorld(event)),
      preview: { a: wall.a, b: wall.b },
      moved: false,
    });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const startRoomDrag = (event: React.PointerEvent, room: Room) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    onSelect({ kind: 'room', id: room.id });
    onHighlight([]);
    setDrag({
      kind: 'room',
      id: room.id,
      start: snapPt(toWorld(event)),
      preview: room.points,
      startPoints: room.points,
      moved: false,
    });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const gridStep = viewW > 30000 ? 2000 : viewW > 14000 ? 1000 : viewW > 7000 ? 500 : GRID;
  const minorStep = gridStep / 5;
  const text = Math.max(80, 11 / zoom);
  const small = Math.max(60, 8 / zoom);

  const draftPreview =
    draft.length > 0 && hover
      ? tool === 'wall'
        ? snapWithAngle(draft[draft.length - 1], hover)
        : null
      : null;

  const rectPreview =
    rectStart && hover
      ? {
          x: Math.min(rectStart.x, snapPt(hover).x),
          y: Math.min(rectStart.y, snapPt(hover).y),
          w: Math.abs(snapPt(hover).x - rectStart.x),
          h: Math.abs(snapPt(hover).y - rectStart.y),
        }
      : null;

  const est = useMemo(() => estimate(floor, 2800), [floor]);

  const dragCheck =
    drag?.kind === 'furniture' ? validateFurniture(floor, drag.preview, drag.id) : null;

  return (
    <div className="plan-canvas" ref={wrapRef}>
      <svg
        ref={svgRef}
        className={`plan-canvas__svg ${tool !== 'select' ? 'is-drawing' : ''}`}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <pattern id={`${zip}-minor`} width={minorStep} height={minorStep} patternUnits="userSpaceOnUse">
            <path d={`M ${minorStep} 0 L 0 0 0 ${minorStep}`} fill="none" stroke="var(--hair-2, #e6e4df)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </pattern>
          <pattern id={`${zip}-grid`} width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
            <rect width={gridStep} height={gridStep} fill={`url(#${zip}-minor)`} />
            <path d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`} fill="none" stroke="var(--hair, #d7d4cc)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </pattern>
          <pattern id={`${zip}-hatch`} width={120} height={120} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={120} stroke="var(--ink)" strokeWidth={18} opacity={0.14} />
          </pattern>
        </defs>

        {layers.grid ? (
          <rect x={view.x} y={view.y} width={view.w} height={view.h} fill={`url(#${zip}-grid)`} />
        ) : null}

        {background ? (
          <image
            href={background.src}
            x={0}
            y={0}
            width={background.width}
            height={background.height}
            opacity={0.28}
            preserveAspectRatio="none"
          />
        ) : null}

        {layers.rooms
          ? floor.rooms.map((room) => {
              const shownPoints =
                drag?.kind === 'room' && drag.id === room.id ? drag.preview : room.points;
              const area = Math.abs(polygonArea(shownPoints)) / 1_000_000;
              const c = polygonCentroid(shownPoints);
              const isSelected = selected?.kind === 'room' && selected.id === room.id;
              const isHighlighted = highlight.includes(room.id);
              return (
                <g key={room.id}>
                  <polygon
                    points={shownPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill={room.kind === 'stair' ? `url(#${zip}-hatch)` : (floor.floorColor ?? 'var(--ink)')}
                    fillOpacity={room.kind === 'stair' ? 1 : isSelected ? 0.55 : isHighlighted ? 0.5 : 0.42}
                    stroke={isSelected || isHighlighted ? 'var(--ink)' : 'none'}
                    strokeWidth={isHighlighted ? 34 : 20}
                    strokeDasharray={isHighlighted && !isSelected ? '70 40' : undefined}
                    onPointerDown={(event) => startRoomDrag(event, room)}
                    style={{ cursor: tool === 'select' ? 'grab' : 'default' }}
                  />
                  {room.kind === 'stair' ? <StairSymbol points={shownPoints} /> : null}
                  <text
                    x={c.x}
                    y={c.y - text * 0.2}
                    textAnchor="middle"
                    fontSize={text * 1.4}
                    fill="var(--ink)"
                    fontWeight={600}
                    style={{ pointerEvents: 'none' }}
                  >
                    {room.name}
                  </text>
                  <text
                    x={c.x}
                    y={c.y + text * 1.2}
                    textAnchor="middle"
                    fontSize={small * 1.3}
                    fill="var(--ink-55, #666)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {area.toFixed(2)} m² · {room.kind === 'stair' ? 'stair void' : 'floor'}
                  </text>
                </g>
              );
            })
          : null}

        {layers.clearances && tool === 'furniture'
          ? floor.openings
              .filter((o) => o.kind === 'door')
              .map((opening) => {
                const span = openingSpan(floor, opening);
                if (!span) return null;
                const { wall, start, end } = span;
                const angle = wallAngle(wall);
                const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
                return [1, -1].map((side) => {
                  const centre = {
                    x: (start.x + end.x) / 2 + normal.x * 300 * side,
                    y: (start.y + end.y) / 2 + normal.y * 300 * side,
                  };
                  if (!floor.rooms.some((room) => pointInPolygon(centre, room.points))) return null;
                  return (
                  <polygon
                    key={`${opening.id}-${side}`}
                    points={[
                      `${start.x},${start.y}`,
                      `${end.x},${end.y}`,
                      `${end.x + normal.x * 600 * side},${end.y + normal.y * 600 * side}`,
                      `${start.x + normal.x * 600 * side},${start.y + normal.y * 600 * side}`,
                    ].join(' ')}
                    fill={`url(#${zip}-hatch)`}
                    opacity={0.6}
                    style={{ pointerEvents: 'none' }}
                  />
                  );
                });
              })
          : null}

        {layers.walls
          ? floor.walls.map((wall) => {
              const shown =
                drag?.kind === 'wall' && drag.id === wall.id
                  ? { ...wall, ...drag.preview }
                  : wall;
              const isSelected = selected?.kind === 'wall' && selected.id === wall.id;
              const isHighlighted = highlight.includes(wall.id);
              return (
                <g key={wall.id}>
                  {segmentsForWall(floor, shown).map(([a, b], index) => (
                    <g key={index}>
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={floor.wallColor ?? 'var(--ink)'}
                        strokeWidth={wall.thickness}
                        strokeLinecap="butt"
                        opacity={isSelected ? 1 : 0.96}
                        onPointerDown={(event) => startWallDrag(event, wall)}
                        style={{ cursor: tool === 'select' ? 'grab' : 'crosshair' }}
                      />
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="var(--ink)"
                        strokeWidth={8}
                        strokeLinecap="round"
                        opacity={isHighlighted ? 0.85 : isSelected ? 0.55 : 0.22}
                        strokeDasharray={isHighlighted && !isSelected ? '60 40' : undefined}
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                  ))}
                  {isSelected || isHighlighted ? (
                    <line
                      x1={shown.a.x}
                      y1={shown.a.y}
                      x2={shown.b.x}
                      y2={shown.b.y}
                      stroke="var(--ink)"
                      strokeWidth={12}
                      strokeDasharray="60 50"
                      opacity={0.4}
                      style={{ pointerEvents: 'none' }}
                    />
                  ) : null}
                </g>
              );
            })
          : null}

        {layers.openings
          ? floor.openings.map((opening) => {
              const span = openingSpan(floor, opening);
              if (!span) return null;
              const { wall } = span;
              const angle = wallAngle(wall);
              const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
              const isSelected = selected?.kind === 'opening' && selected.id === opening.id;
              const isHighlighted = highlight.includes(opening.id);
              const previewOffset = drag?.kind === 'opening' && drag.id === opening.id ? drag.preview : opening.offset;
              const prevStart = pointOnWall(wall, previewOffset - opening.width / 2);
              const prevEnd = pointOnWall(wall, previewOffset + opening.width / 2);
              const hinge = opening.swing === 1 ? prevStart : prevEnd;
              const leafEnd = { x: hinge.x + normal.x * opening.width, y: hinge.y + normal.y * opening.width };
              return (
                <g
                  key={opening.id}
                  onPointerDown={(event) => startOpeningDrag(event, opening)}
                  style={{ cursor: tool === 'select' ? 'grab' : 'crosshair' }}
                >
                  {opening.kind === 'window' ? (
                    <>
                      <line x1={prevStart.x} y1={prevStart.y} x2={prevEnd.x} y2={prevEnd.y} stroke="var(--paper, #fff)" strokeWidth={wall.thickness + 20} />
                      {[-1, 1].map((side) => (
                        <line
                          key={side}
                          x1={prevStart.x + normal.x * (wall.thickness / 2) * side}
                          y1={prevStart.y + normal.y * (wall.thickness / 2) * side}
                          x2={prevEnd.x + normal.x * (wall.thickness / 2) * side}
                          y2={prevEnd.y + normal.y * (wall.thickness / 2) * side}
                          stroke={isSelected ? 'var(--ink)' : 'var(--ink-55, #666)'}
                          strokeWidth={22}
                        />
                      ))}
                      <line x1={prevStart.x} y1={prevStart.y} x2={prevEnd.x} y2={prevEnd.y} stroke="var(--ink-38, #999)" strokeWidth={10} />
                    </>
                  ) : (
                    <>
                      <line x1={prevStart.x} y1={prevStart.y} x2={prevEnd.x} y2={prevEnd.y} stroke="var(--paper, #fff)" strokeWidth={wall.thickness + 20} />
                      <line x1={hinge.x} y1={hinge.y} x2={leafEnd.x} y2={leafEnd.y} stroke={isSelected || isHighlighted ? 'var(--ink)' : 'var(--ink-55, #666)'} strokeWidth={isHighlighted ? 34 : 22} />
                      <line x1={prevStart.x} y1={prevStart.y} x2={prevEnd.x} y2={prevEnd.y} stroke="var(--ink)" strokeWidth={12} opacity={0.5} strokeDasharray="30 30" />
                    </>
                  )}
                </g>
              );
            })
          : null}

        {drag?.kind === 'opening'
          ? (() => {
              const opening = floor.openings.find((o) => o.id === drag.id);
              if (!opening) return null;
              const wall = floor.walls.find((w) => w.id === drag.wallId);
              if (!wall) return null;
              const start = pointOnWall(wall, drag.preview - opening.width / 2);
              const end = pointOnWall(wall, drag.preview + opening.width / 2);
              return (
                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="var(--ink)" strokeWidth={wall.thickness + 30} opacity={0.2} style={{ pointerEvents: 'none' }} />
              );
            })()
          : null}

        {layers.furniture
          ? floor.furniture.map((item) => {
              const isSelected = selected?.kind === 'furniture' && selected.id === item.id;
              const isHighlighted = highlight.includes(item.id);
              const shown = drag?.kind === 'furniture' && drag.id === item.id ? drag.preview : item;
              const check = drag?.kind === 'furniture' && drag.id === item.id ? validateFurniture(floor, shown) : { ok: true };
              return (
                <g
                  key={item.id}
                  transform={`translate(${shown.x} ${shown.y}) rotate(${shown.rotation})`}
                  onPointerDown={(event) => startFurnitureDrag(event, item)}
                  style={{ cursor: tool === 'select' ? 'grab' : 'default' }}
                >
                  <FurnitureSymbol
                    item={shown}
                    invalid={!check.ok}
                    selected={isSelected}
                    highlighted={isHighlighted}
                  />
                  {isSelected || isHighlighted ? (
                    <rect
                      x={-shown.w / 2 - 60}
                      y={-shown.d / 2 - 60}
                      width={shown.w + 120}
                      height={shown.d + 120}
                      fill="none"
                      stroke="var(--ink)"
                      strokeWidth={isSelected ? 22 : 16}
                      strokeDasharray={isHighlighted && !isSelected ? '60 40' : undefined}
                      rx={60}
                      style={{ pointerEvents: 'none' }}
                    />
                  ) : null}
                  <text x={0} y={small * 0.6} textAnchor="middle" fontSize={small} fill="var(--ink)" style={{ pointerEvents: 'none' }}>
                    {shown.name}
                  </text>
                  <text x={0} y={shown.d / 2 + small * 1.4} textAnchor="middle" fontSize={small * 0.9} fill="var(--ink-55, #666)" style={{ pointerEvents: 'none' }}>
                    {shown.w} × {shown.d}
                  </text>
                </g>
              );
            })
          : null}

        {layers.dimensions
          ? floor.walls.map((wall) => {
              const length = wallLength(wall);
              const normal = outwardNormal(wall, floor);
              const offset = 420;
              const a = { x: wall.a.x + normal.x * offset, y: wall.a.y + normal.y * offset };
              const b = { x: wall.b.x + normal.x * offset, y: wall.b.y + normal.y * offset };
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
              const angle = (wallAngle(wall) * 180) / Math.PI;
              const flip = angle > 90 || angle < -90;
              return (
                <g key={`dim-${wall.id}`} style={{ pointerEvents: 'none' }}>
                  <line x1={wall.a.x} y1={wall.a.y} x2={a.x} y2={a.y} stroke="var(--ink-38, #999)" strokeWidth={8} />
                  <line x1={wall.b.x} y1={wall.b.y} x2={b.x} y2={b.y} stroke="var(--ink-38, #999)" strokeWidth={8} />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--ink-55, #666)" strokeWidth={10} />
                  <text
                    x={mid.x}
                    y={mid.y - small * 0.5}
                    textAnchor="middle"
                    fontSize={small * 1.2}
                    fill="var(--ink)"
                    transform={`rotate(${flip ? angle + 180 : angle} ${mid.x} ${mid.y})`}
                  >
                    {Math.round(length)} mm
                  </text>
                </g>
              );
            })
          : null}

        {draft.length > 0 ? (
          <g style={{ pointerEvents: 'none' }}>
            <polyline
              points={[...draft, ...(draftPreview ? [draftPreview] : [])].map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={DEFAULT_WALL_THICKNESS}
              opacity={0.25}
            />
            {draft.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={60} fill="var(--ink)" />
            ))}
          </g>
        ) : null}

        {rectPreview ? (
          <rect
            x={rectPreview.x}
            y={rectPreview.y}
            width={rectPreview.w}
            height={rectPreview.h}
            fill="var(--ink)"
            fillOpacity={0.05}
            stroke="var(--ink)"
            strokeWidth={20}
            strokeDasharray="60 40"
            style={{ pointerEvents: 'none' }}
          />
        ) : null}

        {calibrationPoints.map((p, i) => (
          <g key={i} style={{ pointerEvents: 'none' }}>
            <circle cx={p.x} cy={p.y} r={90} fill="var(--paper, #fff)" stroke="var(--ink)" strokeWidth={20} />
            <text x={p.x} y={p.y + 30} textAnchor="middle" fontSize={small} fill="var(--ink)">
              {i + 1}
            </text>
          </g>
        ))}
        {calibrationPoints.length === 2 ? (
          <line
            x1={calibrationPoints[0].x}
            y1={calibrationPoints[0].y}
            x2={calibrationPoints[1].x}
            y2={calibrationPoints[1].y}
            stroke="var(--ink)"
            strokeWidth={18}
            strokeDasharray="60 40"
            style={{ pointerEvents: 'none' }}
          />
        ) : null}
      </svg>

      <div className="plan-canvas__hud mono">
        <span>Grid {gridStep} mm</span>
        <span>Zoom {Math.round(zoom * 1000) / 10}%</span>
        <span>X {Math.round(hover?.x ?? 0)} · Y {Math.round(hover?.y ?? 0)} mm</span>
        <span>
          {highlight.length > 1
            ? `${highlight.length} highlighted`
            : selected
              ? '1 selected'
              : 'Nothing selected'}
        </span>
        <span>{est.floorArea.toFixed(2)} m² · {floor.rooms.length} rooms · {floor.furniture.length} pieces</span>
      </div>

      {floor.rooms.length === 0 && floor.walls.length === 0 && !calibrationActive ? (
        <div className="plan-empty">
          <p className="mono plan-empty__eyebrow">Blank sheet</p>
          <h2>Start with a room, or trace the walls.</h2>
          <p>
            A room rectangle is the quickest way in. Once a room closes, its floor, walls and 3D
            preview appear automatically.
          </p>
          <div className="plan-empty__actions">
            <button type="button" className="bp-btn bp-btn--solid mono" onClick={() => onRequestTool?.('room')}>
              Room rectangle · R
            </button>
            <button type="button" className="bp-btn mono" onClick={() => onRequestTool?.('wall')}>
              Draw walls · W
            </button>
          </div>
        </div>
      ) : null}

      {dragCheck && !dragCheck.ok ? (
        <div className="plan-canvas__warning mono" role="status">
          {dragCheck.reason}
        </div>
      ) : null}

      <div className="plan-canvas__zoom">
        <button type="button" className="plan-tool" onClick={() => setZoom((z) => Math.min(2.5, z * 1.25))} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="plan-tool" onClick={() => setZoom((z) => Math.max(0.01, z / 1.25))} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="plan-tool plan-tool--wide mono" onClick={fit}>
          Fit
        </button>
      </div>
    </div>
  );
}
