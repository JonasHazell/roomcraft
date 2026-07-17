import type { ValidationReport } from './engine';

export interface FurnitureFinding {
  /** Stable key (rule id + violation index), matching ValidationPanel's keys. */
  key: string;
  /** 1–5 severity, drives the reused `.severity-*` cue. */
  importance: number;
  message: string;
}

/**
 * The validation findings whose `furnitureIds` name a given piece, worst first.
 * Pure so it can be unit-tested without a store; the FurnitureFindings component
 * just wires it to the live report. Findings that don't reference the piece are
 * dropped, so an unflagged piece yields an empty list (the caller renders
 * nothing, avoiding empty-state noise inside the furniture dialog — #253).
 */
export function findingsForFurniture(
  report: ValidationReport | null,
  furnitureId: string,
): FurnitureFinding[] {
  if (!report) return [];
  const findings: FurnitureFinding[] = [];
  for (const r of report.results) {
    if (r.outcome.status !== 'violated') continue;
    r.outcome.violations.forEach((v, i) => {
      if (v.furnitureIds.includes(furnitureId)) {
        findings.push({
          key: `${r.rule.id}:${i}`,
          importance: r.rule.importance,
          message: v.message,
        });
      }
    });
  }
  return findings.sort((a, b) => b.importance - a.importance);
}
