import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { gsap, reducedMotion } from '../../lib/motion';
import { openingSpan, projectOnWall, snap, validateOpening, wallAngle, wallLength } from '../../blueprint/geometry';
import type { Floor, FurnitureItem, Opening, Wall } from '../../blueprint/types';

type SceneProps = {
  floor: Floor;
  /** Every floor in the project; used to stack the building preview. */
  floors?: Floor[];
  stacked?: boolean;
  wallHeight: number;
  selectedId: string | null;
  onSelect: (kind: 'furniture' | 'opening', id: string) => void;
  onMoveFurniture: (id: string, x: number, y: number) => void;
  onMoveOpening: (id: string, offset: number) => void;
  /** Whole-room orbit: spin continuously, step by 30°, or return to the start view. */
  autoRotate?: boolean;
  orbitCommand?: { id: number; delta: number } | null;
  resetKey?: number;
};

const FURNITURE_COLOURS: Record<string, string> = {
  Seating: '#3c3c37',
  Tables: '#8a8172',
  Storage: '#6f685c',
  Lighting: '#a89f8e',
  Plant: '#4a5047',
  Textile: '#bdb6a6',
};

function wallSegments(floor: Floor, wall: Wall): Array<[number, number]> {
  const length = wallLength(wall);
  const openings = floor.openings
    .filter((opening) => opening.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);
  const segments: Array<[number, number]> = [];
  let cursor = 0;
  for (const opening of openings) {
    const start = Math.max(0, opening.offset - opening.width / 2);
    const end = Math.min(length, opening.offset + opening.width / 2);
    if (start > cursor + 1) segments.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < length - 1) segments.push([cursor, length]);
  if (!segments.length && length > 0) segments.push([0, length]);
  return segments;
}

function wallPoint(wall: Wall, offset: number) {
  const length = wallLength(wall) || 1;
  const dx = (wall.b.x - wall.a.x) / length;
  const dy = (wall.b.y - wall.a.y) / length;
  return { x: (wall.a.x + dx * offset) / 1000, z: (wall.a.y + dy * offset) / 1000 };
}

