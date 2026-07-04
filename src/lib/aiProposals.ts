import type { Design, FurnitureItem } from '../types';

/**
 * En enskild möbel i ett AI-förslag. Motsvarar serverns schema (server/schema.ts)
 * fast med platt x/z i stället för position — konverteras till FurnitureItem
 * via {@link toFurnitureItem} innan den läggs in i designen.
 */
export interface AiFurniture {
  kind: FurnitureItem['kind'];
  name: string;
  x: number;
  z: number;
  rotationY: number;
  size: FurnitureItem['size'];
  elevation: number;
  color: string;
  /** En mening: varför möbeln står just här (regel/princip). */
  reasoning: string;
}

export interface AiProposal {
  title: string;
  concept: string;
  furniture: AiFurniture[];
}

export interface ProposalsResponse {
  proposals: AiProposal[];
  /** Kvarvarande valideringsanmärkningar som modellen inte lyckades rätta. */
  warnings: string[];
}

/** Gör om en AI-möbel till en FurnitureItem (utan id — storen sätter det). */
export function toFurnitureItem(f: AiFurniture): Omit<FurnitureItem, 'id'> {
  return {
    kind: f.kind,
    name: f.name,
    position: { x: f.x, z: f.z },
    rotationY: f.rotationY,
    size: f.size,
    elevation: f.elevation,
    color: f.color,
  };
}

/**
 * Ber AI-servern (npm run server) om möbleringsförslag för rummet.
 * Kan ta upp mot någon minut — Claude Code kör i terminalen på baksidan.
 */
export async function fetchProposals(design: Design, needs: string): Promise<ProposalsResponse> {
  let res: Response;
  try {
    res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ design, needs }),
    });
  } catch {
    throw new Error(
      'Kunde inte nå AI-servern. Starta den med "npm run server" i en terminal och försök igen.',
    );
  }
  const payload = (await res.json().catch(() => null)) as
    | (ProposalsResponse & { error?: string })
    | null;
  if (!res.ok || !payload) {
    throw new Error(payload?.error ?? `Servern svarade med fel (${res.status}).`);
  }
  return { proposals: payload.proposals ?? [], warnings: payload.warnings ?? [] };
}
