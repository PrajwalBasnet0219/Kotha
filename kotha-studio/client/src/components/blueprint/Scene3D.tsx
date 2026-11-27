import { useMemo, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
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

function WallMesh({ wall, floor, height }: { wall: Wall; floor: Floor; height: number }) {
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
            <meshStandardMaterial color="#e8e4da" roughness={0.96} />
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
}: {
  opening: Opening;
  floor: Floor;
  height: number;
  offset?: number;
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
          <meshStandardMaterial color="#e8e4da" roughness={0.96} />
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
        <meshStandardMaterial color="#e8e4da" roughness={0.96} />
      </mesh>
    </group>
  );
}

function RoomFloor({ floor }: { floor: Floor }) {
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
          <mesh key={room.id} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial
              color={room.kind === 'stair' ? '#b9b2a3' : '#d9d4c9'}
              roughness={0.97}
              side={THREE.DoubleSide}
            />
          </mesh>
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
  const colour = FURNITURE_COLOURS[item.category] ?? '#6f685c';
  return (
    <mesh
      position={[x, item.h / 2000, z]}
      rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
      castShadow
      receiveShadow
      onPointerDown={(event) => onPointerDown(event, item)}
    >
      <boxGeometry args={[item.w / 1000, item.h / 1000, item.d / 1000]} />
      <meshStandardMaterial
        color={selected ? '#151513' : colour}
        roughness={0.9}
        emissive={selected ? new THREE.Color('#2a2a26') : undefined}
        emissiveIntensity={selected ? 0.4 : 0}
      />
    </mesh>
  );
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
}: SceneProps) {
  const [drag, setDrag] = useState<
    | { kind: 'furniture'; id: string; x: number; y: number }
    | { kind: 'opening'; id: string; wallId: string; offset: number }
    | null
  >(null);
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
            <RoomFloor floor={entry} />
            {entry.walls.map((wall) => (
              <WallMesh key={wall.id} wall={wall} floor={entry} height={wallHeight} />
            ))}
            {entry.openings.map((opening) => (
              <OpeningMesh
                key={opening.id}
                opening={opening}
                floor={entry}
                height={wallHeight}
                offset={isActive ? previewOffset(opening) : undefined}
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
        target={[bounds.cx, Math.max(1.1, totalHeight / 2), bounds.cz]}
        minDistance={2.5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
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
