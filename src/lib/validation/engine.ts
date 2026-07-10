import type { Design } from '../../types';
import {
  buildCtx,
  CATEGORY_ORDER,
  IMPORTANCE_WEIGHT,
  RULES,
  type RoomType,
  type RuleCategory,
  type RuleDef,
  type RuleOutcome,
} from './rules';

export interface RuleResult {
  rule: RuleDef;
  outcome: RuleOutcome;
}

export interface CategoryScore {
  category: RuleCategory;
  /** 0–100, null if the category has no applicable rules. */
  score: number | null;
  applicable: number;
  violated: number;
}

export interface ValidationReport {
  designUpdatedAt: string;
  roomTypes: RoomType[];
  results: RuleResult[];
  /** 0–100, null if no rules were applicable. */
  total: number | null;
  byCategory: CategoryScore[];
}

/**
 * Runs the entire rule catalog against the design. Rules whose room type does
 * not match the inferred furnishing are reported as not applicable. The feng
 * shui rules are always part of the catalog. Linked twin pairs are counted once
 * in the total score but reported in both categories, per the rule catalog
 * appendix.
 */
export function runValidation(design: Design): ValidationReport {
  const ctx = buildCtx(design);

  const results: RuleResult[] = [];
  for (const rule of RULES) {
    let outcome: RuleOutcome;
    if (rule.appliesTo && !rule.appliesTo.some((t) => ctx.roomTypes.has(t))) {
      outcome = { status: 'not-applicable' };
    } else {
      outcome = rule.check(ctx);
    }
    results.push({ rule, outcome });
  }

  // Total score: each rule counted once, weighted by the importance scale.
  let wPassed = 0;
  let wApplicable = 0;
  for (const { rule, outcome } of results) {
    if (outcome.status === 'not-applicable') continue;
    const w = IMPORTANCE_WEIGHT[rule.importance];
    wApplicable += w;
    if (outcome.status === 'passed') wPassed += w;
  }

  // Category scores: twin rules contribute to both of their categories.
  const byCategory: CategoryScore[] = CATEGORY_ORDER.map((category) => {
    let cPassed = 0;
    let cApplicable = 0;
    let applicable = 0;
    let violated = 0;
    for (const { rule, outcome } of results) {
      const inCategory =
        rule.category === category || rule.twin?.category === category;
      if (!inCategory || outcome.status === 'not-applicable') continue;
      const w = IMPORTANCE_WEIGHT[rule.importance];
      cApplicable += w;
      applicable += 1;
      if (outcome.status === 'passed') cPassed += w;
      else violated += 1;
    }
    return {
      category,
      score: cApplicable > 0 ? Math.round((100 * cPassed) / cApplicable) : null,
      applicable,
      violated,
    };
  });

  return {
    designUpdatedAt: design.updatedAt,
    roomTypes: [...ctx.roomTypes],
    results,
    total: wApplicable > 0 ? Math.round((100 * wPassed) / wApplicable) : null,
    byCategory,
  };
}
