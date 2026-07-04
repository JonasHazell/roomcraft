import { Mat, shade, type FurnitureProps } from './shared';

export function Desk({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const top = Math.min(0.04, h * 0.1);
  const leg = 0.05;
  const inset = Math.min(0.06, w / 4, d / 4);
  const screenW = Math.min(0.6, w * 0.55);
  const screenH = Math.min(0.4, screenW * 0.6);
  return (
    <group>
      {/* skiva */}
      <mesh castShadow position={[0, h - top / 2, 0]}>
        <boxGeometry args={[w, top, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* ben */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            castShadow
            position={[sx * (w / 2 - inset), (h - top) / 2, sz * (d / 2 - inset)]}
          >
            <boxGeometry args={[leg, h - top, leg]} />
            <Mat color={color} selected={selected} />
          </mesh>
        )),
      )}
      {/* skärm mot baksidan (framsidan/sittsidan är lokal +z) */}
      <mesh castShadow position={[0, h + 0.06 + screenH / 2, -d / 2 + 0.12]}>
        <boxGeometry args={[screenW, screenH, 0.03]} />
        <Mat color="#2c2c30" selected={selected} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, h + 0.03, -d / 2 + 0.12]}>
        <boxGeometry args={[0.18, 0.06, 0.12]} />
        <Mat color={shade(color, 0.2)} selected={selected} />
      </mesh>
    </group>
  );
}
