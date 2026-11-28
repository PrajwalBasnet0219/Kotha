import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useDb } from '../lib/store';
import { useBlueprint } from '../blueprint/useBlueprint';
import { PlanCanvas, type Selection } from '../components/blueprint/PlanCanvas';
import { Scene3D } from '../components/blueprint/Scene3D';
import {
  FLOOR_SWATCHES,
  MIN_WALL,
  WALL_SWATCHES,
  estimate,
  m2,
  mm,
  polygonArea,
  polygonPerimeter,
  validateFurniture,
  validateOpening,
  wallLength,
} from '../blueprint/geometry';
import { download, materialCsv, planSvg, printPlan, summaryRows } from '../blueprint/exporters';
import type { FurnitureItem, Opening, Room, Tool, Wall } from '../blueprint/types';
import '../styles/blueprint.css';

const TOOLS: Array<{ id: Tool; label: string; key: string; group: string; icon: string }> = [
  { id: 'select', label: 'Select', key: 'V', group: 'Navigate', icon: 'M5 3l14 9-6 1-3 6z' },
  { id: 'wall', label: 'Wall', key: 'W', group: 'Draw', icon: 'M3 20h18M4 20L20 4' },
  { id: 'room', label: 'Room', key: 'R', group: 'Draw', icon: 'M4 5h16v14H4z' },
  { id: 'stair', label: 'Stair', key: 'T', group: 'Draw', icon: 'M4 19h4v-4h4v-4h4V7h4' },
  { id: 'door', label: 'Door', key: 'D', group: 'Openings', icon: 'M5 20V5h9v15M14 12h6' },
  { id: 'window', label: 'Window', key: 'N', group: 'Openings', icon: 'M4 6h16v12H4zM12 6v12' },
  { id: 'furniture', label: 'Furniture', key: 'F', group: 'Place', icon: 'M6 10V5h12v5M5 10h14v6H5zM7 16v3M17 16v3' },
  { id: 'dimension', label: 'Dimension', key: 'M', group: 'Annotate', icon: 'M4 12h16M4 8v8M20 8v8' },
];

type StatusTone = 'ok' | 'error' | 'info';

const LAYERS = [
  ['grid', 'Grid'],
  ['walls', 'Walls'],
  ['openings', 'Openings'],
  ['rooms', 'Rooms'],
  ['furniture', 'Furniture'],
  ['dimensions', 'Dimensions'],
  ['clearances', 'Door clearances'],
] as const;

