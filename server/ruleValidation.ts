import type { Design, FurnitureItem } from '../src/types.ts';
import { runValidation } from '../src/lib/validation/engine.ts';
import type { ResolvedFurniture, ResolvedProposals } from './schema.ts';
import { validateProposals } from './validate.ts';

/**
 * Importance at/above which a rule violation is a hard failure: it keeps the
 * repair loop running and, if it survives, is returned as a warning. Safety (5)
 * and accessibility (4) rules block; ergonomics and feng-shui (≤ 3) do not.
 */
export const BLOCKING_IMPORTANCE = 4;

/**
 * Importance at/above which a finding is worth asking the model to fix. Level-3
 * ergonomics/placement issues are sent as "should improve"; cosmetic rules
 * (≤ 2) are never sent — we don't spend a repair round on them.
 */
export const REPAIR_IMPORTANCE = 3;

export interface Finding {
  /** Proposal the finding belongs to; '' for the mechanical checks (message is prefixed). */
  proposalTitle: string;
  message: string;
  /** Rule importance 1–5; the mechanical hard checks count as 5. */
  importance: number;
  /** True when {@link importance} ≥ {@link BLOCKING_IMPORTANCE}. */
  blocking: boolean;
}

/** A resolved AI piece as the client-side rule engine expects it. */
function toItem(f: ResolvedFurniture, i: number): FurnitureItem {
  return {
    id: `ai-${i}`,
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
 * Every finding for a resolved proposal set: the mechanical hard checks
 * (validate.ts — bounds, door swing, overlap, reachability; always blocking)
 * plus the full client rule catalogue (src/lib/validation — safety, access,
 * ergonomics, feng shui), each tagged with its rule's importance. The rule
 * engine runs per proposal against a synthetic design that keeps the real room
 * shape but swaps in that proposal's furniture. Duplicate messages collapse to
 * their highest importance; the result is sorted most-important first.
 */
export function collectFindings(data: ResolvedProposals, design: Design): Finding[] {
  const byMessage = new Map<string, Finding>();
  const add = (proposalTitle: string, message: string, importance: number) => {
    const existing = byMessage.get(message);
    if (existing && existing.importance >= importance) return;
    byMessage.set(message, {
      proposalTitle,
      message,
      importance,
      blocking: importance >= BLOCKING_IMPORTANCE,
    });
  };

  // Mechanical hard requirements. These already carry a `Proposal "title": …` prefix.
  for (const message of validateProposals(data, design)) add('', message, 5);

  // Rich rule catalogue.
  for (const p of data.proposals) {
    const synthetic: Design = { ...design, furniture: p.furniture.map(toItem) };
    const report = runValidation(synthetic);
    for (const { rule, outcome } of report.results) {
      if (outcome.status !== 'violated') continue;
      for (const v of outcome.violations) {
        add(p.title, `Proposal "${p.title}": ${v.message}`, rule.importance);
      }
    }
  }

  return [...byMessage.values()].sort((a, b) => b.importance - a.importance);
}

/** How many findings block (safety/accessibility/mechanical). */
export function blockingCount(findings: Finding[]): number {
  return findings.reduce((n, f) => n + (f.blocking ? 1 : 0), 0);
}

/** Findings worth asking the model to repair (importance ≥ {@link REPAIR_IMPORTANCE}). */
export function repairFindings(findings: Finding[]): Finding[] {
  return findings.filter((f) => f.importance >= REPAIR_IMPORTANCE);
}
