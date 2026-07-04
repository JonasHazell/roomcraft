import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { floorPolygon, polygonCenter } from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { deselectOnStillClick, Floor } from './Floor';
import { Walls } from './Walls';
import { FurnitureLayer } from './FurnitureLayer';
import { ValidationOverlay } from './ValidationOverlay';

export function Scene() {
  const roomHeight = useDesignStore((s) => s.design.room.height);
  const walls = useDesignStore((s) => s.design.walls);
  const dragging = useUiStore((s) => s.draggingId !== null);

  const center = useMemo(() => polygonCenter(floorPolygon(walls)), [walls]);

  return (
    <Canvas shadows camera={{ position: [center.x + 7, 5.5, center.z + 8.5], fov: 45 }}>
      <color attach="background" args={['#ece4d4']} />
      <fog attach="fog" args={['#ece4d4', 28, 60]} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff6e4', '#c9b795', 0.4]} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.2}
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

      {/* Mark utanför rummet, fångar väggskuggor; klick här avmarkerar */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[center.x, -0.03, center.z]}
        receiveShadow
        onClick={deselectOnStillClick}
      >
        <circleGeometry args={[45, 64]} />
        <meshStandardMaterial color="#ddd2ba" />
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
