import * as THREE from 'three';

/**
 * Procedural ground-surface and decking textures for the patio planner.
 *
 * Every texture is drawn to an off-screen canvas that is *seamlessly tileable*
 * (all drawing wraps at the tile edge) and represents a fixed real-world size
 * (`tileMeters`). The scene sets `texture.repeat` from the surface's real area
 * divided by that size, so a paver reads the same physical size whether the
 * yard is small or large. Kept fully procedural (no image assets) so the whole
 * feature stays self-contained, exactly like the gradient environment map the
 * main scene builds in Scene.tsx.
 */

const TILE_PX = 512;

/** A tiny deterministic PRNG so a texture looks the same on every render/run
 *  (three would otherwise re-seed nothing — but we avoid Math.random for
 *  stability and so the visual never flickers between mounts). */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_PX;
  canvas.height = TILE_PX;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

/** Scatter soft speckles, wrapping across the tile edge so it stays seamless. */
function speckle(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  count: number,
  colors: string[],
  rMin: number,
  rMax: number,
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const x = rng() * TILE_PX;
    const y = rng() * TILE_PX;
    const r = rMin + rng() * (rMax - rMin);
    ctx.fillStyle = colors[(rng() * colors.length) | 0];
    // Draw the speckle plus its wrapped copies so nothing is clipped at a seam.
    for (const dx of [-TILE_PX, 0, TILE_PX]) {
      for (const dy of [-TILE_PX, 0, TILE_PX]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function fill(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
}

/** Concrete square pavers laid in a grid with grout joints. */
function drawConcretePavers(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  const rng = makeRng(11);
  const cells = 2; // two slabs across the tile
  const cell = TILE_PX / cells;
  const joint = 7;
  fill(ctx, '#8f8b84'); // grout / sand joint
  for (let gx = 0; gx < cells; gx++) {
    for (let gy = 0; gy < cells; gy++) {
      const x = gx * cell + joint / 2;
      const y = gy * cell + joint / 2;
      const s = cell - joint;
      const shade = 205 + ((rng() * 22) | 0);
      ctx.fillStyle = `rgb(${shade - 6}, ${shade - 8}, ${shade - 12})`;
      ctx.fillRect(x, y, s, s);
      // subtle mottling per slab
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, s, s);
      ctx.clip();
      speckle(ctx, rng, 90, ['#c9c6bf', '#b3afa7', '#d6d3cc'], 1, 3.2, 0.25);
      ctx.restore();
      // bevelled edge highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
    }
  }
  return canvas;
}

/** Large granite flags — a running-bond of big rectangular slabs. */
function drawGraniteFlags(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  const rng = makeRng(23);
  fill(ctx, '#6f6d6b'); // dark joint
  const rows = 2;
  const rowH = TILE_PX / rows;
  const joint = 8;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : -TILE_PX / 4;
    for (let c = -1; c < 3; c++) {
      const x = c * (TILE_PX / 2) + offset + joint / 2;
      const y = r * rowH + joint / 2;
      const w = TILE_PX / 2 - joint;
      const h = rowH - joint;
      const g = 120 + ((rng() * 34) | 0);
      ctx.fillStyle = `rgb(${g}, ${g}, ${g + 4})`;
      ctx.fillRect(x, y, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      speckle(ctx, rng, 140, ['#8a8a8c', '#5f5f61', '#a2a2a4', '#4d4d4f'], 0.8, 2.4, 0.4);
      ctx.restore();
    }
  }
  return canvas;
}

/** Small stone setts / cobbles (smågatsten) — packed rounded blocks. */
function drawCobbles(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  const rng = makeRng(37);
  fill(ctx, '#4b4743'); // sand between stones
  const cells = 6;
  const cell = TILE_PX / cells;
  for (let gx = 0; gx < cells; gx++) {
    for (let gy = 0; gy < cells; gy++) {
      const jitter = cell * 0.12;
      const cx = gx * cell + cell / 2 + (rng() - 0.5) * jitter;
      const cy = gy * cell + cell / 2 + (rng() - 0.5) * jitter;
      const rad = cell * (0.36 + rng() * 0.08);
      const base = 96 + ((rng() * 70) | 0);
      for (const dx of [-TILE_PX, 0, TILE_PX]) {
        for (const dy of [-TILE_PX, 0, TILE_PX]) {
          const grad = ctx.createRadialGradient(
            cx + dx - rad * 0.3,
            cy + dy - rad * 0.3,
            rad * 0.2,
            cx + dx,
            cy + dy,
            rad,
          );
          grad.addColorStop(0, `rgb(${base + 40}, ${base + 36}, ${base + 30})`);
          grad.addColorStop(1, `rgb(${base - 20}, ${base - 22}, ${base - 26})`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(cx + dx, cy + dy, rad, rad * 0.9, rng() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  return canvas;
}

/** Clay brick pavers (marktegel) in a herringbone-ish stack bond. */
function drawBrick(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  const rng = makeRng(51);
  fill(ctx, '#6d5142'); // mortar/sand
  const rows = 8;
  const rowH = TILE_PX / rows;
  const brickW = TILE_PX / 4;
  const joint = 4;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (brickW / 2);
    for (let c = -1; c < 5; c++) {
      const x = c * brickW + offset + joint / 2;
      const y = r * rowH + joint / 2;
      const w = brickW - joint;
      const h = rowH - joint;
      const rr = 150 + ((rng() * 45) | 0);
      ctx.fillStyle = `rgb(${rr}, ${rr * 0.55 + 20}, ${rr * 0.4 + 14})`;
      ctx.fillRect(x, y, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      speckle(ctx, rng, 40, ['#a5613f', '#7d3f2a', '#c98a5f'], 0.8, 2, 0.3);
      ctx.restore();
    }
  }
  return canvas;
}

/** Loose gravel (grus) — dense small pebbles. */
function drawGravel(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  const rng = makeRng(67);
  fill(ctx, '#a79f8f');
  speckle(ctx, rng, 2600, ['#8f8672', '#bcb4a1', '#6f6654', '#d2cbb8', '#9a927e'], 1.4, 3.6, 0.9);
  speckle(ctx, rng, 1200, ['#7a7160', '#c7bfad'], 1, 2.4, 0.7);
  return canvas;
}

/** Mown grass (gräs). */
function drawGrass(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  const rng = makeRng(83);
  fill(ctx, '#6f8f49');
  speckle(ctx, rng, 3000, ['#5f8038', '#7fa055', '#547031', '#8fb066'], 1.2, 3, 0.85);
  return canvas;
}

/** Wooden decking boards. `dir` is the board run direction across the tile. */
function drawDecking(base: string, grain: string, gap: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  const rng = makeRng(97);
  fill(ctx, base);
  const boards = 5;
  const boardH = TILE_PX / boards;
  for (let b = 0; b < boards; b++) {
    const y = b * boardH;
    // board face
    const shadeShift = (rng() - 0.5) * 18;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, TILE_PX, boardH);
    ctx.clip();
    ctx.fillStyle = base;
    ctx.fillRect(0, y, TILE_PX, boardH);
    // longitudinal grain streaks
    ctx.strokeStyle = grain;
    ctx.globalAlpha = 0.18;
    for (let g = 0; g < 22; g++) {
      const gy = y + rng() * boardH;
      ctx.lineWidth = 0.6 + rng() * 1.3;
      ctx.beginPath();
      ctx.moveTo(0, gy + shadeShift * 0.02);
      ctx.bezierCurveTo(
        TILE_PX * 0.3,
        gy + (rng() - 0.5) * 4,
        TILE_PX * 0.6,
        gy + (rng() - 0.5) * 4,
        TILE_PX,
        gy,
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // shadow gap between boards (top edge of each board)
    ctx.fillStyle = gap;
    ctx.fillRect(0, y, TILE_PX, 3);
    // fastening screws near the ends
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (const sx of [TILE_PX * 0.08, TILE_PX * 0.92]) {
      ctx.beginPath();
      ctx.arc(sx, y + boardH / 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return canvas;
}

/** Yellow board-and-batten siding for the house walls. */
export function makeSidingTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  fill(ctx, '#d7ad4b');
  // vertical battens
  const battens = 8;
  const step = TILE_PX / battens;
  for (let i = 0; i < battens; i++) {
    const x = i * step;
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(x - 1, 0, 2, TILE_PX);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 3, 0, 3, TILE_PX);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Terracotta roof tiles — repeating rounded rows. */
export function makeRoofTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  const rng = makeRng(5);
  fill(ctx, '#a24a2f');
  const rows = 6;
  const rowH = TILE_PX / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const grad = ctx.createLinearGradient(0, y, 0, y + rowH);
    grad.addColorStop(0, '#7c3620');
    grad.addColorStop(0.35, '#b5583a');
    grad.addColorStop(1, '#8f4026');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, TILE_PX, rowH - 2);
    // vertical pan lines
    const pans = 9;
    for (let p = 0; p <= pans; p++) {
      const x = (p / pans) * TILE_PX + (r % 2) * (TILE_PX / pans / 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
    speckle(ctx, rng, 30, ['#c56a49', '#8a4028'], 1, 2, 0.2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export type SurfaceId =
  | 'concrete'
  | 'granite'
  | 'cobbles'
  | 'brick'
  | 'gravel'
  | 'grass';

export interface SurfaceSpec {
  id: SurfaceId;
  /** Swedish label shown in the picker. */
  label: string;
  /** English helper for accessibility / tests. */
  aria: string;
  /** Flat swatch colour for the control chip. */
  swatch: string;
  /** Real-world size the tile represents, in metres. */
  tileMeters: number;
  roughness: number;
  draw: () => HTMLCanvasElement;
}

export const SURFACES: SurfaceSpec[] = [
  {
    id: 'concrete',
    label: 'Betongplattor',
    aria: 'Concrete paving slabs',
    swatch: '#c6c3bc',
    tileMeters: 0.9,
    roughness: 0.95,
    draw: drawConcretePavers,
  },
  {
    id: 'granite',
    label: 'Granithällar',
    aria: 'Granite flagstones',
    swatch: '#8a8a8c',
    tileMeters: 1.4,
    roughness: 0.8,
    draw: drawGraniteFlags,
  },
  {
    id: 'cobbles',
    label: 'Smågatsten',
    aria: 'Small stone setts',
    swatch: '#6f6a63',
    tileMeters: 0.7,
    roughness: 0.9,
    draw: drawCobbles,
  },
  {
    id: 'brick',
    label: 'Marktegel',
    aria: 'Clay brick pavers',
    swatch: '#a5613f',
    tileMeters: 0.9,
    roughness: 0.9,
    draw: drawBrick,
  },
  {
    id: 'gravel',
    label: 'Grus',
    aria: 'Loose gravel',
    swatch: '#a79f8f',
    tileMeters: 0.6,
    roughness: 1,
    draw: drawGravel,
  },
  {
    id: 'grass',
    label: 'Gräs',
    aria: 'Grass lawn',
    swatch: '#6f8f49',
    tileMeters: 1.2,
    roughness: 1,
    draw: drawGrass,
  },
];

export type DeckMaterialId = 'pine' | 'thermo' | 'composite';

export interface DeckSpec {
  id: DeckMaterialId;
  label: string;
  aria: string;
  swatch: string;
  tileMeters: number;
  roughness: number;
  draw: () => HTMLCanvasElement;
}

export const DECK_MATERIALS: DeckSpec[] = [
  {
    id: 'pine',
    label: 'Furu',
    aria: 'Pine decking',
    swatch: '#c79a5e',
    tileMeters: 1.1,
    roughness: 0.75,
    draw: () => drawDecking('#c79a5e', '#8a6636', 'rgba(60,40,18,0.5)'),
  },
  {
    id: 'thermo',
    label: 'Termotrall',
    aria: 'Thermowood decking',
    swatch: '#7c5433',
    tileMeters: 1.1,
    roughness: 0.7,
    draw: () => drawDecking('#7c5433', '#4d3018', 'rgba(30,18,8,0.6)'),
  },
  {
    id: 'composite',
    label: 'Komposit',
    aria: 'Grey composite decking',
    swatch: '#8d8880',
    tileMeters: 1.1,
    roughness: 0.55,
    draw: () => drawDecking('#8d8880', '#5f5b54', 'rgba(30,30,30,0.5)'),
  },
];

/**
 * Build a repeating THREE texture from a surface/deck spec. The caller sets
 * `.repeat` from the mesh's real size ÷ `tileMeters`. Cached per id so switching
 * back and forth never rebuilds the same canvas.
 */
const cache = new Map<string, THREE.CanvasTexture>();

export function surfaceTexture(spec: { id: string; draw: () => HTMLCanvasElement }): THREE.CanvasTexture {
  const hit = cache.get(spec.id);
  if (hit) return hit;
  const tex = new THREE.CanvasTexture(spec.draw());
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(spec.id, tex);
  return tex;
}
