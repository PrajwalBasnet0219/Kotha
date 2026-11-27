import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const W = 4.2;
const D = 3.6;
const H = 2.8;
const T = 0.12;
const Z_BACK = -D / 2 - T / 2;
const X_LEFT = -W / 2 - T / 2;

const span = (p: number, from: number, to: number) => Math.min(1, Math.max(0, (p - from) / (to - from)));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

type Progress = { current: number };

type Materials = ReturnType<typeof useMaterials>;

function useMaterials() {
  const materials = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({ color: '#e9e5db', roughness: 0.95 }),
      floor: new THREE.MeshStandardMaterial({ color: '#dbd7cc', roughness: 0.97 }),
      slab: new THREE.MeshStandardMaterial({ color: '#c7c2b6', roughness: 0.95 }),
      rug: new THREE.MeshStandardMaterial({ color: '#d2ccbd', roughness: 1 }),
      rugEdge: new THREE.MeshStandardMaterial({ color: '#aaa495', roughness: 1 }),
      fabric: new THREE.MeshStandardMaterial({ color: '#3c3c37', roughness: 0.98 }),
      cushion: new THREE.MeshStandardMaterial({ color: '#55554d', roughness: 0.99 }),
      wood: new THREE.MeshStandardMaterial({ color: '#a49d8e', roughness: 0.9 }),
      metal: new THREE.MeshStandardMaterial({ color: '#2b2b28', roughness: 0.5, metalness: 0.3 }),
      ink: new THREE.MeshStandardMaterial({ color: '#21211f', roughness: 0.8 }),
      plant: new THREE.MeshStandardMaterial({ color: '#4a5047', roughness: 0.95, flatShading: true }),
      pot: new THREE.MeshStandardMaterial({ color: '#9a9385', roughness: 0.95 }),
      glass: new THREE.MeshStandardMaterial({
        color: '#cfd6d3',
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.2,
      }),
      shade: new THREE.MeshStandardMaterial({
        color: '#ddd7c8',
        roughness: 0.9,
        side: THREE.DoubleSide,
        emissive: new THREE.Color('#f5efdf'),
        emissiveIntensity: 0.35,
      }),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      Object.values(materials).forEach((material) => material.dispose());
    };
  }, [materials]);

  return materials;
}

/** A box wall panel that grows up from its own bottom edge. */
function WallPanel({
  size,
  position,
  from,
  to,
  progress,
  material,
}: {
  size: [number, number, number];
  position: [number, number, number];
  from: number;
  to: number;
  progress: Progress;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const bottom = position[1] - size[1] / 2;

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = ease(span(progress.current, from, to));
    mesh.visible = t > 0.001;
    mesh.scale.y = Math.max(0.001, t);
    mesh.position.y = bottom + (size[1] * t) / 2;
  });

  return (
    <mesh ref={ref} position={position} material={material} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Anything that should arrive at a point in the build and drop into place. */
function Piece({
  from,
  to,
  progress,
  children,
  drop = 0.55,
}: {
  from: number;
  to: number;
  progress: Progress;
  children: ReactNode;
  drop?: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const t = ease(span(progress.current, from, to));
    group.visible = t > 0.002;
    group.position.y = (1 - t) * drop;
    group.scale.setScalar(0.94 + 0.06 * t);
  });

  return <group ref={ref}>{children}</group>;
}

/** Fades a sub-assembly in by scaling it up from its anchor. */
function Appear({
  from,
  to,
  progress,
  children,
  scaleFrom = 0.6,
}: {
  from: number;
  to: number;
  progress: Progress;
  children: ReactNode;
  scaleFrom?: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const t = ease(span(progress.current, from, to));
    group.visible = t > 0.01;
    group.scale.setScalar(scaleFrom + (1 - scaleFrom) * t);
  });

  return <group ref={ref}>{children}</group>;
}

