import { z } from 'zod';
import type { Design } from '../types';
import { SCHEMA_VERSION } from '../types';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'ogiltig färgkod (förväntar #rrggbb)');
const meters = (max: number) => z.number().min(0).max(max);

const roomSchema = z.object({
  width: z.number().min(0.5).max(100),
  length: z.number().min(0.5).max(100),
  height: z.number().min(1).max(20),
  floorColor: color,
  wallColor: color,
});

const openingSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['door', 'window']),
  wall: z.enum(['north', 'south', 'east', 'west']),
  offset: meters(100),
  width: z.number().min(0.05).max(100),
  height: z.number().min(0.05).max(20),
  elevation: meters(20),
});

const furnitureSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['bed', 'sofa', 'table', 'chair', 'wardrobe', 'bookshelf', 'rug', 'box']),
  name: z.string().max(100),
  position: z.object({ x: z.number().min(-100).max(100), z: z.number().min(-100).max(100) }),
  rotationY: z.number().min(-100).max(100),
  size: z.object({
    width: z.number().min(0.01).max(100),
    depth: z.number().min(0.01).max(100),
    height: z.number().min(0.01).max(20),
  }),
  color,
});

export const designSchema = z.object({
  schemaVersion: z.number().int(),
  name: z.string().max(200),
  updatedAt: z.string(),
  room: roomSchema,
  openings: z.array(openingSchema).max(200),
  furniture: z.array(furnitureSchema).max(500),
});

function migrate(design: Design): Design {
  switch (design.schemaVersion) {
    case SCHEMA_VERSION:
      return design;
    default:
      throw new Error(
        `Filen har schemaversion ${design.schemaVersion}, men appen stöder version ${SCHEMA_VERSION}.`,
      );
  }
}

export async function importDesign(file: File): Promise<Design> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Filen är inte giltig JSON.');
  }
  const result = designSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '(rot)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Filen kunde inte läsas som en rumsdesign — ${issues}`);
  }
  return migrate(result.data);
}

export function exportDesign(design: Design) {
  const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${design.name.trim() || 'rum'}.room.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Namngivna sparningar i localStorage ----

const SAVES_KEY = 'room-sketcher:saves';

type SavesMap = Record<string, Design>;

function readSaves(): SavesMap {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    return raw ? (JSON.parse(raw) as SavesMap) : {};
  } catch {
    return {};
  }
}

function writeSaves(saves: SavesMap) {
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
}

export interface SaveInfo {
  name: string;
  updatedAt: string;
}

export function listSaves(): SaveInfo[] {
  return Object.values(readSaves())
    .map((d) => ({ name: d.name, updatedAt: d.updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveAs(name: string, design: Design) {
  const saves = readSaves();
  saves[name] = { ...design, name, updatedAt: new Date().toISOString() };
  writeSaves(saves);
}

export function loadSave(name: string): Design | null {
  return readSaves()[name] ?? null;
}

export function deleteSave(name: string) {
  const saves = readSaves();
  delete saves[name];
  writeSaves(saves);
}
