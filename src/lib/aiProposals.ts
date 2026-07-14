import { isHexColor, type Design, type FurnitureItem } from '../types';
import { defaultOptions } from './furnitureOptions';
import { DEFAULT_MATERIAL } from './materials';
import { defaultMaterials } from './furnitureParts';

/**
 * A single furniture piece in an AI proposal. Matches the server's schema
 * (server/schema.ts) but with flat x/z instead of position — converted to a
 * FurnitureItem via {@link toFurnitureItem} before being added to the design.
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
  /** One sentence: why the piece is placed right here (rule/principle). */
  reasoning: string;
}

export interface AiProposal {
  title: string;
  concept: string;
  /** Floor colour for this proposal (#rrggbb); may be malformed — sanitize before use. */
  floorColor: string;
  /** Wall colour for this proposal (#rrggbb); may be malformed — sanitize before use. */
  wallColor: string;
  furniture: AiFurniture[];
}

/** Returns the colour only if it is a valid #rrggbb string, otherwise `undefined`. */
export function validHexColor(c: string | undefined): string | undefined {
  return isHexColor(c) ? c : undefined;
}

export interface ProposalsResponse {
  proposals: AiProposal[];
  /** Remaining validation remarks the model failed to fix. */
  warnings: string[];
}

/** Turns an AI furniture piece into a FurnitureItem (without id — the store sets it). */
export function toFurnitureItem(f: AiFurniture): Omit<FurnitureItem, 'id'> {
  return {
    kind: f.kind,
    name: f.name,
    position: { x: f.x, z: f.z },
    rotationY: f.rotationY,
    size: f.size,
    elevation: f.elevation,
    color: f.color,
    material: DEFAULT_MATERIAL,
    materials: defaultMaterials(f.kind),
    options: defaultOptions(f.kind),
  };
}

/**
 * Asks the AI server (npm run server) for furnishing proposals for the room.
 * Can take a couple of minutes — Claude works out the layout behind the scenes.
 *
 * Pass an {@link AbortSignal} to make the request cancellable (a user "Cancel",
 * or a timeout guard). An abort surfaces as the native `AbortError`, which the
 * caller distinguishes from a real failure by inspecting the signal — so it is
 * rethrown untouched rather than dressed up as a connection error.
 */
export async function fetchProposals(
  design: Design,
  needs: string,
  signal?: AbortSignal,
): Promise<ProposalsResponse> {
  let res: Response;
  try {
    res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ design, needs }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new Error('Could not reach the AI service. Check your connection and try again.');
  }
  const payload = (await res.json().catch(() => null)) as
    | (ProposalsResponse & { error?: string })
    | null;
  if (!res.ok || !payload) {
    throw new Error(payload?.error ?? `The server responded with an error (${res.status}).`);
  }
  return { proposals: payload.proposals ?? [], warnings: payload.warnings ?? [] };
}
