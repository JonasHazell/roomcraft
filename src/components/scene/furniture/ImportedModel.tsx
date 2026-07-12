import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { FurnitureSize } from '../../../types';

/**
 * Renders a user-imported GLTF/GLB model in place of the generic box, scaled to
 * the piece's size (so its footprint matches what collision and the validation
 * rules measure). Wrapped so a slow load shows a placeholder box and a broken
 * model shows a clearly-marked error box instead of crashing the whole scene.
 */

/** Danger-red mirror of the --danger token for the WebGL error box. */
const ERROR_COLOR = '#dc2626';

/** A plain box at the piece's dimensions — used while loading and on failure. */
function FallbackBox({ size, error = false }: { size: FurnitureSize; error?: boolean }) {
  const { width: w, depth: d, height: h } = size;
  return (
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={error ? ERROR_COLOR : '#c9cdd3'}
        wireframe={error}
        roughness={0.9}
        transparent
        opacity={error ? 0.9 : 0.6}
      />
    </mesh>
  );
}

function Model({ src, size }: { src: string; size: FurnitureSize }) {
  const gltf = useLoader(GLTFLoader, src);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // Recentre on the origin, then scale each axis so the model fills the piece's
    // footprint exactly — the size the user sees and that collision uses.
    const box = new THREE.Box3().setFromObject(clone);
    const dim = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(dim);
    box.getCenter(centre);
    clone.position.sub(centre);
    const inner = new THREE.Group();
    inner.add(clone);
    inner.scale.set(
      dim.x > 1e-4 ? size.width / dim.x : 1,
      dim.y > 1e-4 ? size.height / dim.y : 1,
      dim.z > 1e-4 ? size.depth / dim.z : 1,
    );
    return inner;
  }, [gltf, size.width, size.height, size.depth]);

  // Lift so the model sits on the floor (its centre is now at the origin).
  return (
    <group position={[0, size.height / 2, 0]}>
      <primitive object={object} />
    </group>
  );
}

/**
 * Catches a GLTF load/parse failure for one piece and shows a marked error box
 * instead of letting the throw tear down the scene. The piece stays selectable
 * and removable, so a bad import is recoverable.
 */
class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Failed to load an imported 3D model:', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function ImportedModel({ src, size }: { src: string; size: FurnitureSize }) {
  return (
    <ModelErrorBoundary fallback={<FallbackBox size={size} error />}>
      <Suspense fallback={<FallbackBox size={size} />}>
        <Model src={src} size={size} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
