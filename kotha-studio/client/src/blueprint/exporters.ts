import {
  estimate,
  mm,
  openingSpan,
  pointInPolygon,
  pointOnWall,
  polygonArea,
  polygonCentroid,
  totalEstimate,
  wallAngle,
  wallLength,
} from './geometry';
import type { BlueprintDoc, Floor, Pt, Wall } from './types';

function segmentsForWall(floor: Floor, wall: Wall): Array<[Pt, Pt]> {
  const length = wallLength(wall);
  const openings = floor.openings
    .filter((opening) => opening.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);
  const out: Array<[Pt, Pt]> = [];
  let cursor = 0;
  for (const opening of openings) {
    const start = Math.max(0, opening.offset - opening.width / 2);
    const end = Math.min(length, opening.offset + opening.width / 2);
    if (start > cursor + 1) out.push([pointOnWall(wall, cursor), pointOnWall(wall, start)]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < length - 1) out.push([pointOnWall(wall, cursor), pointOnWall(wall, length)]);
  if (!out.length && length > 0) out.push([wall.a, wall.b]);
  return out;
}

export function planSvg(doc: BlueprintDoc, floor: Floor): string {
  const points: Pt[] = [];
  floor.walls.forEach((wall) => points.push(wall.a, wall.b));
  floor.rooms.forEach((room) => points.push(...room.points));
  if (!points.length) points.push({ x: 0, y: 0 }, { x: 4200, y: 3600 });

  const minX = Math.min(...points.map((p) => p.x)) - 700;
  const maxX = Math.max(...points.map((p) => p.x)) + 700;
  const minY = Math.min(...points.map((p) => p.y)) - 700;
  const maxY = Math.max(...points.map((p) => p.y)) + 900;
  const w = maxX - minX;
  const h = maxY - minY;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" width="${w / 4}" height="${h / 4}">`);
  parts.push('<rect x="-100000" y="-100000" width="200000" height="200000" fill="#f1f0ec"/>');

  for (const room of floor.rooms) {
    const c = polygonCentroid(room.points);
    const area = Math.abs(polygonArea(room.points)) / 1_000_000;
    parts.push(`<polygon points="${room.points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="#111111" fill-opacity="0.04" stroke="none"/>`);
    parts.push(`<text x="${c.x}" y="${c.y - 80}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="180" font-weight="bold" fill="#111111">${escapeXml(room.name)}</text>`);
    parts.push(`<text x="${c.x}" y="${c.y + 160}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="130" fill="#555555">${area.toFixed(2)} m²</text>`);
  }

  for (const wall of floor.walls) {
    for (const [a, b] of segmentsForWall(floor, wall)) {
      parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#111111" stroke-width="${wall.thickness}" stroke-linecap="butt"/>`);
    }
  }

  for (const opening of floor.openings) {
    const span = openingSpan(floor, opening);
    if (!span) continue;
    const { wall, start, end } = span;
    const angle = wallAngle(wall);
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
    if (opening.kind === 'door') {
      const hinge = opening.swing === 1 ? start : end;
      const leaf = { x: hinge.x + normal.x * opening.width, y: hinge.y + normal.y * opening.width };
      parts.push(`<line x1="${hinge.x}" y1="${hinge.y}" x2="${leaf.x}" y2="${leaf.y}" stroke="#555555" stroke-width="25"/>`);
      parts.push(`<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#111111" stroke-width="15" stroke-dasharray="40 40" opacity="0.5"/>`);
    } else {
      for (const side of [-1, 1]) {
        parts.push(`<line x1="${start.x + normal.x * (wall.thickness / 2) * side}" y1="${start.y + normal.y * (wall.thickness / 2) * side}" x2="${end.x + normal.x * (wall.thickness / 2) * side}" y2="${end.y + normal.y * (wall.thickness / 2) * side}" stroke="#555555" stroke-width="25"/>`);
      }
    }
  }

  for (const item of floor.furniture) {
    parts.push(`<g transform="translate(${item.x} ${item.y}) rotate(${item.rotation})">`);
    parts.push(`<rect x="${-item.w / 2}" y="${-item.d / 2}" width="${item.w}" height="${item.d}" fill="#ffffff" fill-opacity="0.9" stroke="#111111" stroke-width="18" rx="40"/>`);
    parts.push(`<text x="0" y="${item.d / 2 + 130}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="110" fill="#555555">${escapeXml(item.name)}</text>`);
    parts.push('</g>');
  }

  for (const wall of floor.walls) {
    const length = wallLength(wall);
    const mid = { x: (wall.a.x + wall.b.x) / 2, y: (wall.a.y + wall.b.y) / 2 };
    parts.push(`<text x="${mid.x}" y="${mid.y - 180}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="120" fill="#777777">${Math.round(length)} mm</text>`);
  }

  const est = estimate(floor, doc.wallHeight);
  parts.push(`<text x="${minX + 120}" y="${maxY - 220}" font-family="Helvetica,Arial,sans-serif" font-size="150" font-weight="bold" fill="#111111">${escapeXml(doc.name)} · ${escapeXml(floor.name)}</text>`);
  parts.push(`<text x="${minX + 120}" y="${maxY - 80}" font-family="Helvetica,Arial,sans-serif" font-size="115" fill="#555555">${est.floorArea.toFixed(2)} m² · ${floor.rooms.length} rooms · ${floor.openings.length} openings · wall ${doc.wallHeight} mm</text>`);
  parts.push(`<text x="${maxX - 120}" y="${maxY - 80}" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="105" fill="#888888">All dimensions in millimetres · ${new Date().toLocaleDateString('en-GB')}</text>`);
  parts.push('</svg>');
  return parts.join('\n');
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function materialCsv(doc: BlueprintDoc, floor: Floor): string {
  const e = estimate(floor, doc.wallHeight);
  const t = totalEstimate(doc);
  const rows: string[][] = [
    ['Kotha Studio — material schedule'],
    ['Project', doc.name],
    ['Floor', floor.name],
    ['Wall height (mm)', String(doc.wallHeight)],
    ['Estimate — not a quote'],
    [],
    ['Item', 'Unit', 'This floor', 'Whole building'],
    ['Floor area', 'm2', e.floorArea.toFixed(2), t.floorArea.toFixed(2)],
    ['Wall length', 'm', e.wallLength.toFixed(2), t.wallLength.toFixed(2)],
    ['Cement', 'bags', String(e.cementBags), String(t.cementBags)],
    ['Sand', 'm3', String(e.sand), String(t.sand)],
    ['Aggregate', 'm3', String(e.aggregate), String(t.aggregate)],
    ['Steel', 'kg', String(e.steel), String(t.steel)],
    ['Bricks', 'count', String(e.bricks), String(t.bricks)],
    ['Paint', 'litres', String(e.paint), String(t.paint)],
    ['Primer', 'litres', String(e.primer), String(t.primer)],
    ['Plywood', 'sheets', String(e.plywoodSheets), String(t.plywoodSheets)],
    ['Doors', 'count', String(e.doors), String(t.doors)],
    ['Windows', 'count', String(e.windows), String(t.windows)],
    ['Electrical points', 'count', String(e.electrical), String(t.electrical)],
    ['Plumbing points', 'count', String(e.plumbing), String(t.plumbing)],
    [],
    ['Furniture schedule'],
    ['Piece', 'Category', 'Width mm', 'Depth mm', 'Height mm', 'X mm', 'Y mm', 'Rotation deg', 'Room'],
  ];
  for (const item of floor.furniture) {
    const room = floor.rooms.find((entry) => pointInPolygon({ x: item.x, y: item.y }, entry.points));
    rows.push([
      item.name,
      item.category,
      String(item.w),
      String(item.d),
      String(item.h),
      String(Math.round(item.x)),
      String(Math.round(item.y)),
      String(item.rotation),
      room?.name ?? '—',
    ]);
  }
  return rows
    .map((row) => row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','))
    .join('\n');
}

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function printPlan(doc: BlueprintDoc, floor: Floor) {
  const svg = planSvg(doc, floor);
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${escapeXml(doc.name)} — ${escapeXml(floor.name)}</title>
    <style>body{margin:0;background:#fff}svg{width:100%;height:auto;display:block}@page{margin:12mm}</style>
    </head><body>${svg}<script>window.onload=()=>{window.print()}<\/script></body></html>`);
  win.document.close();
}

export const summaryRows = (doc: BlueprintDoc, floor: Floor) => {
  const e = estimate(floor, doc.wallHeight);
  return [
    ['Floor area', `${e.floorArea.toFixed(2)} m²`],
    ['Wall length', `${e.wallLength.toFixed(1)} m`],
    ['Cement', `${e.cementBags} bags`],
    ['Sand', `${e.sand} m³`],
    ['Aggregate', `${e.aggregate} m³`],
    ['Steel', `${e.steel} kg`],
    ['Bricks', `${e.bricks}`],
    ['Paint', `${e.paint} L`],
    ['Primer', `${e.primer} L`],
    ['Plywood', `${e.plywoodSheets} sheets`],
    ['Doors', `${e.doors}`],
    ['Windows', `${e.windows}`],
    ['Electrical', `${e.electrical} points`],
    ['Plumbing', `${e.plumbing} points`],
    ['Furniture', `${e.pieces} pieces`],
  ];
};

export const dimensionText = (value: number) => mm(value);