function CameraRig({ progress }: { progress: Progress }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useFrame(() => {
    const p = ease(progress.current);
    const aspect = size.width / Math.max(1, size.height);
    // A narrow stage would crop the room to one corner, so step back instead
    // of changing the lens — the perspective should stay honest.
    const fit = aspect < 0.9 ? 1.56 : aspect < 1.15 ? 1.2 : 1;
    const azimuth = 0.98 - 0.26 * p;
    const radius = (8.8 - 2.3 * p) * fit;
    const height = (5.9 - 2.4 * p) * (fit > 1 ? 1.05 : 1);
    camera.position.set(Math.sin(azimuth) * radius, height, Math.cos(azimuth) * radius);
    camera.lookAt(0, 0.55 + 0.5 * p, 0);
  });

  return null;
}

function FloorGrid() {
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (let x = -W / 2; x <= W / 2 + 0.001; x += 0.6) {
      points.push(x, 0.006, -D / 2, x, 0.006, D / 2);
    }
    for (let z = -D / 2; z <= D / 2 + 0.001; z += 0.6) {
      points.push(-W / 2, 0.006, z, W / 2, 0.006, z);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return buffer;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#aca697" transparent opacity={0.75} />
    </lineSegments>
  );
}

function Sofa({ m }: { m: Materials }) {
  return (
    <group position={[-0.62, 0, -1.38]}>
      <mesh position={[0, 0.18, 0]} material={m.fabric} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.32, 0.84]} />
      </mesh>
      <mesh position={[0, 0.53, -0.31]} material={m.fabric} castShadow>
        <boxGeometry args={[2.1, 0.56, 0.22]} />
      </mesh>
      {[-0.96, 0.96].map((x) => (
        <mesh key={x} position={[x, 0.36, 0]} material={m.fabric} castShadow>
          <boxGeometry args={[0.18, 0.42, 0.84]} />
        </mesh>
      ))}
      {[-0.47, 0.47].map((x) => (
        <mesh key={x} position={[x, 0.38, 0.06]} material={m.cushion} castShadow>
          <boxGeometry args={[0.88, 0.14, 0.62]} />
        </mesh>
      ))}
      {[
        [-0.92, 0.04, 0.34],
        [0.92, 0.04, 0.34],
        [-0.92, 0.04, -0.34],
        [0.92, 0.04, -0.34],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]} material={m.metal} castShadow>
          <boxGeometry args={[0.05, 0.08, 0.05]} />
        </mesh>
      ))}
    </group>
  );
}

function CoffeeTable({ m }: { m: Materials }) {
  return (
    <group position={[0.2, 0, 0.22]}>
      <mesh position={[0, 0.4, 0]} material={m.wood} castShadow receiveShadow>
        <boxGeometry args={[1.28, 0.05, 0.66]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={m.wood} castShadow>
        <boxGeometry args={[1.1, 0.03, 0.5]} />
      </mesh>
      {[
        [-0.58, 0.2, -0.28],
        [0.58, 0.2, -0.28],
        [-0.58, 0.2, 0.28],
        [0.58, 0.2, 0.28],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]} material={m.metal} castShadow>
          <boxGeometry args={[0.04, 0.4, 0.04]} />
        </mesh>
      ))}
      <mesh position={[0.2, 0.45, 0]} material={m.ink ?? m.metal} castShadow>
        <boxGeometry args={[0.22, 0.04, 0.22]} />
      </mesh>
    </group>
  );
}

