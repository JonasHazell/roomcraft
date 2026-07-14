import { optBool, optNum } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Stove({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const burners = optNum(options, 'burners', 4);
  const handle = optBool(options, 'handle', true);
  const topT = 0.03;
  const bodyH = Math.max(h - topT, 0.1);

  // Lay the burners out in a grid — two columns once there is more than one.
  const cols = burners > 1 ? 2 : 1;
  const rows = Math.ceil(burners / cols);
  const ringR = Math.min(w, d) / (Math.max(cols, rows) * 2.4 + 1);
  const knobs = Math.min(burners, 4);

  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, bodyH / 2, 0]}>
        <boxGeometry args={[w, bodyH, d]} />
        <Mat color={color} selected={selected} part="body" />
      </mesh>
      {/* glass-ceramic cooktop */}
      <mesh castShadow position={[0, bodyH + topT / 2, 0]}>
        <boxGeometry args={[w, topT, d]} />
        <Mat color="#2c2e30" selected={selected} part="cooktop" />
      </mesh>
      {/* burner rings */}
      {Array.from({ length: burners }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = cols === 1 ? 0 : -w / 4 + col * (w / 2);
        const cz = rows === 1 ? 0 : -d / 5 + row * (d / 2.5);
        return (
          <mesh key={i} position={[cx, bodyH + topT + 0.006, cz]} rotation-x={-Math.PI / 2}>
            <torusGeometry args={[ringR, 0.012, 8, 24]} />
            <Mat color="#4a4a4d" selected={selected} roughness={0.5} metalness={0.4} />
          </mesh>
        );
      })}
      {/* oven door on the front (local +z) */}
      <mesh position={[0, bodyH * 0.42, d / 2 + 0.005]}>
        <boxGeometry args={[w * 0.86, bodyH * 0.6, 0.02]} />
        <Mat color={shade(color, 0.12)} selected={selected} part="body" />
      </mesh>
      <mesh position={[0, bodyH * 0.42, d / 2 + 0.02]}>
        <planeGeometry args={[w * 0.6, bodyH * 0.32]} />
        <meshStandardMaterial color="#15181c" roughness={0.2} metalness={0.3} />
      </mesh>
      {/* oven handle */}
      {handle && (
        <mesh position={[0, bodyH * 0.78, d / 2 + 0.04]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.012, 0.012, w * 0.7, 12]} />
          <Mat color="#b8bcc0" selected={selected} roughness={0.3} metalness={0.7} />
        </mesh>
      )}
      {/* control knobs above the door */}
      {Array.from({ length: knobs }, (_, i) => {
        const cx = (-(knobs - 1) / 2 + i) * (w * 0.16);
        return (
          <mesh key={`k${i}`} position={[cx, bodyH * 0.9, d / 2 + 0.02]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.018, 0.018, 0.03, 16]} />
            <Mat color="#d7d9db" selected={selected} roughness={0.4} metalness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}
