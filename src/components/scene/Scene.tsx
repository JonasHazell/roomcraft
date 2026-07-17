import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { floorPolygon, polygonCenter } from '../../lib/polygon';
import { initialCameraPosition } from '../../lib/cameraFit';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { deselectOnStillClick, Floor } from './Floor';
import { Walls } from './Walls';
import { FurnitureLayer } from './FurnitureLayer';
import { ValidationOverlay } from './ValidationOverlay';

/**
 * Installs a soft vertical-gradient environment map as `scene.environment` so
 * reflective finishes (metal, gloss) have something gentle to reflect and read as
 * shiny, while matte/soft finishes stay flat — which is what makes the material
 * choice visible. Deliberately a smooth gradient with no hot light panels (unlike
 * three's RoomEnvironment): a bright lightbox blows large glossy surfaces out to
 * pure white at grazing angles, so the gradient's sub-white ceiling keeps the
 * floor readable from every camera angle. Costs one prefilter pass at mount.
 */
function SceneEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    let envTex: THREE.Texture | null = null;
    let equirect: THREE.Texture | null = null;
    const pmrem = new THREE.PMREMGenerator(gl);
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      // A bright-but-sub-white gradient. No hot panels (unlike a lightbox), so
      // large glossy surfaces never clip to white; yet bright enough that a fully
      // metal surface reflects light instead of going black. The mid band is what
      // floors reflect at grazing angles, so it is kept lifted.
      grad.addColorStop(0, '#eef0f2'); // sky
      grad.addColorStop(0.5, '#e0e2e6'); // horizon
      grad.addColorStop(1, '#c2c5cb'); // ground
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      equirect = new THREE.CanvasTexture(canvas);
      equirect.mapping = THREE.EquirectangularReflectionMapping;
      equirect.colorSpace = THREE.SRGBColorSpace;
      envTex = pmrem.fromEquirectangular(equirect).texture;
    } else {
      // No 2D canvas (headless/test) — fall back to a plain neutral env.
      envTex = pmrem.fromScene(new THREE.Scene()).texture;
    }
    scene.environment = envTex;
    return () => {
      scene.environment = null;
      envTex?.dispose();
      equirect?.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

export function Scene() {
  const roomHeight = useDesignStore((s) => s.design.room.height);
  const walls = useDesignStore((s) => s.design.walls);
  const dragging = useUiStore((s) => s.draggingId !== null);

  const floor = useMemo(() => floorPolygon(walls), [walls]);
  const center = useMemo(() => polygonCenter(floor), [floor]);
  // Frame the whole room on the first frame: scale the camera offset by the
  // room's actual footprint instead of a fixed constant (#291).
  const cameraPos = useMemo(() => initialCameraPosition(floor, center), [floor, center]);

  return (
    <Canvas shadows camera={{ position: cameraPos, fov: 45 }}>
      <color attach="background" args={['#eceef1']} />
      <fog attach="fog" args={['#eceef1', 28, 60]} />

      <SceneEnvironment />

      {/* The gradient environment adds a soft fill, so the ambient and hemisphere
          lights are trimmed a little to keep the original exposure and contrast. */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#ffffff', '#dfe3e8', 0.35]} />
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
