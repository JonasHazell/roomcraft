import { optBool } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Toilet({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const lidUp = optBool(options, 'lidUp', false);
  const seatY = h * 0.55; // seating surface height
  const bowlR = w * 0.45;
  const seatT = 0.04;

  return (
    <group>
      {/* pedestal from the floor up to the bowl */}
      <mesh castShadow position={[0, seatY / 2, d * 0.08]}>
        <boxGeometry args={[w * 0.5, seatY, d * 0.5]} />
        <Mat color={color} selected={selected} part="ceramic" />
      </mesh>
      {/* bowl */}
      <mesh castShadow position={[0, seatY - h * 0.06, d * 0.12]}>
        <cylinderGeometry args={[bowlR, bowlR * 0.82, h * 0.2, 24]} />
        <Mat color={color} selected={selected} part="ceramic" />
      </mesh>
      {/* cistern / tank at the back (local -z) */}
      <mesh castShadow position={[0, seatY + h * 0.16, -d / 2 + w * 0.12]}>
        <boxGeometry args={[w * 0.85, h * 0.5, d * 0.2]} />
        <Mat color={color} selected={selected} part="ceramic" />
      </mesh>
      {/* seat + lid: flat on the bowl, or raised against the tank */}
      {lidUp ? (
        <mesh position={[0, seatY + h * 0.12, -d / 2 + w * 0.24]} rotation-x={0.18}>
          <cylinderGeometry args={[bowlR, bowlR, seatT, 24]} />
          <Mat color={shade(color, 0.06)} selected={selected} part="ceramic" />
        </mesh>
      ) : (
        <mesh position={[0, seatY + seatT / 2, d * 0.12]}>
          <cylinderGeometry args={[bowlR * 1.02, bowlR * 1.02, seatT, 24]} />
          <Mat color={shade(color, 0.06)} selected={selected} part="ceramic" />
        </mesh>
      )}
    </group>
  );
}
