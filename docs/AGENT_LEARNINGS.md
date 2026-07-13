# Agent pipeline — learnings

This file is the **memory of the agent pipeline**. Stage C (see
[`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md)) appends what it learns from the human's
decisions — which proposals got merged, which got edited before merge, which got
rejected — and Stages A and B read it before proposing and building. This is what
makes the loop get better over time.

Keep entries **concise, actionable, and general**: state the durable principle a
future agent can apply across many situations (e.g. "controls must not hide other
controls"), not a one-off note about a single PR. Cite the issue/PR number as the
example the principle came from. Group related lessons under a heading.

---

## Proposal selection (Stage A)

- **A strong proposal finds an inconsistency by comparing a control to its own
  siblings, not just to the docs.** #126 didn't just cite `DESIGN.md`'s "reuse
  `.btn`" and "≥44px coarse-pointer target" rules in the abstract — it pointed out
  that the *other* buttons in the same panel (`.opening-list button`) already used
  the shared primitive and already met the touch-target rule, so the "Add
  door"/"Add window" buttons were the one outlier. That sibling-comparison
  framing made the fix obviously scoped and low-risk, which is why it merged with
  zero changes. Prefer proposals that name the specific nearby element already
  doing it right, over ones that only gesture at a general doc rule.

## Scoping (Stage B)

_No entries yet._

## Design & UI

- **When migrating a bespoke control onto a shared primitive like `.btn`, write a
  scoped override that only sets the properties that genuinely need to differ
  (e.g. `flex`, `font-size`, `padding`), and let the primitive's own base rules —
  including its coarse-pointer `min-height: 44px` — cascade through rather than
  re-declaring them.** In #128, replacing bespoke `.opening-add button` CSS with
  `.opening-add .btn { flex: 1; font-size: 12px; padding: 6px 8px; }` fixed both
  the missing-primitive and missing-touch-target problems in one small, low-risk
  diff, and merged with no changes needed. The general rule: don't recreate a
  primitive's guarantees in a component-specific override — inherit them.

## Testing & verification

_No entries yet._

## Code style & conventions

_No entries yet._

## Areas to avoid / handle carefully

_No entries yet._