function Shelf({ m }: { m: Materials }) {
  return (
    <group position={[-1.92, 0, -0.95]}>
      <mesh position={[0, 0.9, 0]} material={m.wood} castShadow receiveShadow>
        <boxGeometry args={[0.06, 1.8, 0.92]} />
      </mesh>
      {[-0.44, 0.44].map((z) => (
        <mesh key={z} position={[0.14, 0.9, z]} material={m.wood} castShadow>
          <boxGeometry args={[0.3, 1.8, 0.04]} />
        </mesh>
      ))}
      {[0.18, 0.62, 1.06, 1.5].map((y) => (
        <mesh key={y} position={[0.14, y, 0]} material={m.wood} castShadow>
          <boxGeometry args={[0.3, 0.035, 0.88]} />
        </mesh>
      ))}
      {[
        [0.05, 0.3, -0.18, 0.12, 0.24, 0.1],
        [0.06, 0.76, 0.14, 0.1, 0.26, 0.14],
        [0.05, 1.2, -0.2, 0.12, 0.2, 0.12],
      ].map(([x, y, z, w, h, d]) => (
        <mesh key={`${y}-${z}`} position={[x, y, z]} material={m.ink ?? m.metal} castShadow>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}
    </group>
  );
}

function Plant({ m }: { m: Materials }) {
  return (
    <group position={[1.55, 0, -1.36]}>
      <mesh position={[0, 0.17, 0]} material={m.pot} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.13, 0.34, 12]} />
      </mesh>
      <mesh position={[0, 0.8, 0]} material={m.metal} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 1.0, 6]} />
      </mesh>
      {[
        [0, 1.35, 0, 0.26],
        [-0.16, 1.12, 0.08, 0.2],
        [0.15, 1.05, -0.1, 0.18],
        [0.06, 1.55, -0.04, 0.16],
      ].map(([x, y, z, r], index) => (
        <mesh key={index} position={[x, y, z]} material={m.plant} castShadow>
          <icosahedronGeometry args={[r, 0]} />
        </mesh>
      ))}
    </group>
  );
}

function FloorLamp({ m }: { m: Materials }) {
  return (
    <group position={[1.68, 0, 1.05]}>
      <mesh position={[0, 0.02, 0]} material={m.metal} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.03, 16]} />
      </mesh>
      <mesh position={[0, 0.8, 0]} material={m.metal} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 1.56, 6]} />
      </mesh>
      <mesh position={[0, 1.63, 0]} material={m.shade} castShadow>
        <coneGeometry args={[0.24, 0.3, 20, 1, true]} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} intensity={0.6} distance={3} color="#f3ecdb" />
    </group>
  );
}

function Armchair({ m }: { m: Materials }) {
  return (
    <group position={[1.22, 0, 0.28]} rotation={[0, -2.3, 0]}>
      <mesh position={[0, 0.2, 0]} material={m.cushion} castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.34, 0.74]} />
      </mesh>
      <mesh position={[0, 0.56, -0.32]} material={m.cushion} castShadow>
        <boxGeometry args={[0.72, 0.52, 0.16]} />
      </mesh>
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} position={[x, 0.44, 0]} material={m.cushion} castShadow>
          <boxGeometry args={[0.1, 0.28, 0.74]} />
        </mesh>
      ))}
      {[
        [-0.3, 0.03, -0.3],
        [0.3, 0.03, -0.3],
        [-0.3, 0.03, 0.3],
        [0.3, 0.03, 0.3],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]} material={m.wood} castShadow>
          <boxGeometry args={[0.05, 0.1, 0.05]} />
        </mesh>
      ))}
    </group>
  );
}

function DoorLeaf({ m }: { m: Materials }) {
  return (
    <group position={[-2.09, 1.02, 0.35]} rotation={[0, 0.62, 0]}>
      <mesh position={[0, 0, 0.45]} material={m.wall} castShadow>
        <boxGeometry args={[0.045, 2.04, 0.9]} />
      </mesh>
      <mesh position={[0.05, 0, 0.78]} material={m.metal} castShadow>
        <boxGeometry args={[0.05, 0.04, 0.16]} />
      </mesh>
    </group>
  );
}

