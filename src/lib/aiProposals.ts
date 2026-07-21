import { isHexColor, type Design, type FurnitureItem } from '../types';
import { FURNITURE_CATALOG } from './furnitureCatalog';
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
    color: validHexColor(f.color) ?? FURNITURE_CATALOG[f.kind].defaultColor,
    material: DEFAULT_MATERIAL,
    materials: defaultMaterials(f.kind),
    options: defaultOptions(f.kind),
  };
}

// Fallback request timeout used only when the caller passes no AbortSignal of its own.
// Without it a signal-less caller (e.g. a test, or any programmatic use) would hang
// forever on a stalled server or a dropped connection — the comment above promises "up
// to a minute", not "indefinitely". Sized to match the app's existing generous
// whole-request cap (TIMEOUT_MS in src/store/useAiStore.ts) so it comfortably exceeds a
// normal run — single Claude calls finish in seconds and the directions run
// concurrently — and stays well above the server's own per-call ceiling, so the client
// never gives up on a request the server is still legitimately working on. The main UI
// caller (useAiStore) passes its own signal, so this default only guards signal-less use.
const DEFAULT_TIMEOUT_MS = 4 * 60 * 1000;

/**
 * Asks the AI server (npm run server) for furnishing proposals for the room.
 * Can take up to a minute — Claude works out the layout behind the scenes (the
 * proposals are generated in parallel on the server, so it is not slower for more).
 *
 * Pass an {@link AbortSignal} to make the request cancellable (a user "Cancel",
 * or a timeout guard). An abort surfaces as the native `AbortError`, which the
 * caller distinguishes from a real failure by inspecting the signal — so it is
 * rethrown untouched rather than dressed up as a connection error. When no signal
 * is given, a {@link DEFAULT_TIMEOUT_MS} hang-guard is applied so the request can
 * never stay pending forever.
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
      signal: signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new Error('Could not reach the AI service. Check your connection and try again.');
  }
  const payload = (await res.json().catch(() => null)) as
    | (ProposalsResponse & { error?: string })
    | null;
  if (!res.ok || !payload) {
    throw new Error(payload?.error ?? "Couldn't get suggestions right now — please try again in a moment.");
  }
  return { proposals: payload.proposals ?? [], warnings: payload.warnings ?? [] };
}