function WallMesh({
  wall,
  floor,
  height,
  colour = '#e8e4da',
}: {
  wall: Wall;
  floor: Floor;
  height: number;
  colour?: string;
}) {
  const angle = wallAngle(wall);
  return (
    <group>
      {wallSegments(floor, wall).map(([from, to], index) => {
        const a = wallPoint(wall, from);
        const b = wallPoint(wall, to);
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        if (length < 0.001) return null;
        const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
        return (
          <mesh
            key={`${wall.id}-${index}`}
            position={[mid.x, height / 2000, mid.z]}
            rotation={[0, -angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[length, height / 1000, wall.thickness / 1000]} />
            <meshStandardMaterial color={colour} roughness={0.96} />
          </mesh>
        );
      })}
    </group>
  );
}

function OpeningMesh({
  opening,
  floor,
  height,
  offset,
  colour = '#e8e4da',
}: {
  opening: Opening;
  floor: Floor;
  height: number;
  offset?: number;
  colour?: string;
}) {
  const span = openingSpan(floor, opening);
  if (!span) return null;
  const { wall } = span;
  const angle = wallAngle(wall);
  const center = wallPoint(wall, offset ?? opening.offset);
  const width = opening.width / 1000;
  const sill = opening.sill / 1000;
  const head = (opening.sill + opening.height) / 1000;
  const above = Math.max(0.05, height / 1000 - head);
  return (
    <group position={[center.x, 0, center.z]} rotation={[0, -angle, 0]}>
      {sill > 0.01 ? (
        <mesh position={[0, sill / 2, 0]} castShadow>
          <boxGeometry args={[width, sill, wall.thickness / 1000]} />
          <meshStandardMaterial color={colour} roughness={0.96} />
        </mesh>
      ) : null}
      {opening.kind === 'window' ? (
        <mesh position={[0, sill + (head - sill) / 2, 0]}>
          <boxGeometry args={[width, head - sill, 0.02]} />
          <meshStandardMaterial color="#cdd5d2" transparent opacity={0.32} roughness={0.05} />
        </mesh>
      ) : null}
      <mesh position={[0, head + above / 2, 0]} castShadow>
        <boxGeometry args={[width, above, wall.thickness / 1000]} />
        <meshStandardMaterial color={colour} roughness={0.96} />
      </mesh>
    </group>
  );
}

function StairMesh({ room, height }: { room: { points: Array<{ x: number; y: number }> }; height: number }) {
  const xs = room.points.map((p) => p.x / 1000);
  const ys = room.points.map((p) => p.y / 1000);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...ys);
  const z1 = Math.max(...ys);
  const horizontal = x1 - x0 >= z1 - z0;
  const length = horizontal ? x1 - x0 : z1 - z0;
  const width = horizontal ? z1 - z0 : x1 - x0;
  const steps = Math.max(6, Math.min(18, Math.round(length / 0.28)));
  const rise = height / 1000 / steps;
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => {
        const run = (length / steps) * (i + 1);
        const y = rise * (i + 1);
        return (
          <mesh
            key={i}
            position={[
              horizontal ? x0 + run / 2 : (x0 + x1) / 2,
              y / 2,
              horizontal ? (z0 + z1) / 2 : z0 + run / 2,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[horizontal ? run : width, y, horizontal ? width : run]} />
            <meshStandardMaterial color={i % 2 ? '#c4bdb0' : '#cfc8ba'} roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}

function RoomFloor({ floor, colour, height }: { floor: Floor; colour?: string; height: number }) {
  return (
    <group>
      {floor.rooms.map((room) => {
        const shape = new THREE.Shape();
        room.points.forEach((point, index) => {
          if (index === 0) shape.moveTo(point.x / 1000, point.y / 1000);
          else shape.lineTo(point.x / 1000, point.y / 1000);
        });
        shape.closePath();
        return (
          <group key={room.id}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <shapeGeometry args={[shape]} />
              <meshStandardMaterial
                color={room.kind === 'stair' ? '#b9b2a3' : (colour ?? '#d9d4c9')}
                roughness={0.97}
                side={THREE.DoubleSide}
              />
            </mesh>
            {room.kind === 'stair' ? <StairMesh room={room} height={height} /> : null}
          </group>
        );
      })}
    </group>
  );
}

function FurnitureMesh({
  item,
  selected,
  preview,
  onPointerDown,
}: {
  item: FurnitureItem;
  selected: boolean;
  preview: { x: number; y: number } | null;
  onPointerDown: (event: ThreeEvent<PointerEvent>, item: FurnitureItem) => void;
}) {
  const x = (preview?.x ?? item.x) / 1000;
  const z = (preview?.y ?? item.y) / 1000;
  const w = item.w / 1000;
  const d = item.d / 1000;
  const h = item.h / 1000;
  const colour = selected ? '#151513' : (FURNITURE_COLOURS[item.category] ?? '#6f685c');
  const category = item.category.toLowerCase();
  const material = (
    <meshStandardMaterial
      color={colour}
      roughness={0.9}
      emissive={selected ? new THREE.Color('#2a2a26') : undefined}
      emissiveIntensity={selected ? 0.4 : 0}
    />
  );

  let body: React.ReactNode;
  if (category.includes('seating')) {
    const back = Math.max(0.08, d * 0.18);
    const arm = Math.max(0.06, w * 0.12);
    body = (
      <>
        <mesh position={[0, h * 0.24, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h * 0.48, d]} />
          {material}
        </mesh>
        <mesh position={[0, h * 0.62, -d / 2 + back / 2]} castShadow>
          <boxGeometry args={[w, h * 0.68, back]} />
          {material}
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (w / 2 - arm / 2), h * 0.34, 0]} castShadow>
            <boxGeometry args={[arm, h * 0.62, d]} />
            {material}
          </mesh>
        ))}
      </>
    );
  } else if (category.includes('table')) {
    const leg = Math.max(0.05, Math.min(w, d) * 0.07);
    body = (
      <>
        <mesh position={[0, h - 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.08, d]} />
          {material}
        </mesh>
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], index) => (
          <mesh key={index} position={[sx * (w / 2 - leg), (h - 0.08) / 2, sz * (d / 2 - leg)]} castShadow>
            <boxGeometry args={[leg, h - 0.08, leg]} />
            {material}
          </mesh>
        ))}
      </>
    );
  } else if (category.includes('storage')) {
    body = (
      <>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          {material}
        </mesh>
        <mesh position={[0, h / 2, d / 2 + 0.004]}>
          <boxGeometry args={[w * 0.92, h * 0.9, 0.008]} />
          <meshStandardMaterial color={colour} roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0, h / 2, d / 2 + 0.01]}>
          <boxGeometry args={[0.01, h * 0.86, 0.006]} />
          <meshStandardMaterial color="#1c1c1a" roughness={0.6} />
        </mesh>
      </>
    );
  } else if (category.includes('light')) {
    const radius = Math.max(0.06, Math.min(w, d) / 2);
    body = (
      <>
        <mesh position={[0, h * 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.022, h * 0.7, 10]} />
          {material}
        </mesh>
        <mesh position={[0, h * 0.78, 0]} castShadow>
          <cylinderGeometry args={[radius, radius * 0.72, h * 0.28, 16]} />
          {material}
        </mesh>
      </>
    );
  } else if (category.includes('plant')) {
    const radius = Math.max(0.08, Math.min(w, d) / 2);
    body = (
      <>
        <mesh position={[0, h * 0.16, 0]} castShadow>
          <cylinderGeometry args={[radius * 0.72, radius * 0.55, h * 0.32, 16]} />
          <meshStandardMaterial color="#8a8172" roughness={0.95} />
        </mesh>
        <mesh position={[0, h * 0.62, 0]} castShadow>
          <sphereGeometry args={[radius, 16, 12]} />
          <meshStandardMaterial color={selected ? '#151513' : '#4a5047'} roughness={0.95} />
        </mesh>
      </>
    );
  } else if (category.includes('textile')) {
    body = (
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <boxGeometry args={[w, 0.024, d]} />
        {material}
      </mesh>
    );
  } else {
    body = (
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {material}
      </mesh>
    );
  }

  return (
    <group
      position={[x, 0, z]}
      rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
      onPointerDown={(event) => onPointerDown(event, item)}
    >
      {body}
    </group>
  );
}

