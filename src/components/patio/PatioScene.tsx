import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { usePatioStore } from '../../store/usePatioStore';
import { House } from './House';
import {
  DECK_MATERIALS,
  SURFACES,
  surfaceTexture,
  type DeckMaterialId,
  type SurfaceId,
} from './surfaces';

/** The yard is always at least this wide and always spans the facade. */
function houseLength(deckWidth: number): number {
  return Math.max(deckWidth + 1.6, 9);
}

const DECK_H = 0.16;

/** A repeating MeshStandardMaterial for a ground/deck surface sized in metres. */
function useSurfaceMaterial(
  spec: { id: string; draw: () => HTMLCanvasElement; roughness: number },
  widthM: number,
  depthM: number,
  tileMeters: number,
) {
  const material = useMemo(() => {
    const tex = surfaceTexture(spec);
    tex.repeat.set(Math.max(1, widthM / tileMeters), Math.max(1, depthM / tileMeters));
    tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: spec.roughness });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.id, widthM, depthM, tileMeters]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

function Ground({ surface, yardWidth, yardDepth }: { surface: SurfaceId; yardWidth: number; yardDepth: number }) {
  const spec = SURFACES.find((s) => s.id === surface)!;
  const w = yardWidth + 0.8;
  const d = yardDepth;
  const mat = useSurfaceMaterial(spec, w, d, spec.tileMeters);
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[yardWidth / 2 - 0.4, 0, d / 2]}
      receiveShadow
      material={mat}
    >
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

function Deck({ width, depth, material }: { width: number; depth: number; material: DeckMaterialId }) {
  const spec = DECK_MATERIALS.find((m) => m.id === material)!;
  const topMat = useSurfaceMaterial(spec, width, depth, spec.tileMeters);
  const fascia = useMemo(
    () => new THREE.MeshStandardMaterial({ color: spec.swatch, roughness: 0.8 }),
    [spec.swatch],
  );
  useEffect(() => () => fascia.dispose(), [fascia]);
  const darkFascia = useMemo(() => {
    const c = new THREE.Color(spec.swatch).multiplyScalar(0.7);
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  }, [spec.swatch]);
  useEffect(() => () => darkFascia.dispose(), [darkFascia]);

  return (
    <group>
      {/* fascia / structure */}
      <mesh position={[width / 2, DECK_H / 2, depth / 2]} material={darkFascia} castShadow receiveShadow>
        <boxGeometry args={[width, DECK_H, depth]} />
      </mesh>
      {/* plank top */}
      <mesh rotation-x={-Math.PI / 2} position={[width / 2, DECK_H + 0.005, depth / 2]} material={topMat} receiveShadow>
        <planeGeometry args={[width, depth]} />
      </mesh>
      {/* step down at the front edge */}
      <mesh position={[width / 2, DECK_H / 4, depth + 0.16]} material={fascia} castShadow receiveShadow>
        <boxGeometry args={[width, DECK_H / 2, 0.32]} />
      </mesh>
    </group>
  );
}

