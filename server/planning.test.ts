import { describe, expect, it } from 'vitest';
import { buildPlanBrief, checkPlan, type FurniturePlan, type PlanItem } from './planning.ts';

const item = (over: Partial<PlanItem>): PlanItem => ({
  kind: 'box',
  name: 'Box',
  quantity: 1,
  priority: 'need',
  sleeps: 0,
  reason: '',
  ...over,
});

const plan = (items: PlanItem[]): FurniturePlan => ({ items });

describe('checkPlan', () => {
  it('passes a single bed with one nightstand', () => {
    const p = plan([
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
      item({ kind: 'nightstand', name: 'Nightstand', quantity: 1 }),
    ]);
    expect(checkPlan(p)).toHaveLength(0);
  });

  it('flags two nightstands beside a single bed', () => {
    const p = plan([
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
      item({ kind: 'nightstand', name: 'Nightstands', quantity: 2 }),
    ]);
    const findings = checkPlan(p);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('at most one nightstand');
  });

  it('flags two nightstands as one item and as two separate items alike', () => {
    const asOne = plan([
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
      item({ kind: 'nightstand', name: 'Nightstands', quantity: 2 }),
    ]);
    const asTwo = plan([
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
      item({ kind: 'nightstand', name: 'Left nightstand', quantity: 1 }),
      item({ kind: 'nightstand', name: 'Right nightstand', quantity: 1 }),
    ]);
    expect(checkPlan(asOne)).toHaveLength(1);
    expect(checkPlan(asTwo)).toHaveLength(1);
  });

  it('allows two nightstands beside a double bed', () => {
    const p = plan([
      item({ kind: 'bed', name: 'Double bed', sleeps: 2 }),
      item({ kind: 'nightstand', name: 'Nightstands', quantity: 2 }),
    ]);
    expect(checkPlan(p)).toHaveLength(0);
  });

  it('flags nightstands with no bed at all', () => {
    const p = plan([item({ kind: 'nightstand', name: 'Nightstand', quantity: 1 })]);
    const findings = checkPlan(p);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('no bed');
  });

  it('sums nightstand allowance across mixed bedrooms', () => {
    // One double (2) + one single (1) → up to 3 nightstands is fine, 4 is not.
    const base = [
      item({ kind: 'bed', name: 'Double bed', sleeps: 2 }),
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
    ];
    expect(checkPlan(plan([...base, item({ kind: 'nightstand', quantity: 3 })]))).toHaveLength(0);
    expect(checkPlan(plan([...base, item({ kind: 'nightstand', quantity: 4 })]))).toHaveLength(1);
  });
});

describe('buildPlanBrief', () => {
  it('separates need-to-have from nice-to-have and lists quantities', () => {
    const brief = buildPlanBrief(
      plan([
        item({ kind: 'bed', name: 'Double bed', priority: 'need' }),
        item({ kind: 'rug', name: 'Wool rug', priority: 'nice' }),
      ]),
    );
    expect(brief).toContain('Need-to-have');
    expect(brief).toContain('1× Double bed (bed)');
    expect(brief).toContain('Nice-to-have');
    expect(brief).toContain('1× Wool rug (rug)');
  });

  it('marks an empty priority group as (none)', () => {
    const brief = buildPlanBrief(plan([item({ kind: 'bed', name: 'Bed', priority: 'need' })]));
    expect(brief).toContain('- (none)'); // nice-to-have group is empty
  });
});
