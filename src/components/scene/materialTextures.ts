import * as THREE from 'three';

/**
 * Procedural material textures — a colour pattern (`map`) and a matching relief
 * (`bump`) per finish, drawn to an offscreen canvas (no network assets, so they
 * work offline and inside the sandboxed styleguide) and cached, so every piece
 * sharing a finish reuses one texture.
 *
 * Two kinds of finish use these:
 * - the soft finishes (wood, fabric, carpet, metal) only add relief — a woodgrain,
 *   a weave, a pile, brushing — over the piece's flat colour;
 * - the patterned finishes (concrete, tile, stone, marble) add both a greyscale
 *   colour pattern that the piece's colour tints and a matching relief.
 *
 * A finish with neither returns `null` from both lookups and renders as before.
 */

const SIZE = 256;

interface Built {
  map: HTMLCanvasElement | null;
  bump: HTMLCanvasElement | null;
}

function canvas(): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  return ctx ? { c, ctx } : null;
}

/** Deterministic PRNG so a finish's pattern is stable across renders and reloads. */
function prng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function fillNoise(ctx: CanvasRenderingContext2D, lo: number, span: number, rnd: () => number) {
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = lo + Math.floor(rnd() * span);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Draws every finish's (map, bump) canvases, or nulls where it has none. */
function build(id: string): Built {
  const out: Built = { map: null, bump: null };

  // ---- Patterned wood: planks with grain (colour + relief) ----
  if (id === 'wood') {
    const m = canvas();
    const b = canvas();
    if (m && b) {
      const rnd = prng(11);
      const planks = 4;
      const ph = SIZE / planks; // plank height (grain runs along the plank)
      b.ctx.fillStyle = '#808080';
      b.ctx.fillRect(0, 0, SIZE, SIZE);

      // Traces one wavy grain line across the full width (so it tiles left↔right),
      // on both the colour map and the relief.
      const grainLine = (y: number, waves: number, amp: number, shade: number, alpha: number) => {
        const path = (ctx: CanvasRenderingContext2D) => {
          ctx.beginPath();
          for (let x = 0; x <= SIZE; x += 8) {
            const yy = y + Math.sin((x / SIZE) * Math.PI * 2 * waves) * amp;
            if (x === 0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        };
        m.ctx.strokeStyle = `rgba(${shade},${shade},${shade},${alpha})`;
        m.ctx.lineWidth = 0.6 + rnd() * 1.1;
        path(m.ctx);
        b.ctx.strokeStyle = `rgba(70,70,70,${alpha * 0.7})`;
        b.ctx.lineWidth = m.ctx.lineWidth;
        path(b.ctx);
      };

      for (let p = 0; p < planks; p++) {
        const y0 = p * ph;
        const base = 200 + Math.round((rnd() - 0.5) * 30); // per-plank tone
        m.ctx.fillStyle = `rgb(${base},${base},${base})`;
        m.ctx.fillRect(0, y0, SIZE, ph);
        // Grain: many faint wavy lines following the plank.
        const waves = 1 + Math.floor(rnd() * 2);
        for (let i = 0; i < 24; i++) {
          const y = y0 + rnd() * ph;
          const shade = base - 26 - Math.floor(rnd() * 48);
          grainLine(y, waves, 1 + rnd() * 2.5, Math.max(40, shade), 0.1 + rnd() * 0.22);
        }
        // An occasional knot.
        if (rnd() < 0.35) {
          const kx = rnd() * SIZE;
          const ky = y0 + ph * (0.3 + rnd() * 0.4);
          for (let r = 2; r < 8; r += 2) {
            m.ctx.strokeStyle = `rgba(70,55,35,0.28)`;
            m.ctx.lineWidth = 1;
            m.ctx.beginPath();
            m.ctx.ellipse(kx, ky, r, r * 1.6, 0, 0, Math.PI * 2);
            m.ctx.stroke();
          }
        }
        // Plank seam (recessed, slightly darker) at the top edge — tiles vertically.
        m.ctx.strokeStyle = 'rgba(70,55,38,0.5)';
        m.ctx.lineWidth = 2;
        m.ctx.beginPath();
        m.ctx.moveTo(0, y0);
        m.ctx.lineTo(SIZE, y0);
        m.ctx.stroke();
        b.ctx.strokeStyle = '#3c3c3c';
        b.ctx.lineWidth = 3;
        b.ctx.beginPath();
        b.ctx.moveTo(0, y0);
        b.ctx.lineTo(SIZE, y0);
        b.ctx.stroke();
      }
      out.map = m.c;
      out.bump = b.c;
    }
    return out;
  }

  // ---- Patterned fabric: a woven textile (colour + relief) ----
  if (id === 'fabric') {
    const m = canvas();
    const b = canvas();
    if (m && b) {
      const rnd = prng(83);
      const cell = 7; // one woven thread crossing
      // Colour: a light near-white weave so the piece's colour still dominates and
      // the threads only modulate it. Gaps between cells read as the weave shadow.
      m.ctx.fillStyle = 'rgb(200,200,200)';
      m.ctx.fillRect(0, 0, SIZE, SIZE);
      b.ctx.fillStyle = '#808080';
      b.ctx.fillRect(0, 0, SIZE, SIZE);
      for (let y = 0; y < SIZE; y += cell) {
        for (let x = 0; x < SIZE; x += cell) {
          // Basket weave: alternate which thread sits "over" for a woven look.
          const over = ((x / cell + y / cell) & 1) === 0;
          const v = (over ? 240 : 202) + Math.round((rnd() - 0.5) * 14);
          m.ctx.fillStyle = `rgb(${v},${v},${v})`;
          m.ctx.fillRect(x, y, cell - 1, cell - 1); // 1px gap = weave shadow
          const bv = over ? 175 : 120;
          b.ctx.fillStyle = `rgb(${bv},${bv},${bv})`;
          b.ctx.fillRect(x, y, cell - 1, cell - 1);
        }
      }
      out.map = m.c;
      out.bump = b.c;
    }
    return out;
  }
  // ---- Patterned carpet: a heathered pile (colour + relief) ----
  if (id === 'carpet') {
    const m = canvas();
    const b = canvas();
    if (m && b) {
      const rnd = prng(97);
      // Colour: heathered flecks over a light base, so it reads as carpet pile but
      // keeps the piece's colour bright.
      m.ctx.fillStyle = 'rgb(214,214,214)';
      m.ctx.fillRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < 4200; i++) {
        const x = rnd() * SIZE;
        const y = rnd() * SIZE;
        const v = 210 + Math.round((rnd() - 0.5) * 88);
        m.ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
        m.ctx.fillRect(x, y, 1.5 + rnd() * 2.5, 1.5 + rnd() * 2.5);
      }
      // Faint larger-scale mottling for a lived-in look.
      for (let i = 0; i < 90; i++) {
        const x = rnd() * SIZE;
        const y = rnd() * SIZE;
        const v = 214 + Math.round((rnd() - 0.5) * 26);
        m.ctx.fillStyle = `rgba(${v},${v},${v},0.07)`;
        m.ctx.beginPath();
        m.ctx.arc(x, y, 8 + rnd() * 22, 0, Math.PI * 2);
        m.ctx.fill();
      }
      fillNoise(b.ctx, 90, 130, prng(23));
      out.map = m.c;
      out.bump = b.c;
    }
    return out;
  }
  if (id === 'metal') {
    const b = canvas();
    if (b) {
      const rnd = prng(31);
      for (let x = 0; x < SIZE; x += 1) {
        const s = 128 + Math.round((rnd() - 0.5) * 24);
        b.ctx.strokeStyle = `rgb(${s},${s},${s})`;
        b.ctx.beginPath();
        b.ctx.moveTo(x, 0);
        b.ctx.lineTo(x, SIZE);
        b.ctx.stroke();
      }
      out.bump = b.c;
    }
    return out;
  }

  // ---- Patterned finishes (colour + relief) ----
  if (id === 'concrete') {
    const m = canvas();
    const b = canvas();
    if (m && b) {
      const rnd = prng(41);
      m.ctx.fillStyle = '#c9c9c9';
      m.ctx.fillRect(0, 0, SIZE, SIZE);
      // Soft mottling: many faint blotches in a light grey band, so tinting stays clean.
      for (let i = 0; i < 260; i++) {
        const x = rnd() * SIZE;
        const y = rnd() * SIZE;
        const r = 6 + rnd() * 26;
        const v = 190 + Math.floor((rnd() - 0.5) * 44);
        m.ctx.fillStyle = `rgba(${v},${v},${v},0.10)`;
        m.ctx.beginPath();
        m.ctx.arc(x, y, r, 0, Math.PI * 2);
        m.ctx.fill();
      }
      out.map = m.c;
      fillNoise(b.ctx, 118, 20, prng(42));
      out.bump = b.c;
    }
    return out;
  }
  if (id === 'tile') {
    const m = canvas();
    const b = canvas();
    if (m && b) {
      const rnd = prng(51);
      const cells = 2; // 2×2 tiles per texture
      const cell = SIZE / cells;
      const grout = 8;
      // Colour: grout background, light tile squares inset so repeats form
      // continuous grout lines.
      m.ctx.fillStyle = '#a9a9a9';
      m.ctx.fillRect(0, 0, SIZE, SIZE);
      // Relief: grout recessed (dark), tiles raised (light).
      b.ctx.fillStyle = '#5c5c5c';
      b.ctx.fillRect(0, 0, SIZE, SIZE);
      for (let cy = 0; cy < cells; cy++) {
        for (let cx = 0; cx < cells; cx++) {
          const x = cx * cell + grout / 2;
          const y = cy * cell + grout / 2;
          const s = cell - grout;
          const tint = 238 + Math.floor((rnd() - 0.5) * 18);
          m.ctx.fillStyle = `rgb(${tint},${tint},${tint})`;
          m.ctx.fillRect(x, y, s, s);
          b.ctx.fillStyle = '#c8c8c8';
          b.ctx.fillRect(x, y, s, s);
        }
      }
      out.map = m.c;
      out.bump = b.c;
    }
    return out;
  }
  if (id === 'stone') {
    const m = canvas();
    const b = canvas();
    if (m && b) {
      const rnd = prng(61);
      const rows = 4;
      const rh = SIZE / rows; // 64
      const grout = 6;
      m.ctx.fillStyle = '#8f8f8f'; // grout
      m.ctx.fillRect(0, 0, SIZE, SIZE);
      b.ctx.fillStyle = '#4a4a4a';
      b.ctx.fillRect(0, 0, SIZE, SIZE);
      for (let r = 0; r < rows; r++) {
        const y = r * rh + grout / 2;
        const h = rh - grout;
        const offset = r % 2 === 0 ? 0 : -SIZE / 4; // half-block running bond
        // Blocks of width 128 (tiles across 256), drawn twice to cover the offset wrap.
        for (let k = -1; k < 3; k++) {
          const x = offset + k * (SIZE / 2) + grout / 2;
          const w = SIZE / 2 - grout;
          const v = 176 + Math.floor((rnd() - 0.5) * 46);
          m.ctx.fillStyle = `rgb(${v},${v},${v})`;
          m.ctx.fillRect(x, y, w, h);
          const bv = 150 + Math.floor((rnd() - 0.5) * 60);
          b.ctx.fillStyle = `rgb(${bv},${bv},${bv})`;
          b.ctx.fillRect(x, y, w, h);
        }
      }
      out.map = m.c;
      out.bump = b.c;
    }
    return out;
  }
  if (id === 'marble') {
    const m = canvas();
    const b = canvas();
    if (m && b) {
      const rnd = prng(71);
      m.ctx.fillStyle = '#eeeeee';
      m.ctx.fillRect(0, 0, SIZE, SIZE);
      b.ctx.fillStyle = '#808080';
      b.ctx.fillRect(0, 0, SIZE, SIZE);
      // Meandering veins across the slab.
      const veins = 7;
      for (let v = 0; v < veins; v++) {
        const dark = rnd() < 0.4;
        m.ctx.strokeStyle = dark ? 'rgba(150,150,150,0.5)' : 'rgba(190,190,190,0.55)';
        m.ctx.lineWidth = 1 + rnd() * 2;
        b.ctx.strokeStyle = 'rgba(120,120,120,0.6)';
        b.ctx.lineWidth = m.ctx.lineWidth;
        let x = rnd() * SIZE;
        let y = -10;
        const drift = (rnd() - 0.5) * 2;
        m.ctx.beginPath();
        b.ctx.beginPath();
        m.ctx.moveTo(x, y);
        b.ctx.moveTo(x, y);
        while (y < SIZE + 10) {
          x += drift * 6 + (rnd() - 0.5) * 14;
          y += 8 + rnd() * 10;
          m.ctx.lineTo(x, y);
          b.ctx.lineTo(x, y);
        }
        m.ctx.stroke();
        b.ctx.stroke();
      }
      out.map = m.c;
      out.bump = b.c;
    }
    return out;
  }

  return out;
}

// Base canvases per finish, and per-(finish, kind, usage) tiled texture variants.
const built = new Map<string, Built>();
const variants = new Map<string, THREE.Texture | null>();

function baseFor(id: string): Built {
  let b = built.get(id);
  if (!b) {
    b = build(id);
    built.set(id, b);
  }
  return b;
}

function tiled(
  source: HTMLCanvasElement | null,
  id: string,
  kind: 'map' | 'bump',
  usage: 'furniture' | 'surface',
  repeat: number,
  srgb: boolean,
): THREE.Texture | null {
  if (!source) return null;
  const key = `${id}:${kind}:${usage}`;
  let tex = variants.get(key);
  if (!tex) {
    tex = new THREE.CanvasTexture(source);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    variants.set(key, tex);
  }
  tex.repeat.set(repeat, repeat);
  return tex;
}

/** The colour pattern (albedo) for a finish, tiled `repeat` times, or `null`. */
export function materialMap(
  id: string,
  usage: 'furniture' | 'surface',
  repeat: number,
): THREE.Texture | null {
  return tiled(baseFor(id).map, id, 'map', usage, repeat, true);
}

/**
 * The bump map (surface relief) for a finish, tiled `repeat` times, or `null`.
 * `usage` keeps furniture (small, fixed tiling) and large surfaces (floor/walls,
 * tiled by metre) on separate texture instances so their tiling doesn't clobber
 * each other; the underlying image is shared.
 */
export function materialBump(
  id: string,
  usage: 'furniture' | 'surface',
  repeat: number,
): THREE.Texture | null {
  return tiled(baseFor(id).bump, id, 'bump', usage, repeat, false);
}
