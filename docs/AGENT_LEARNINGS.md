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
  doing it right, over ones that only gesture at a general doc rule. #132 (a
  validation-row severity cue, compared against the existing `.severity-1..5`
  list styling nearby) is a second clean example of this same pattern — it also
  merged with zero changes.

- **"Avoid duplicates" must include the human's own recent work, not just open
  issues/PRs — same-day human activity in an area is a strong signal to steer
  away from it or aim higher than a narrow slice.** Two same-day rejections came
  from this exact gap: #129 (a pinned top-bar badge to open the AI panel) was
  rejected as a straight duplicate — "good proposal but I already implemented
  this myself" — because the human had independently added a different, better
  entry point (a "3 AI suggestions" button in the proposal switcher, #140) before
  the agent PR landed. #135 (an isolated loading-bar polish for the AI wait) was
  rejected too — "good proposal but I moved the button" — because the human
  replaced that entire wait experience with a deeper fix (#142: progress readout,
  cancel, timeout, backgrounding-aware errors) that solved the real problem the
  narrow polish only gestured at. Neither duplicate showed up as an open
  `agent:ready` issue or PR, so the existing "search issues and PRs" check
  (`AGENT_PROPOSALS.md` step 2) didn't catch it. When a core flow has multiple
  human-authored PRs landing the same day, either skip proposing inside it that
  run, or propose at the scale the human is clearly already working at instead of
  a narrower slice that a bigger hand-built fix is likely to make redundant.

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

- **Don't give an existing control a second, hidden meaning based on invisible
  state — add a distinct, explicit control instead.** #127 made the plan editor's
  "Done" button silently jump straight into furnishing for a brand-new room but
  return to the lobby for a re-edited one, branching on invisible `pendingRoomId`
  state the user has no way to see. Rejected: "the GUI becomes unclear since the
  back button now does two different things — I'd rather have a dedicated 'start
  furnishing' button." When a flow needs a new destination or behavior, surface
  it as its own visible affordance; don't overload what an existing control does
  based on state the user can't observe.

## Testing & verification

_No entries yet._

## Code style & conventions

_No entries yet._

## Areas to avoid / handle carefully

- **The AI-furnishing flow (entry points, wait/progress feedback, and its
  backend) is being actively deepened by the human directly, fast, and in large
  hand-built PRs** — #137 (mobile plan-editor overhaul), #139 (Postgres-backed
  auth gating AI), #140 (AI entry point in the proposal switcher), #141 (backend
  switched from the Claude CLI to the Anthropic API), and #142 (full mobile AI
  progress/cancel/resilience overhaul) all merged within a few hours on
  2026-07-14. Backend/infra work in this area (auth, model provider) is already
  out of scope per `AGENT_PROPOSALS.md`'s "no speculative infrastructure" rule;
  the new signal here is that the *frontend* surface of this flow is moving fast
  by hand too (see the two duplicate rejections above), so re-verify a gap still
  exists there immediately before proposing rather than relying on an
  end-of-previous-run read of the code.