export function Blueprint() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const db = useDb();
  const project = db.projects.find((entry) => entry.id === projectId) ?? null;

  const {
    doc,
    floor,
    activeFloorId,
    setActiveFloorId,
    updateFloor,
    undo,
    redo,
    canUndo,
    canRedo,
    setWallHeight,
    renameProject,
    addFloor,
    deleteFloor,
    renameFloor,
    moveFloor,
    clearFloor,
    resetAll,
  } = useBlueprint(projectId ?? 'unknown', project?.name ?? 'Untitled plan');

  const [tool, setTool] = useState<Tool>('select');
  const [selected, setSelected] = useState<Selection>(null);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [autoRotate, setAutoRotate] = useState(false);
  const [orbitCommand, setOrbitCommand] = useState<{ id: number; delta: number } | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const orbit = (delta: number) =>
    setOrbitCommand((current) => ({ id: (current?.id ?? 0) + 1, delta }));
  const [stackFloors, setStackFloors] = useState(true);
  const [status, setStatus] = useState<{ message: string; tone: StatusTone; id: number } | null>(null);
  const [layers, setLayers] = useState({
    grid: true,
    walls: true,
    openings: true,
    rooms: true,
    furniture: true,
    dimensions: false,
    clearances: true,
  });
  const [layersOpen, setLayersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [background, setBackground] = useState<{ src: string; width: number; height: number } | null>(null);
  const [calibration, setCalibration] = useState<{ active: boolean; points: Array<{ x: number; y: number }>; real: string }>({
    active: false,
    points: [],
    real: '',
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (message: string, tone: StatusTone = 'info') => {
    setStatus({ message, tone, id: Date.now() });
  };

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 4200);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    setSelected(null);
    setHighlight([]);
    setCalibration({ active: false, points: [], real: '' });
  }, [activeFloorId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if (key === 'escape') {
        setSelected(null);
        setTool('select');
        return;
      }
      const match = TOOLS.find((entry) => entry.key.toLowerCase() === key);
      if (match) {
        if (match.id === 'dimension') {
          setLayers((current) => ({ ...current, dimensions: !current.dimensions }));
        } else {
          setTool(match.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const products = useMemo(
    () =>
      db.products.filter(
        (product) =>
          product.state === 'published' &&
          (!productQuery.trim() ||
            product.name.toLowerCase().includes(productQuery.toLowerCase()) ||
            product.category.toLowerCase().includes(productQuery.toLowerCase())),
      ),
    [db.products, productQuery],
  );
  const activeProduct = products.find((product) => product.id === activeProductId) ?? null;

  const selectedWall = selected?.kind === 'wall' ? floor.walls.find((w) => w.id === selected.id) ?? null : null;
  const selectedOpening = selected?.kind === 'opening' ? floor.openings.find((o) => o.id === selected.id) ?? null : null;
  const selectedRoom = selected?.kind === 'room' ? floor.rooms.find((r) => r.id === selected.id) ?? null : null;
  const selectedItem = selected?.kind === 'furniture' ? floor.furniture.find((f) => f.id === selected.id) ?? null : null;

  const est = estimate(floor, doc.wallHeight);
  const rows = summaryRows(doc, floor);

  const deleteSelected = () => {
    // A marquee can hold several objects; delete all of them in one step.
    if (highlight.length > 1) {
      const ids = new Set(highlight);
      updateFloor((current) => ({
        ...current,
        walls: current.walls.filter((wall) => !ids.has(wall.id)),
        openings: current.openings.filter(
          (opening) => !ids.has(opening.id) && !ids.has(opening.wallId),
        ),
        furniture: current.furniture.filter((item) => !ids.has(item.id)),
        rooms: current.rooms.filter((room) => !ids.has(room.id)),
      }));
      notify(`${ids.size} objects removed.`, 'ok');
      setHighlight([]);
      setSelected(null);
      return;
    }
    if (!selected) return;
    if (selected.kind === 'wall') {
      updateFloor((current) => ({
        ...current,
        walls: current.walls.filter((w) => w.id !== selected.id),
        openings: current.openings.filter((o) => o.wallId !== selected.id),
      }));
      notify('Wall removed.', 'ok');
    } else if (selected.kind === 'opening') {
      updateFloor((current) => ({ ...current, openings: current.openings.filter((o) => o.id !== selected.id) }));
      notify('Opening removed.', 'ok');
    } else if (selected.kind === 'furniture') {
      updateFloor((current) => ({ ...current, furniture: current.furniture.filter((f) => f.id !== selected.id) }));
      notify('Furniture removed.', 'ok');
    } else if (selected.kind === 'room') {
      updateFloor((current) => ({ ...current, rooms: current.rooms.filter((r) => r.id !== selected.id) }));
      notify('Room label removed. Its walls remain.', 'ok');
    }
    setSelected(null);
  };

  const patchOpening = (opening: Opening, patch: Partial<Opening>) => {
    const next = { ...opening, ...patch };
    const check = validateOpening(floor, opening.wallId, next.offset, next.width, opening.id);
    if (!check.ok) {
      notify(check.reason, 'error');
      return;
    }
    if (next.sill < 0 || next.sill + next.height > doc.wallHeight) {
      notify('The opening must fit inside the wall height.', 'error');
      return;
    }
    updateFloor((current) => ({
      ...current,
      openings: current.openings.map((entry) => (entry.id === opening.id ? next : entry)),
    }));
  };

  const patchItem = (item: FurnitureItem, patch: Partial<FurnitureItem>) => {
    const next = { ...item, ...patch };
    const check = validateFurniture(floor, next, item.id);
    if (!check.ok) {
      notify(check.reason, 'error');
      return;
    }
    updateFloor((current) => ({
      ...current,
      furniture: current.furniture.map((entry) => (entry.id === item.id ? next : entry)),
    }));
  };

  const rotateItem = (item: FurnitureItem, delta: number) => {
    const rotation = (item.rotation + delta + 360) % 360;
    patchItem(item, { rotation });
  };

  const applyWallThickness = (value: number) => {
    if (value < 60 || value > 400) {
      notify('Wall thickness must stay between 60 and 400 mm.', 'error');
      return;
    }
    updateFloor((current) => ({ ...current, walls: current.walls.map((wall) => ({ ...wall, thickness: value })) }));
    notify(`All walls set to ${value} mm.`, 'ok');
  };

  const trimWall = (wall: Wall, insetStart: number, insetEnd: number) => {
    const length = wallLength(wall);
    if (insetStart < 0 || insetEnd < 0) {
      notify('Insets cannot be negative.', 'error');
      return;
    }
    if (length - insetStart - insetEnd < MIN_WALL) {
      notify(`A wall must keep at least ${MIN_WALL} mm between its ends.`, 'error');
      return;
    }
    const dir = { x: (wall.b.x - wall.a.x) / length, y: (wall.b.y - wall.a.y) / length };
    const a = { x: wall.a.x + dir.x * insetStart, y: wall.a.y + dir.y * insetStart };
    const b = { x: wall.b.x - dir.x * insetEnd, y: wall.b.y - dir.y * insetEnd };
    const nextLength = length - insetStart - insetEnd;
    const dropped = floor.openings.filter(
      (opening) =>
        opening.wallId === wall.id &&
        (opening.offset - opening.width / 2 < 100 || opening.offset + opening.width / 2 > nextLength - 100),
    );
    updateFloor((current) => ({
      ...current,
      walls: current.walls.map((entry) => (entry.id === wall.id ? { ...entry, a, b } : entry)),
      openings: current.openings.filter((opening) => !dropped.some((entry) => entry.id === opening.id)),
    }));
    notify(
      dropped.length
        ? `Wall trimmed; ${dropped.length} opening${dropped.length === 1 ? '' : 's'} no longer fit and were removed.`
        : 'Wall trimmed. Corners that meet stay joined.',
      'ok',
    );
  };

  const moveFurniture3D = (id: string, x: number, y: number) => {
    const item = floor.furniture.find((entry) => entry.id === id);
    if (!item) return;
    const next = { ...item, x, y };
    const check = validateFurniture(floor, next, item.id);
    if (!check.ok) {
      notify(check.reason, 'error');
      return;
    }
    updateFloor((current) => ({
      ...current,
      furniture: current.furniture.map((entry) => (entry.id === id ? next : entry)),
    }));
    notify(`${item.name} moved in 3D.`, 'ok');
  };

  const moveOpening3D = (id: string, offset: number) => {
    const opening = floor.openings.find((entry) => entry.id === id);
    if (!opening) return;
    const check = validateOpening(floor, opening.wallId, offset, opening.width, opening.id);
    if (!check.ok) {
      notify(check.reason, 'error');
      return;
    }
    updateFloor((current) => ({
      ...current,
      openings: current.openings.map((entry) => (entry.id === id ? { ...entry, offset } : entry)),
    }));
    notify(`${opening.kind === 'door' ? 'Door' : 'Window'} slid to ${Math.round(offset)} mm.`, 'ok');
  };

  const uploadPlan = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const width = 8000;
        const height = (image.naturalHeight / image.naturalWidth) * width;
        setBackground({ src, width, height });
        setCalibration({ active: true, points: [], real: '' });
        notify('Plan photo dropped. Pick two points to calibrate the real distance.', 'info');
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  };

  const onCalibrationPick = (point: { x: number; y: number }) => {
    setCalibration((current) => {
      const points = current.points.length >= 2 ? [point] : [...current.points, point];
      return { ...current, points };
    });
  };

  const applyCalibration = () => {
    if (calibration.points.length !== 2 || !background) return;
    const real = Number(calibration.real);
    if (!real || real <= 0) {
      notify('Enter the real distance between the two points.', 'error');
      return;
    }
    const measured = Math.hypot(
      calibration.points[0].x - calibration.points[1].x,
      calibration.points[0].y - calibration.points[1].y,
    );
    if (measured < 1) {
      notify('Pick two points further apart.', 'error');
      return;
    }
    const factor = real / measured;
    setBackground({ ...background, width: background.width * factor, height: background.height * factor });
    setCalibration({ active: false, points: [], real: '' });
    notify(`Scale set: ${Math.round(real)} mm across ${Math.round(measured)} mm on the sheet.`, 'ok');
  };

  const resetCalibration = () => {
    setCalibration({ active: false, points: [], real: '' });
    setBackground(null);
  };

  const projectFloorName = floor.name;

  if (!project) {
    return (
      <div className="bp-shell bp-shell--missing">
        <div className="empty">
          <p className="empty__title">That plan is not on the board.</p>
          <p className="empty__lede">Open the studio and choose a plan, or create a new one.</p>
          <Link className="btn btn--solid" to="/studio">
            Back to the studio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bp-shell">
      <header className="bp-top">
        <div className="bp-top__left">
          <Link to="/studio" className="bp-back mono" aria-label="Back to the studio">
            ← Studio
          </Link>
          <div>
            <input
              className="bp-title"
              value={doc.name}
              onChange={(event) => renameProject(event.target.value)}
              aria-label="Plan name"
            />
            <p className="mono bp-sub">
              {projectFloorName} · {doc.floors.length} floor{doc.floors.length === 1 ? '' : 's'} ·{' '}
              {est.floorArea.toFixed(2)} m² · saved locally
            </p>
          </div>
        </div>

        <div className="bp-top__actions">
          <div className="bp-seg" role="group" aria-label="View">
            <button type="button" className={viewMode === '2d' ? 'is-active' : ''} onClick={() => setViewMode('2d')}>
              Plan
            </button>
            <button type="button" className={viewMode === '3d' ? 'is-active' : ''} onClick={() => setViewMode('3d')}>
              3D room
            </button>
          </div>

          <button type="button" className="bp-btn mono" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            Undo
          </button>
          <button type="button" className="bp-btn mono" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            Redo
          </button>

          <div className="bp-menu">
            <button type="button" className="bp-btn mono" onClick={() => setLayersOpen((v) => !v)}>
              Layers
            </button>
            {layersOpen ? (
              <div className="bp-menu__panel">
                {LAYERS.map(([key, label]) => (
                  <label key={key} className="check">
                    <input
                      type="checkbox"
                      checked={layers[key]}
                      onChange={(event) => setLayers((current) => ({ ...current, [key]: event.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="bp-btn bp-btn--solid mono"
            onClick={() => printPlan(doc, floor)}
          >
            Print / PDF
          </button>

          <div className="bp-menu">
            <button type="button" className="bp-btn mono" onClick={() => setExportOpen((v) => !v)}>
              Export
            </button>
            {exportOpen ? (
              <div className="bp-menu__panel bp-menu__panel--right">
                <button
                  type="button"
                  onClick={() => {
                    download(`${doc.name}-${floor.name}.svg`, planSvg(doc, floor), 'image/svg+xml');
                    setExportOpen(false);
                  }}
                >
                  SVG plan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    download(`${doc.name}-materials.csv`, materialCsv(doc, floor), 'text/csv');
                    setExportOpen(false);
                  }}
                >
                  Material schedule CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    download(`${doc.name}.json`, JSON.stringify(doc, null, 2), 'application/json');
                    setExportOpen(false);
                  }}
                >
                  JSON snapshot
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="bp-body">
        <aside className="bp-rail">
          <p className="mono bp-rail__title">Tools</p>
          <div className="bp-tools">
            {TOOLS.map((entry, index) => (
              <Fragment key={entry.id}>
                {index === 0 || TOOLS[index - 1].group !== entry.group ? (
                  <p className="bp-tools__group mono">{entry.group}</p>
                ) : null}
                <button
                  type="button"
                  className={`bp-tool ${tool === entry.id || (entry.id === 'dimension' && layers.dimensions) ? 'is-active' : ''}`}
                  onClick={() => {
                    if (entry.id === 'dimension') {
                      setLayers((current) => ({ ...current, dimensions: !current.dimensions }));
                    } else {
                      setTool(entry.id);
                    }
                  }}
                  title={`${entry.label} (${entry.key})`}
                >
                  <svg className="bp-tool__glyph" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={entry.icon} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="bp-tool__label">{entry.label}</span>
                  <span className="bp-tool__key mono">{entry.key}</span>
                </button>
              </Fragment>
            ))}
          </div>

          <div className="bp-rail__block">
            <div className="bp-rail__head">
              <p className="mono bp-rail__title">Floors</p>
              <div className="bp-rail__head-actions">
                <button type="button" className="bp-mini" onClick={() => addFloor(false)} title="Add an empty floor">
                  + Empty
                </button>
                <button type="button" className="bp-mini" onClick={() => addFloor(true)} title="Duplicate this floor">
                  Duplicate
                </button>
              </div>
            </div>
            <ul className="bp-floors">
              {doc.floors.map((entry) => (
                <li key={entry.id} className={entry.id === activeFloorId ? 'is-active' : ''}>
                  <button type="button" className="bp-floor__name" onClick={() => setActiveFloorId(entry.id)}>
                    <span>{entry.name}</span>
                    <span className="mono">
                      {entry.rooms.length} rm · {(entry.furniture.length + entry.openings.length)} items
                    </span>
                  </button>
                  <div className="bp-floor__controls">
                    <button type="button" className="bp-mini" onClick={() => moveFloor(entry.id, -1)} aria-label="Move floor up">
                      ↑
                    </button>
                    <button type="button" className="bp-mini" onClick={() => moveFloor(entry.id, 1)} aria-label="Move floor down">
                      ↓
                    </button>
                    <button
                      type="button"
                      className="bp-mini"
                      onClick={() => deleteFloor(entry.id)}
                      disabled={doc.floors.length === 1}
                      aria-label="Delete floor"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bp-rail__block bp-rail__block--grow">
            <p className="mono bp-rail__title">Reference catalogue</p>
            <input
              className="bp-search"
              type="search"
              placeholder="Sofa, table, plant…"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
            />
            <ul className="bp-catalogue">
              {products.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    className={`bp-product ${activeProductId === product.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveProductId(product.id);
                      setTool('furniture');
                      notify(`${product.name} selected — click inside a room to place it.`, 'info');
                    }}
                  >
                    <span className="bp-product__name">{product.name}</span>
                    <span className="mono bp-product__meta">
                      {product.w} × {product.d} × {product.h} mm
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="bp-note mono">Reference only. The studio sells the plan, not the furniture.</p>
          </div>
        </aside>

        <main className="bp-stage">
          <div className="bp-stage__bar">
            <span className="bp-mode mono">
              {TOOLS.find((entry) => entry.id === tool)?.label ?? 'Select'}
            </span>
            <span className="bp-stage__hint mono">
              {tool === 'select'
                ? 'Select · click an object, drag to move it, or drag empty space to highlight an area'
                : tool === 'wall'
                  ? 'Wall · click points · click the first point to close a room'
                  : tool === 'room' || tool === 'stair'
                    ? 'Room · drag a rectangle on the sheet'
                    : tool === 'door' || tool === 'window'
                      ? `${tool === 'door' ? 'Door' : 'Window'} · click a wall to place it`
                      : tool === 'furniture'
                        ? activeProduct
                          ? `${activeProduct.name} · click inside a room`
                          : 'Choose a piece in the catalogue'
                        : 'Dimension · toggle wall dimensions'}
            </span>
            {calibration.active ? (
              <span className="bp-calib mono">
                Calibrate · click two points ({calibration.points.length}/2)
              </span>
            ) : null}
            <details className="bp-help">
              <summary className="mono" aria-label="Keyboard shortcuts">?</summary>
              <div className="bp-help__panel">
                <p className="mono">Shortcuts</p>
                <ul>
                  <li><kbd>V</kbd> Select · drag objects, marquee an area</li>
                  <li><kbd>W</kbd> Wall · click points, close on the first</li>
                  <li><kbd>R</kbd> Room · drag a rectangle</li>
                  <li><kbd>T</kbd> Stair · drag a stair void</li>
                  <li><kbd>D</kbd> / <kbd>N</kbd> Door / window</li>
                  <li><kbd>F</kbd> Furniture · place from catalogue</li>
                  <li><kbd>M</kbd> Dimensions on / off</li>
                  <li><kbd>Space</kbd> + drag to pan · wheel to zoom</li>
                  <li><kbd>Ctrl</kbd> <kbd>Z</kbd> Undo · <kbd>Del</kbd> Delete</li>
                </ul>
              </div>
            </details>
          </div>

          {viewMode === '2d' ? (
            <PlanCanvas
              floor={floor}
              tool={tool}
              selected={selected}
              layers={layers}
              activeProduct={activeProduct}
              background={background}
              calibrationPoints={calibration.points}
              calibrationActive={calibration.active}
              highlight={highlight}
              onSelect={setSelected}
              onHighlight={setHighlight}
              onChange={updateFloor}
              onStatus={notify}
              onCalibrationPick={onCalibrationPick}
              onRequestTool={setTool}
            />
          ) : (
            <div className="bp-scene">
              {floor.rooms.length === 0 ? (
                <div className="bp-scene__empty">
                  <p className="mono">3D preview locked</p>
                  <h2>This floor has no closed room yet.</h2>
                  <p>
                    The 3D room is built from closed room boundaries. Draw walls with the Wall tool
                    and click the first point to close the loop, or drag a Room rectangle. Once a
                    room closes, its walls, floor and openings appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bp-scene__orbit" role="group" aria-label="3D camera">
                    <button
                      type="button"
                      className="bp-scene__orbit-btn mono"
                      onClick={() => orbit(-30)}
                      title="Turn 30° left"
                    >
                      ↺
                    </button>
                    <button
                      type="button"
                      className={`bp-scene__orbit-btn mono ${autoRotate ? 'is-active' : ''}`}
                      onClick={() => setAutoRotate((value) => !value)}
                      title="Slowly spin the whole room"
                      aria-pressed={autoRotate}
                    >
                      {autoRotate ? 'Stop spin' : 'Auto spin'}
                    </button>
                    <button
                      type="button"
                      className="bp-scene__orbit-btn mono"
                      onClick={() => orbit(30)}
                      title="Turn 30° right"
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      className="bp-scene__orbit-btn mono"
                      onClick={() => {
                        setAutoRotate(false);
                        setResetKey((value) => value + 1);
                      }}
                      title="Return to the opening view"
                    >
                      Reset view
                    </button>
                  </div>
                  {doc.floors.length > 1 ? (
                    <label className="bp-scene__toggle mono">
                      <input
                        type="checkbox"
                        checked={stackFloors}
                        onChange={(event) => setStackFloors(event.target.checked)}
                      />
                      <span>Stack all {doc.floors.length} floors</span>
                    </label>
                  ) : null}
                  <Scene3D
                    floor={floor}
                    floors={doc.floors}
                    stacked={stackFloors}
                    wallHeight={doc.wallHeight}
                    selectedId={selected?.id ?? null}
                    onSelect={(kind, id) => setSelected({ kind, id })}
                    onMoveFurniture={moveFurniture3D}
                    onMoveOpening={moveOpening3D}
                    autoRotate={autoRotate}
                    orbitCommand={orbitCommand}
                    resetKey={resetKey}
                  />
                  <p className="bp-scene__hint mono">
                    Orbit: drag · Zoom: wheel · Move furniture: drag · Select a door handle to edit it in the panel
                  </p>
                </>
              )}
            </div>
          )}
        </main>

        <aside className="bp-side">
          <section className="bp-summary" aria-label="Material estimate">
            <div className="bp-summary__head">
              <p className="mono">Material estimate</p>
              <span className="bp-summary__badge mono">not a quote</span>
            </div>
            <p className="bp-summary__floor">{floor.name}</p>
            <ul className="bp-summary__list">
              {rows.map(([label, value]) => (
                <li key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </li>
              ))}
            </ul>
            <p className="bp-summary__total mono">
              {doc.floors.length} floor{doc.floors.length === 1 ? '' : 's'} ·{' '}
              {doc.floors.reduce((sum, entry) => sum + estimate(entry, doc.wallHeight).floorArea, 0).toFixed(2)} m² total
            </p>
          </section>

          <section className="bp-inspector">
            <div className="bp-inspector__head">
              <p className="mono">{selected ? 'Selection' : 'Project'}</p>
              {selected ? (
                <button type="button" className="bp-mini" onClick={() => setSelected(null)}>
                  Close
                </button>
              ) : null}
            </div>

            {selectedWall ? (
              <WallInspector wall={selectedWall} onThickness={(value) => {
                if (value < 60 || value > 400) return notify('Wall thickness must stay between 60 and 400 mm.', 'error');
                updateFloor((current) => ({
                  ...current,
                  walls: current.walls.map((wall) => (wall.id === selectedWall.id ? { ...wall, thickness: value } : wall)),
                }));
              }} onAll={applyWallThickness} onTrim={(start, end) => trimWall(selectedWall, start, end)} onDelete={deleteSelected} />
            ) : selectedOpening ? (
              <OpeningInspector opening={selectedOpening} onPatch={(patch) => patchOpening(selectedOpening, patch)} onDelete={deleteSelected} />
            ) : selectedItem ? (
              <FurnitureInspector item={selectedItem} onPatch={(patch) => patchItem(selectedItem, patch)} onRotate={(delta) => rotateItem(selectedItem, delta)} onDelete={deleteSelected} />
            ) : selectedRoom ? (
              <RoomInspector room={selectedRoom} onRename={(name) => updateFloor((current) => ({ ...current, rooms: current.rooms.map((room) => (room.id === selectedRoom.id ? { ...room, name } : room)) }))} onDelete={deleteSelected} />
            ) : (
              <div className="bp-form">
                <label className="bp-field">
                  <span className="mono">Floor name</span>
                  <input value={floor.name} onChange={(event) => renameFloor(floor.id, event.target.value)} />
                </label>
                <label className="bp-field">
                  <span className="mono">Wall height · mm</span>
                  <input
                    type="number"
                    step={100}
                    value={doc.wallHeight}
                    onChange={(event) => setWallHeight(Math.max(1800, Math.min(4500, Number(event.target.value))))}
                  />
                </label>
                <label className="bp-field">
                  <span className="mono">Apply wall thickness · mm</span>
                  <input type="number" step={10} defaultValue={floor.walls[0]?.thickness ?? 120} onBlur={(event) => applyWallThickness(Number(event.target.value))} />
                </label>

                <div className="bp-form__block">
                  <p className="mono bp-form__label">Trace a photo</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadPlan(file);
                      event.target.value = '';
                    }}
                  />
                  <button type="button" className="bp-btn bp-btn--wide" onClick={() => fileRef.current?.click()}>
                    Upload plan photo
                  </button>
                  {background ? (
                    <>
                      <button
                        type="button"
                        className="bp-btn bp-btn--wide"
                        onClick={() => setCalibration({ active: true, points: [], real: '' })}
                      >
                        {calibration.active ? `Pick points (${calibration.points.length}/2)` : 'Recalibrate scale'}
                      </button>
                      {calibration.points.length === 2 ? (
                        <div className="bp-calib__apply">
                          <input
                            type="number"
                            placeholder="Real mm"
                            value={calibration.real}
                            onChange={(event) => setCalibration((current) => ({ ...current, real: event.target.value }))}
                          />
                          <button type="button" className="bp-btn bp-btn--solid" onClick={applyCalibration}>
                            Apply
                          </button>
                        </div>
                      ) : null}
                      <button type="button" className="bp-mini" onClick={resetCalibration}>
                        Remove photo
                      </button>
                    </>
                  ) : null}
                </div>

                <div className="bp-form__block">
                  <p className="mono bp-form__label">Finishes</p>
                  <ColorChoice
                    label="Wall colour"
                    value={floor.wallColor ?? '#e8e4da'}
                    swatches={WALL_SWATCHES}
                    onChange={(wallColor) => updateFloor((current) => ({ ...current, wallColor }))}
                  />
                  <ColorChoice
                    label="Floor colour"
                    value={floor.floorColor ?? '#d9d4c9'}
                    swatches={FLOOR_SWATCHES}
                    onChange={(floorColor) => updateFloor((current) => ({ ...current, floorColor }))}
                  />
                  <p className="bp-note mono">
                    Applies to this floor in both the plan and the 3D preview.
                  </p>
                </div>

                <div className="bp-form__block">
                  <p className="mono bp-form__label">Floor data</p>
                  <button type="button" className="bp-btn bp-btn--wide" onClick={() => {
                    if (window.confirm('Clear walls, rooms, openings and furniture on this floor?')) clearFloor();
                  }}>
                    Clear this floor
                  </button>
                  <button type="button" className="bp-btn bp-btn--wide" onClick={() => {
                    if (window.confirm('Reset every floor and start from a starter room?')) resetAll();
                  }}>
                    Reset the plan
                  </button>
                </div>

                <p className="bp-note mono">
                  Signed in as {user?.name}. Floors, walls and placements are saved on this device.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>

      {status ? (
        <div className={`bp-toast bp-toast--${status.tone}`} role="status" key={status.id}>
          {status.message}
        </div>
      ) : null}
    </div>
  );
}

function ColorChoice({
  label,
  value,
  swatches,
  onChange,
}: {
  label: string;
  value: string;
  swatches: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="bp-colour">
      <span className="mono">{label}</span>
      <div className="bp-colour__row">
        {swatches.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={`bp-colour__chip ${value.toLowerCase() === swatch.toLowerCase() ? 'is-active' : ''}`}
            style={{ background: swatch }}
            title={swatch}
            aria-label={`${label} ${swatch}`}
            onClick={() => onChange(swatch)}
          />
        ))}
        <label className="bp-colour__custom" title="Choose a custom colour">
          <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
          <span aria-hidden="true">＋</span>
        </label>
      </div>
    </div>
  );
}

function WallInspector({
  wall,
  onThickness,
  onAll,
  onTrim,
  onDelete,
}: {
  wall: Wall;
  onThickness: (value: number) => void;
  onAll: (value: number) => void;
  onTrim: (insetStart: number, insetEnd: number) => void;
  onDelete: () => void;
}) {
  const [thickness, setThickness] = useState(wall.thickness);
  const [insetStart, setInsetStart] = useState(0);
  const [insetEnd, setInsetEnd] = useState(0);
  useEffect(() => {
    setThickness(wall.thickness);
    setInsetStart(0);
    setInsetEnd(0);
  }, [wall.id, wall.thickness]);
  return (
    <div className="bp-form">
      <p className="bp-form__value">{mm(wallLength(wall))}</p>
      <p className="mono bp-form__sub">Wall length · centre to centre</p>
      <label className="bp-field">
        <span className="mono">Thickness · mm</span>
        <input
          type="number"
          step={10}
          value={thickness}
          onChange={(event) => setThickness(Number(event.target.value))}
          onBlur={() => onThickness(thickness)}
        />
      </label>
      <button type="button" className="bp-btn bp-btn--wide" onClick={() => onAll(thickness)}>
        Apply to every wall
      </button>
      <div className="bp-form__block">
        <p className="mono bp-form__label">Trim ends</p>
        <div className="bp-form__row">
          <label className="bp-field">
            <span className="mono">Start · mm</span>
            <input
              type="number"
              step={50}
              min={0}
              value={insetStart}
              onChange={(event) => setInsetStart(Math.max(0, Number(event.target.value)))}
            />
          </label>
          <label className="bp-field">
            <span className="mono">End · mm</span>
            <input
              type="number"
              step={50}
              min={0}
              value={insetEnd}
              onChange={(event) => setInsetEnd(Math.max(0, Number(event.target.value)))}
            />
          </label>
        </div>
        <button type="button" className="bp-btn bp-btn--wide" onClick={() => onTrim(insetStart, insetEnd)}>
          Trim wall
        </button>
      </div>
      <button type="button" className="bp-btn bp-btn--wide bp-btn--danger" onClick={onDelete}>
        Remove wall
      </button>
    </div>
  );
}

function OpeningInspector({
  opening,
  onPatch,
  onDelete,
}: {
  opening: Opening;
  onPatch: (patch: Partial<Opening>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="bp-form">
      <p className="bp-form__value">{opening.kind === 'door' ? 'Door' : 'Window'}</p>
      <p className="mono bp-form__sub">
        {opening.width} × {opening.height} mm
      </p>
      <label className="bp-field">
        <span className="mono">Slide along wall · {Math.round(opening.offset)} mm</span>
        <input
          type="range"
          min={0}
          max={Math.max(100, opening.offset + 3000)}
          step={50}
          value={opening.offset}
          onChange={(event) => onPatch({ offset: Number(event.target.value) })}
        />
      </label>
      <div className="bp-form__row">
        <label className="bp-field">
          <span className="mono">Width</span>
          <input type="number" step={50} value={opening.width} onChange={(event) => onPatch({ width: Number(event.target.value) })} />
        </label>
        <label className="bp-field">
          <span className="mono">Height</span>
          <input type="number" step={50} value={opening.height} onChange={(event) => onPatch({ height: Number(event.target.value) })} />
        </label>
      </div>
      {opening.kind === 'window' ? (
        <label className="bp-field">
          <span className="mono">Sill height · mm</span>
          <input type="number" step={50} value={opening.sill} onChange={(event) => onPatch({ sill: Number(event.target.value) })} />
        </label>
      ) : (
        <button
          type="button"
          className="bp-btn bp-btn--wide"
          onClick={() => onPatch({ swing: opening.swing === 1 ? -1 : 1 })}
        >
          Flip swing · {opening.swing === 1 ? 'left' : 'right'}
        </button>
      )}
      <button type="button" className="bp-btn bp-btn--wide bp-btn--danger" onClick={onDelete}>
        Remove {opening.kind}
      </button>
    </div>
  );
}

function FurnitureInspector({
  item,
  onPatch,
  onRotate,
  onDelete,
}: {
  item: FurnitureItem;
  onPatch: (patch: Partial<FurnitureItem>) => void;
  onRotate: (delta: number) => void;
  onDelete: () => void;
}) {
  return (
    <div className="bp-form">
      <p className="bp-form__value">{item.name}</p>
      <p className="mono bp-form__sub">
        {item.w} × {item.d} × {item.h} mm · {item.category}
      </p>
      <div className="bp-form__row">
        <button type="button" className="bp-btn" onClick={() => onRotate(-15)}>
          ⟲ 15°
        </button>
        <button type="button" className="bp-btn" onClick={() => onRotate(15)}>
          15° ⟳
        </button>
      </div>
      <div className="bp-form__row">
        <label className="bp-field">
          <span className="mono">X · mm</span>
          <input type="number" step={50} value={Math.round(item.x)} onChange={(event) => onPatch({ x: Number(event.target.value) })} />
        </label>
        <label className="bp-field">
          <span className="mono">Y · mm</span>
          <input type="number" step={50} value={Math.round(item.y)} onChange={(event) => onPatch({ y: Number(event.target.value) })} />
        </label>
      </div>
      <label className="bp-field">
        <span className="mono">Rotation · {item.rotation}°</span>
        <input type="range" min={0} max={345} step={15} value={item.rotation} onChange={(event) => onPatch({ rotation: Number(event.target.value) })} />
      </label>
      <button type="button" className="bp-btn bp-btn--wide bp-btn--danger" onClick={onDelete}>
        Remove piece
      </button>
    </div>
  );
}

function RoomInspector({
  room,
  onRename,
  onDelete,
}: {
  room: Room;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="bp-form">
      <label className="bp-field">
        <span className="mono">Room name</span>
        <input value={room.name} onChange={(event) => onRename(event.target.value)} />
      </label>
      <p className="bp-form__value">{m2(Math.abs(polygonArea(room.points)) / 1_000_000)}</p>
      <p className="mono bp-form__sub">
        {room.kind === 'stair' ? 'Stair void' : 'Floor area'} · perimeter {(polygonPerimeter(room.points) / 1000).toFixed(2)} m
      </p>
      <button type="button" className="bp-btn bp-btn--wide bp-btn--danger" onClick={onDelete}>
        Remove room label
      </button>
    </div>
  );
}
