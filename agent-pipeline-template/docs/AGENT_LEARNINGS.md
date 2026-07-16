# Agent pipeline — learnings

This file is the **memory of the agent pipeline**. Stage C (see
[`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md)) appends what it learns from the human's
decisions — which proposals got merged, which got edited before merge, which got
rejected — and Stages A and B read it before proposing and building. This is what makes
the loop get better over time.

Keep entries **concise, actionable, and general**: state the durable principle a future
agent can apply across many situations (e.g. "controls must not hide other controls"),
not a one-off note about a single PR. Cite the issue/PR number as the example the
principle came from. Group related lessons under a heading.

This file is the *qualitative* half of the loop's memory; its quantitative half lives in
[`AGENT_METRICS.md`](AGENT_METRICS.md). The two work together: a lesson here that **keeps
recurring**, or one that a metric confirms is costing merges, is Stage C's cue to
**promote** it — bake it into the actual agent instructions (`AGENT_PROPOSALS.md` /
`AGENT_BUILD.md`) so it's enforced by default, not just remembered. When that happens,
note the promotion on the entry so the trail from evidence → rule stays traceable.

> **[TEMPLATE]** This file ships **blank** on purpose — it is a fresh project's starting
> state. Do not pre-write lessons; Stage C fills each section from real decisions. The
> headings below are the standard themes; keep them so entries land in a consistent place.

---

## Proposal selection (Stage A)

_No entries yet._

## Scoping (Stage B)

_No entries yet._

## Design & UI

_No entries yet._

## Testing & verification

_No entries yet._

## Code style & conventions

_No entries yet._

## Areas to avoid / handle carefully

_No entries yet._