type OrbitControlsHandle = OrbitControlsImpl;

/** Frames the model, then animates whole-room orbits and resets. OrbitControls
 *  keeps handling free drag/zoom between commands. */
function CameraRig({
  controls,
  cx,
  cy,
  cz,
  span,
  orbitCommand,
  resetKey,
}: {
  controls: { current: OrbitControlsHandle | null };
  cx: number;
  cy: number;
  cz: number;
  span: number;
  orbitCommand: { id: number; delta: number } | null;
  resetKey: number;
}) {
  const { camera } = useThree();
  const home = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const seenCommand = useRef(-1);
  const seenReset = useRef(-1);
  const tweening = useRef(false);

  const frame = useMemo(() => {
    const distance = Math.max(7, span * 1.85);
    return {
      position: new THREE.Vector3(
        cx + distance * 0.56,
        cy + distance * 0.48,
        cz + distance * 0.78,
      ),
      target: new THREE.Vector3(cx, cy, cz),
    };
  }, [cx, cy, cz, span]);

  useEffect(() => {
    home.current = frame;
    camera.position.copy(frame.position);
    const handle = controls.current;
    if (handle) {
      handle.target.copy(frame.target);
      handle.update();
    }
  }, [camera, controls, frame]);

  const animate = (position: THREE.Vector3) => {
    const handle = controls.current;
    if (!handle) return;
    if (reducedMotion()) {
      camera.position.copy(position);
      handle.update();
      return;
    }
    tweening.current = true;
    handle.enabled = false;
    gsap.killTweensOf(camera.position);
    gsap.to(camera.position, {
      x: position.x,
      y: position.y,
      z: position.z,
      duration: 0.75,
      ease: 'power2.inOut',
      onUpdate: () => handle.update(),
      onComplete: () => {
        tweening.current = false;
        handle.enabled = true;
      },
    });
  };

  useEffect(() => {
    if (!orbitCommand || seenCommand.current === orbitCommand.id) return;
    seenCommand.current = orbitCommand.id;
    const handle = controls.current;
    if (!handle || tweening.current) return;
    const offset = camera.position.clone().sub(handle.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), (orbitCommand.delta * Math.PI) / 180);
    animate(handle.target.clone().add(offset));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbitCommand]);

  useEffect(() => {
    if (seenReset.current === resetKey) return;
    seenReset.current = resetKey;
    const handle = controls.current;
    if (!handle || !home.current) return;
    handle.target.copy(home.current.target);
    animate(home.current.position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return null;
}

function Scene({
  floor,
  floors,
  stacked,
  wallHeight,
  selectedId,
  onSelect,
  onMoveFurniture,
  onMoveOpening,
  autoRotate = false,
  orbitCommand = null,
  resetKey = 0,
}: SceneProps) {
  const [drag, setDrag] = useState<
    | { kind: 'furniture'; id: string; x: number; y: number }
    | { kind: 'opening'; id: string; wallId: string; offset: number }
    | null
  >(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const shown = stacked && floors && floors.length > 1 ? floors : [floor];
  const step = wallHeight / 1000;
  const activeIndex = Math.max(0, shown.findIndex((entry) => entry.id === floor.id));
  const totalHeight = shown.length * step;

  const bounds = useMemo(() => {
    const points: Array<{ x: number; y: number }> = [];
    shown.forEach((entry) => {
      entry.walls.forEach((wall) => points.push(wall.a, wall.b));
      entry.rooms.forEach((room) => points.push(...room.points));
    });
    if (!points.length) return { cx: 2, cz: 2, span: 8 };
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      cx: (minX + maxX) / 2000,
      cz: (minY + maxY) / 2000,
      span: Math.max(4, Math.max(maxX - minX, maxY - minY) / 1000),
    };
  }, [shown]);

  const beginDrag = (event: ThreeEvent<PointerEvent>, item: FurnitureItem) => {
    event.stopPropagation();
    onSelect('furniture', item.id);
    setDrag({ kind: 'furniture', id: item.id, x: item.x, y: item.y });
  };

  const beginOpeningDrag = (event: ThreeEvent<PointerEvent>, opening: Opening) => {
    event.stopPropagation();
    onSelect('opening', opening.id);
    setDrag({ kind: 'opening', id: opening.id, wallId: opening.wallId, offset: opening.offset });
  };

  const groundMove = (event: ThreeEvent<PointerEvent>) => {
    if (!drag) return;
    event.stopPropagation();
    if (drag.kind === 'furniture') {
      setDrag({ ...drag, x: event.point.x * 1000, y: event.point.z * 1000 });
      return;
    }
    const wall = floor.walls.find((entry) => entry.id === drag.wallId);
    const opening = floor.openings.find((entry) => entry.id === drag.id);
    if (!wall || !opening) return;
    const hit = projectOnWall(wall, { x: event.point.x * 1000, y: event.point.z * 1000 });
    const offset = snap(Math.max(0, Math.min(wallLength(wall), hit.offset)), 50);
    if (validateOpening(floor, wall.id, offset, opening.width, opening.id).ok) {
      setDrag({ ...drag, offset });
    }
  };

  const groundUp = () => {
    if (!drag) return;
    if (drag.kind === 'furniture') {
      onMoveFurniture(drag.id, drag.x, drag.y);
    } else {
      onMoveOpening(drag.id, drag.offset);
    }
    setDrag(null);
  };

  const previewOffset = (opening: Opening) =>
    drag?.kind === 'opening' && drag.id === opening.id ? drag.offset : undefined;

  return (
    <>
      <color attach="background" args={['#f1f0ec']} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#cfc9bd', 0.6]} />
      <directionalLight
        position={[bounds.cx + 6, totalHeight + 9, bounds.cz + 5]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[bounds.cx - 5, totalHeight + 4, bounds.cz - 4]} intensity={0.4} />

      <gridHelper
        args={[Math.max(12, bounds.span * 2), 24, '#b9b4a8', '#ddd9d0']}
        position={[bounds.cx, 0, bounds.cz]}
      />

      {shown.map((entry, index) => {
        const y = index * step;
        const isActive = entry.id === floor.id;
        return (
          <group key={entry.id} position={[0, y, 0]}>
            <RoomFloor floor={entry} colour={entry.floorColor} height={wallHeight} />
            {entry.walls.map((wall) => (
              <WallMesh key={wall.id} wall={wall} floor={entry} height={wallHeight} colour={entry.wallColor} />
            ))}
            {entry.openings.map((opening) => (
              <OpeningMesh
                key={opening.id}
                opening={opening}
                floor={entry}
                height={wallHeight}
                offset={isActive ? previewOffset(opening) : undefined}
                colour={entry.wallColor}
              />
            ))}
            {entry.furniture.map((item) => (
              <FurnitureMesh
                key={item.id}
                item={item}
                selected={isActive && selectedId === item.id}
                preview={
                  isActive && drag?.kind === 'furniture' && drag.id === item.id
                    ? { x: drag.x, y: drag.y }
                    : null
                }
                onPointerDown={isActive ? beginDrag : () => undefined}
              />
            ))}
            {isActive
              ? entry.openings.map((opening) => {
                  const centre = wallPoint(
                    entry.walls.find((w) => w.id === opening.wallId) ?? entry.walls[0],
                    previewOffset(opening) ?? opening.offset,
                  );
                  return (
                    <mesh
                      key={`handle-${opening.id}`}
                      position={[centre.x, opening.sill / 1000 + 0.35, centre.z]}
                      onPointerDown={(event) => beginOpeningDrag(event, opening)}
                    >
                      <sphereGeometry args={[0.09, 12, 12]} />
                      <meshStandardMaterial color={selectedId === opening.id ? '#111111' : '#8a8375'} />
                    </mesh>
                  );
                })
              : null}
          </group>
        );
      })}

      {/* Ground plane catches the pointer while a piece is being dragged. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[bounds.cx, activeIndex * step + 0.002, bounds.cz]}
        onPointerMove={groundMove}
        onPointerUp={groundUp}
      >
        <planeGeometry args={[bounds.span * 3, bounds.span * 3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        target={[bounds.cx, Math.max(1.1, totalHeight / 2), bounds.cz]}
        minDistance={2.5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        autoRotate={autoRotate}
        autoRotateSpeed={0.65}
      />

      <CameraRig
        controls={controlsRef}
        cx={bounds.cx}
        cy={Math.max(1.1, totalHeight / 2)}
        cz={bounds.cz}
        span={bounds.span}
        orbitCommand={orbitCommand}
        resetKey={resetKey}
      />
    </>
  );
}

export function Scene3D(props: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ fov: 40, near: 0.1, far: 120, position: [9, 8, 11] }}
      style={{ background: 'transparent' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.02;
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
