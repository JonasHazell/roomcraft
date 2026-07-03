import type { ThreeEvent } from '@react-three/fiber';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';

/** Avmarkera bara vid stillastående klick — inte när ett drag/kamerasnurr släpps. */
export function deselectOnStillClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 3) return;
  useUiStore.getState().select(null);
}

export function Floor() {
  const room = useDesignStore((s) => s.design.room);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={deselectOnStillClick}>
      <planeGeometry args={[room.width, room.length]} />
      <meshStandardMaterial color={room.floorColor} roughness={0.9} />
    </mesh>
  );
}
