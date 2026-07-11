import * as THREE from 'three';

/**
 * Procedural bump maps that give each finish a tangible surface — a woodgrain, a
 * fabric weave, a carpet pile. They are drawn to an offscreen canvas (no network
 * assets, so they work offline and inside the sandboxed styleguide) and cached, so
 * every piece sharing a finish reuses one texture.
 *
 * A material only gets a texture if it defines one here; the smooth finishes
 * (matte, gloss) return `null` and render as before.
 */

const SIZE = 256;

/** Draws a grayscale height field for a finish (mid-grey = flat), or null if smooth. */
function paint(id: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // A small deterministic PRNG so the pattern is stable across renders/reloads.
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  if (id === 'wood') {
    // Long horizontal grain lines with a little wander.
    for (let y = 0; y < SIZE; y += 2) {
      const shade = 128 + Math.round((rnd() - 0.5) * 70);
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let yy = y;
      ctx.moveTo(0, yy);
      for (let x = 0; x <= SIZE; x += 16) {
        yy += (rnd() - 0.5) * 3;
        ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    return canvas;
  }

  if (id === 'fabric') {
    // Fine crosshatch weave.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    for (let x = 0; x < SIZE; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SIZE);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    for (let y = 0; y < SIZE; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SIZE, y);
      ctx.stroke();
    }
    return canvas;
  }

  if (id === 'carpet') {
    // Dense random speckle — a deep, uneven pile.
    const img = ctx.getImageData(0, 0, SIZE, SIZE);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + Math.floor(rnd() * 130);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  if (id === 'metal') {
    // Faint vertical brushing.
    for (let x = 0; x < SIZE; x += 1) {
      const shade = 128 + Math.round((rnd() - 0.5) * 24);
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SIZE);
      ctx.stroke();
    }
    return canvas;
  }

  return null;
}

// Base canvas texture per finish, and per-(finish, usage) repeat variants.
const base = new Map<string, THREE.CanvasTexture | null>();
const variants = new Map<string, THREE.Texture | null>();

function baseTexture(id: string): THREE.CanvasTexture | null {
  if (!base.has(id)) {
    const canvas = paint(id);
    base.set(id, canvas ? new THREE.CanvasTexture(canvas) : null);
  }
  return base.get(id) ?? null;
}

/**
 * The bump map for a finish, tiled `repeat` times, or `null` if the finish is
 * smooth. `usage` keeps furniture (small, fixed tiling) and large surfaces
 * (floor/walls, tiled by metre) on separate texture instances so their tiling
 * doesn't clobber each other; the underlying image is shared.
 */
export function materialBump(
  id: string,
  usage: 'furniture' | 'surface',
  repeat: number,
): THREE.Texture | null {
  const src = baseTexture(id);
  if (!src) return null;
  const key = `${id}:${usage}`;
  let tex = variants.get(key);
  if (!tex) {
    tex = src.clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    variants.set(key, tex);
  }
  tex.repeat.set(repeat, repeat);
  return tex;
}