function WindowFrame({ m }: { m: Materials }) {
  return (
    <group position={[0.6, 0, Z_BACK]}>
      {[-0.7, 0.7].map((x) => (
        <mesh key={`v-${x}`} position={[x, 1.55, 0.02]} material={m.metal} castShadow>
          <boxGeometry args={[0.05, 1.3, 0.06]} />
        </mesh>
      ))}
      {[0.9, 2.2].map((y) => (
        <mesh key={`h-${y}`} position={[0, y, 0.02]} material={m.metal} castShadow>
          <boxGeometry args={[1.46, 0.05, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0.02]} material={m.metal}>
        <boxGeometry args={[0.035, 1.3, 0.05]} />
      </mesh>
      <mesh position={[0, 1.55, 0.01]} material={m.glass}>
        <boxGeometry args={[1.4, 1.3, 0.01]} />
      </mesh>
      <mesh position={[0, 0.88, 0.09]} material={m.wood} castShadow>
        <boxGeometry args={[1.56, 0.045, 0.22]} />
      </mesh>
    </group>
  );
}

function Scene({ progress }: { progress: Progress }) {
  const m = useMaterials();

  return (
    <>
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#bcb7aa', 0.55]} />
      <directionalLight
        position={[5.5, 9, 4]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-5, 4, -3]} intensity={0.5} />

      {/* plinth and floor */}
      <mesh position={[0, -0.075, 0]} material={m.slab} receiveShadow>
        <boxGeometry args={[W + 0.34, 0.15, D + 0.34]} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.floor} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      <FloorGrid />

      {/* rugs and walls */}
      <Piece from={0.3} to={0.44} progress={progress} drop={0.05}>
        <mesh position={[0.05, 0.01, 0.28]} rotation={[-Math.PI / 2, 0, 0]} material={m.rugEdge} receiveShadow>
          <planeGeometry args={[2.99, 2.44]} />
        </mesh>
        <mesh position={[0.05, 0.014, 0.28]} rotation={[-Math.PI / 2, 0, 0]} material={m.rug} receiveShadow>
          <planeGeometry args={[2.86, 2.31]} />
        </mesh>
      </Piece>

      <WallPanel size={[2.0, H, T]} position={[-1.1, H / 2, Z_BACK]} from={0.12} to={0.32} progress={progress} material={m.wall} />
      <WallPanel size={[0.8, H, T]} position={[1.7, H / 2, Z_BACK]} from={0.15} to={0.35} progress={progress} material={m.wall} />
      <WallPanel size={[1.4, 0.9, T]} position={[0.6, 0.45, Z_BACK]} from={0.17} to={0.37} progress={progress} material={m.wall} />
      <WallPanel size={[1.4, 0.6, T]} position={[0.6, 2.5, Z_BACK]} from={0.19} to={0.39} progress={progress} material={m.wall} />

      <WallPanel size={[T, H, 2.15]} position={[X_LEFT, H / 2, -0.725]} from={0.2} to={0.4} progress={progress} material={m.wall} />
      <WallPanel size={[T, H, 0.55]} position={[X_LEFT, H / 2, 1.525]} from={0.23} to={0.43} progress={progress} material={m.wall} />
      <WallPanel size={[T, 0.7, 0.9]} position={[X_LEFT, 2.45, 0.8]} from={0.25} to={0.45} progress={progress} material={m.wall} />

      <Appear from={0.38} to={0.5} progress={progress}>
        <WindowFrame m={m} />
      </Appear>

      <Appear from={0.4} to={0.52} progress={progress}>
        <group position={[X_LEFT + 0.06, 0, 0]}>
          {[0.35, 1.25].map((z) => (
            <mesh key={z} position={[0, 1.05, z]} material={m.metal} castShadow>
              <boxGeometry args={[0.06, 2.1, 0.05]} />
            </mesh>
          ))}
          <mesh position={[0, 2.12, 0.8]} material={m.metal} castShadow>
            <boxGeometry args={[0.06, 0.05, 0.95]} />
          </mesh>
        </group>
      </Appear>

      <Appear from={0.44} to={0.56} progress={progress}>
        <DoorLeaf m={m} />
      </Appear>

      <Piece from={0.5} to={0.66} progress={progress}>
        <Sofa m={m} />
      </Piece>
      <Piece from={0.56} to={0.7} progress={progress}>
        <CoffeeTable m={m} />
      </Piece>
      <Piece from={0.6} to={0.74} progress={progress}>
        <Shelf m={m} />
      </Piece>
      <Piece from={0.64} to={0.78} progress={progress}>
        <Armchair m={m} />
      </Piece>
      <Piece from={0.68} to={0.82} progress={progress}>
        <Plant m={m} />
      </Piece>
      <Piece from={0.72} to={0.86} progress={progress}>
        <FloorLamp m={m} />
      </Piece>

      <CameraRig progress={progress} />
    </>
  );
}

export function KothaRoom({ progress }: { progress: Progress }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 33, near: 0.1, far: 80, position: [7.3, 5.9, 4.9] }}
      style={{ background: 'transparent' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.02;
      }}
    >
      <Scene progress={progress} />
    </Canvas>
  );
}
