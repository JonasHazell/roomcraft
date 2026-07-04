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
  /** 0–100, null om inga tillämpliga regler i kategorin. */
  score: number | null;
  applicable: number;
  violated: number;
}

export interface ValidationReport {
  designUpdatedAt: string;
  fengShui: boolean;
  roomTypes: RoomType[];
  results: RuleResult[];
  /** 0–100, null om inga regler var tillämpliga. */
  total: number | null;
  byCategory: CategoryScore[];
}

/**
 * Kör hela regelkatalogen mot designen. Regler vars rumstyp inte matchar den
 * härledda möbleringen redovisas som ej tillämpliga; med feng shui avslaget
 * utesluts FEN-reglerna helt (och tvillingregler räknas bara i sin
 * primärkategori). Länkade tvillingpar räknas en gång i totalbetyget men
 * redovisas i båda kategorierna, enligt regelkatalogens bilaga.
 */
export function runValidation(design: Design, fengShui: boolean): ValidationReport {
  const ctx = buildCtx(design);

  const results: RuleResult[] = [];
  for (const rule of RULES) {
    if (!fengShui && rule.category === 'Feng shui') continue;
    let outcome: RuleOutcome;
    if (rule.appliesTo && !rule.appliesTo.some((t) => ctx.roomTypes.has(t))) {
      outcome = { status: 'not-applicable' };
    } else {
      outcome = rule.check(ctx);
    }
    results.push({ rule, outcome });
  }

  // Totalbetyg: varje regel en gång, viktad enligt viktighetsskalan.
  let wPassed = 0;
  let wApplicable = 0;
  for (const { rule, outcome } of results) {
    if (outcome.status === 'not-applicable') continue;
    const w = IMPORTANCE_WEIGHT[rule.importance];
    wApplicable += w;
    if (outcome.status === 'passed') wPassed += w;
  }

  // Delbetyg: tvillingregler bidrar till båda sina kategorier.
  const byCategory: CategoryScore[] = CATEGORY_ORDER.filter(
    (cat) => fengShui || cat !== 'Feng shui',
  ).map((category) => {
    let cPassed = 0;
    let cApplicable = 0;
    let applicable = 0;
    let violated = 0;
    for (const { rule, outcome } of results) {
      const inCategory =
        rule.category === category || (fengShui && rule.twin?.category === category);
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
    fengShui,
    roomTypes: [...ctx.roomTypes],
    results,
    total: wApplicable > 0 ? Math.round((100 * wPassed) / wApplicable) : null,
    byCategory,
  };
}
