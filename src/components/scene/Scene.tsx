import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { floorPolygon, polygonCenter } from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { deselectOnStillClick, Floor } from './Floor';
import { Walls } from './Walls';
import { FurnitureLayer } from './FurnitureLayer';
import { ValidationOverlay } from './ValidationOverlay';

/**
 * Installs a soft studio environment map (three's asset-free RoomEnvironment,
 * prefiltered into a PMREM) as `scene.environment`. Without it, reflective
 * finishes — metal, gloss — have nothing to reflect and just render dark; with it
 * they read as genuinely shiny and the matte/soft finishes stay flat, which is
 * what makes the material choice visible. Costs one prefilter pass at mount.
 */
function SceneEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    return () => {
      scene.environment = null;
      envTex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

export function Scene() {
  const roomHeight = useDesignStore((s) => s.design.room.height);
  const walls = useDesignStore((s) => s.design.walls);
  const dragging = useUiStore((s) => s.draggingId !== null);

  const center = useMemo(() => polygonCenter(floorPolygon(walls)), [walls]);

  return (
    <Canvas shadows camera={{ position: [center.x + 7, 5.5, center.z + 8.5], fov: 45 }}>
      <color attach="background" args={['#eceef1']} />
      <fog attach="fog" args={['#eceef1', 28, 60]} />

      <SceneEnvironment />

      {/* The environment map now supplies most of the soft fill, so the ambient
          and hemisphere lights are dialled back to keep the original exposure and
          contrast rather than washing the room out. */}
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#dfe3e8', 0.3]} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
      />

      {/* Ground outside the room, catches wall shadows; clicking here deselects */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[center.x, -0.03, center.z]}
        receiveShadow
        onClick={deselectOnStillClick}
      >
        <circleGeometry args={[45, 64]} />
        <meshStandardMaterial color="#e2e5e9" />
      </mesh>

      <Floor />
      <Walls />
      <FurnitureLayer />
      <ValidationOverlay />

      <OrbitControls
        makeDefault
        enabled={!dragging}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1.5}
        maxDistance={40}
        target={[center.x, roomHeight / 3, center.z]}
      />
    </Canvas>
  );
}