/** A slatted timber fence along the back of the yard, like the photos. */
function Fence({ width, z }: { width: number; z: number }) {
  const wood = '#c8a877';
  const slats = 6;
  const height = 1.2;
  const posts = Math.max(2, Math.round(width / 2.2));
  return (
    <group position={[0, 0, z]}>
      {Array.from({ length: slats }, (_, i) => {
        const y = 0.18 + (i / slats) * height;
        return (
          <mesh key={i} position={[width / 2, y, 0]} castShadow>
            <boxGeometry args={[width, 0.09, 0.03]} />
            <meshStandardMaterial color={wood} roughness={0.8} />
          </mesh>
        );
      })}
      {Array.from({ length: posts + 1 }, (_, i) => (
        <mesh key={`p${i}`} position={[(i / posts) * width, height / 2 + 0.1, 0]} castShadow>
          <boxGeometry args={[0.09, height + 0.2, 0.09]} />
          <meshStandardMaterial color="#b7996b" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Planter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.44, 16]} />
        <meshStandardMaterial color="#d8d2c6" roughness={0.9} />
      </mesh>
      {/* ornamental grass */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshStandardMaterial color="#88a35b" roughness={1} />
      </mesh>
    </group>
  );
}

function LampPost({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.2, 12]} />
        <meshStandardMaterial color="#242424" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.35, 0]} castShadow>
        <boxGeometry args={[0.24, 0.3, 0.24]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <boxGeometry args={[0.16, 0.2, 0.16]} />
        <meshStandardMaterial color="#ffe9b0" emissive="#ffdd88" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** A little bistro set so the deck reads at human scale and looks lived-in. */
function BistroSet({ position }: { position: [number, number, number] }) {
  const metal = new THREE.MeshStandardMaterial({ color: '#3a3a38', roughness: 0.5, metalness: 0.3 });
  return (
    <group position={position}>
      {/* table */}
      <mesh position={[0, 0.72, 0]} castShadow material={metal}>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 20]} />
      </mesh>
      <mesh position={[0, 0.36, 0]} material={metal}>
        <cylinderGeometry args={[0.04, 0.06, 0.72, 10]} />
      </mesh>
      {/* two chairs */}
      {[-0.75, 0.75].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, 0.46, 0]} castShadow material={metal}>
            <boxGeometry args={[0.42, 0.05, 0.42]} />
          </mesh>
          <mesh position={[0, 0.72, dx > 0 ? 0.18 : -0.18]} castShadow material={metal}>
            <boxGeometry args={[0.42, 0.5, 0.05]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Shrub({ position, r = 0.6, color = '#5f7d3c' }: { position: [number, number, number]; r?: number; color?: string }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[r, 12, 12]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function SceneContents() {
  const deckWidth = usePatioStore((s) => s.deckWidth);
  const deckDepth = usePatioStore((s) => s.deckDepth);
  const deckMaterial = usePatioStore((s) => s.deckMaterial);
  const surface = usePatioStore((s) => s.surface);
  const yardDepth = usePatioStore((s) => s.yardDepth);
  const showProps = usePatioStore((s) => s.showProps);

  const length = houseLength(deckWidth);
  const yardWidth = length;
  const porchWidth = Math.min(Math.max(deckWidth, 2.4), length);
  const effYardDepth = Math.max(yardDepth, deckDepth + 0.5);

  return (
    <group>
      <House length={length} porchWidth={porchWidth} />
      <Ground surface={surface} yardWidth={yardWidth} yardDepth={effYardDepth} />
      <Deck width={deckWidth} depth={deckDepth} material={deckMaterial} />
      <Fence width={yardWidth} z={effYardDepth} />

      {/* gravel foundation strip + greenery for context */}
      <Shrub position={[yardWidth - 0.6, 0.5, effYardDepth - 0.7]} r={0.7} color="#5c7a39" />
      <Shrub position={[yardWidth - 1.5, 0.35, effYardDepth - 0.5]} r={0.5} color="#6c8a45" />
      <Shrub position={[-0.1, 0.45, effYardDepth - 0.8]} r={0.55} color="#5f7d3c" />

      {showProps && (
        <>
          <LampPost position={[deckWidth + 0.6, 0, effYardDepth - 0.6]} />
          <Planter position={[0.5, DECK_H, deckDepth - 0.55]} />
          <Planter position={[deckWidth - 0.5, DECK_H, deckDepth - 0.55]} />
          {deckWidth >= 3.2 && deckDepth >= 2.2 && (
            <BistroSet position={[deckWidth / 2, DECK_H, deckDepth / 2]} />
          )}
        </>
      )}
    </group>
  );
}

export function PatioScene() {
  // Frame the corner from front-right, a comfortable distance back.
  const initialWidth = houseLength(usePatioStore.getState().deckWidth);
  const camPos = useMemo<[number, number, number]>(
    () => [initialWidth * 0.82, 5.6, usePatioStore.getState().yardDepth + 8.5],
    [initialWidth],
  );
  const target = useMemo<[number, number, number]>(
    () => [initialWidth * 0.42, 0.7, 2.6],
    [initialWidth],
  );

  return (
    <Canvas shadows camera={{ position: camPos, fov: 42 }}>
      <color attach="background" args={['#c9dcec']} />
      <fog attach="fog" args={['#c9dcec', 30, 70]} />

      <hemisphereLight args={['#dfeaf5', '#7a8163', 0.7]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
      />

      {/* Big surrounding lawn so the yard never floats on a void edge. */}
      <mesh rotation-x={-Math.PI / 2} position={[4, -0.04, 6]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#7f9557" roughness={1} />
      </mesh>

      <SceneContents />

      <OrbitControls
        makeDefault
        target={target}
        maxPolarAngle={Math.PI / 2 - 0.04}
        minDistance={3}
        maxDistance={32}
        enablePan
      />
    </Canvas>
  );
}
