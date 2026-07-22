import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { makeRoofTexture, makeSidingTexture } from './surfaces';

/**
 * A simplified but recognisable Swedish house facade — mustard board-and-batten
 * siding, white trim, a terracotta gable roof, and a lower porch roof on white
 * posts over the deck. It is only a backdrop for the patio planner: the star is
 * the deck + ground surface in front of it, so the house is modelled with a
 * handful of boxes rather than accurate joinery.
 *
 * Coordinates: the facade sits at z = 0 facing +z (toward the deck and camera),
 * spanning x ∈ [0, length]. The body extends back into −z. `porchWidth` clamps
 * to the facade so the porch roof always sits above the deck.
 */

const BODY_DEPTH = 5;
const WALL_TOP = 5.2; // two storeys
const RIDGE_H = 1.7;
const OVH = 0.35; // roof overhang

const WHITE = '#eef0ee';
const TRIM = '#f3f4f2';
const GLASS = '#5b6b70';
const DOOR = '#d9d6cc';

function Window({ x, y, w = 0.9, h = 1.1 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <group position={[x, y, 0.02]}>
      {/* white frame */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[w + 0.14, h + 0.14, 0.08]} />
        <meshStandardMaterial color={TRIM} roughness={0.7} />
      </mesh>
      {/* glass */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[w, h, 0.04]} />
        <meshStandardMaterial color={GLASS} roughness={0.15} metalness={0.1} envMapIntensity={0.6} />
      </mesh>
      {/* muntin */}
      <mesh position={[0, 0, 0.09]}>
        <boxGeometry args={[0.04, h, 0.02]} />
        <meshStandardMaterial color={TRIM} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function House({ length, porchWidth }: { length: number; porchWidth: number }) {
  const siding = useMemo(() => makeSidingTexture(), []);
  const roofTex = useMemo(() => makeRoofTexture(), []);
  useEffect(
    () => () => {
      siding.dispose();
      roofTex.dispose();
    },
    [siding, roofTex],
  );

  // Board-and-batten runs vertically; tile it by the wall's real size.
  const sidingMat = useMemo(() => {
    const t = siding.clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(2, length / 2.2), WALL_TOP / 2.4);
    return new THREE.MeshStandardMaterial({ map: t, color: '#e7c25f', roughness: 0.85 });
  }, [siding, length]);
  useEffect(() => () => sidingMat.dispose(), [sidingMat]);

  const roofMat = useMemo(() => {
    const t = roofTex.clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(3, length / 1.6), 2.2);
    return new THREE.MeshStandardMaterial({ map: t, color: '#b9563a', roughness: 0.8 });
  }, [roofTex, length]);
  useEffect(() => () => roofMat.dispose(), [roofMat]);

  // Gable roof as an extruded triangle. Local shape axes: x = along building
  // depth, y = up; extruded along the building length. Rotating +90° about Y
  // maps the extrude axis onto world +X and the depth axis onto world −Z, so
  // the front eave lands at +z and the body runs back into −z (reasoned in the
  // patio scene notes). Material groups: 0 = gable-end caps (siding), 1 = the
  // two slopes (tile).
  const roofGeo = useMemo(() => {
    const depthSpan = BODY_DEPTH + 2 * OVH;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(depthSpan, 0);
    shape.lineTo(depthSpan / 2, RIDGE_H);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: length + 2 * OVH,
      bevelEnabled: false,
    });
    return geo;
  }, [length]);
  useEffect(() => () => roofGeo.dispose(), [roofGeo]);

  const posts = useMemo(() => {
    // White porch posts at the front edge of the porch roof.
    const xs = [0.35, porchWidth - 0.35];
    return xs;
  }, [porchWidth]);

  const porchDepth = 2.6;
  const porchHigh = 3.0;
  const porchLow = 2.55;
  const porchAngle = Math.atan2(porchHigh - porchLow, porchDepth);
  const porchSlab = Math.hypot(porchDepth, porchHigh - porchLow);

  return (
    <group>
      {/* Body */}
      <mesh position={[length / 2, WALL_TOP / 2, -BODY_DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[length, WALL_TOP, BODY_DEPTH]} />
        <primitive object={sidingMat} attach="material" />
      </mesh>

      {/* Gable roof */}
      <mesh
        geometry={roofGeo}
        rotation-y={Math.PI / 2}
        position={[-OVH, WALL_TOP, OVH]}
        material={[sidingMat, roofMat]}
        castShadow
        receiveShadow
      />

      {/* Corner trim boards */}
      {[0, length].map((x) => (
        <mesh key={x} position={[x, WALL_TOP / 2, 0.04]} castShadow>
          <boxGeometry args={[0.16, WALL_TOP, 0.1]} />
          <meshStandardMaterial color={TRIM} roughness={0.7} />
        </mesh>
      ))}

      {/* Door under the porch, near the left */}
      <group position={[Math.min(1.4, porchWidth / 2), 0, 0.03]}>
        <mesh position={[0, 1.05, 0.04]} castShadow>
          <boxGeometry args={[0.98, 2.1, 0.1]} />
          <meshStandardMaterial color={TRIM} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.05, 0.08]}>
          <boxGeometry args={[0.8, 1.95, 0.06]} />
          <meshStandardMaterial color={DOOR} roughness={0.6} />
        </mesh>
        {/* slim vision strip + handle */}
        <mesh position={[0.18, 1.15, 0.12]}>
          <boxGeometry args={[0.08, 1.2, 0.02]} />
          <meshStandardMaterial color={GLASS} roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh position={[-0.28, 1.0, 0.13]}>
          <boxGeometry args={[0.04, 0.22, 0.04]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.4} metalness={0.4} />
        </mesh>
      </group>

      {/* Windows — ground floor (right of door) + two upper floor */}
      <Window x={Math.min(porchWidth + 1.3, length - 1)} y={1.4} />
      <Window x={length * 0.32} y={3.7} w={1.0} h={1.0} />
      <Window x={length * 0.72} y={3.7} w={1.0} h={1.0} />

      {/* Porch roof (mono-pitch) over the deck, white underside */}
      <group>
        <mesh
          position={[porchWidth / 2, (porchHigh + porchLow) / 2 + 0.06, porchDepth / 2]}
          rotation-x={-porchAngle}
          castShadow
        >
          <boxGeometry args={[porchWidth + 0.3, 0.12, porchSlab]} />
          <meshStandardMaterial color={roofMat.color} map={roofMat.map} roughness={0.8} />
        </mesh>
        {/* white fascia at the porch eave */}
        <mesh position={[porchWidth / 2, porchLow + 0.02, porchDepth + 0.02]} castShadow>
          <boxGeometry args={[porchWidth + 0.32, 0.16, 0.08]} />
          <meshStandardMaterial color={WHITE} roughness={0.7} />
        </mesh>
        {/* posts */}
        {posts.map((x) => (
          <mesh key={x} position={[x, porchLow / 2 + 0.16, porchDepth]} castShadow>
            <boxGeometry args={[0.12, porchLow + 0.3, 0.12]} />
            <meshStandardMaterial color={WHITE} roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* White downspout at the right corner */}
      <mesh position={[length - 0.1, WALL_TOP / 2, 0.12]}>
        <cylinderGeometry args={[0.05, 0.05, WALL_TOP, 10]} />
        <meshStandardMaterial color={WHITE} roughness={0.6} />
      </mesh>
    </group>
  );
}
