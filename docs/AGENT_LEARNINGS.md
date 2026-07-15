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

This file is the *qualitative* half of the loop's memory; its quantitative half lives
in [`AGENT_METRICS.md`](AGENT_METRICS.md). The two work together: a lesson here that
**keeps recurring**, or one that a metric confirms is costing merges, is Stage C's cue
to **promote** it — bake it into the actual agent instructions (`AGENT_PROPOSALS.md` /
`AGENT_BUILD.md`) so it's enforced by default, not just remembered. When that happens,
note the promotion on the entry so the trail from evidence → rule stays traceable.

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
  list styling nearby) and #147 (three furniture-customization controls added to
  the app's one `@media (pointer: coarse)` block, naming the eight sibling
  selectors already in it) are two more clean examples — both merged with zero
  changes. The same framing works one level deeper, for *logic* gaps, not just
  CSS: #146 pointed out that `slideFurniture` already collision-checks against
  other furniture via `furnitureFits`/`obstacles` while dragging, but the two
  *placement* paths (`placeAtCenter`, `duplicateFurniture`) skip that same check
  — also merged with zero changes. Prefer proposals that point at the specific
  sibling code path already doing it right and ask to reuse its exact mechanism,
  over ones that ask for a new mechanism to be built.

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

- **A precision-control feature should surface relative, contextual measurements,
  not raw values against an unstated frame of reference.** #148 proposed exact
  numeric X/Z position and rotation fields as a touch-friendly alternative to
  drag-to-place; Stage B built it (#153) and it was rejected: "good idea but I
  think it becomes a bit too 'data power user' with the numbers there — unclear
  how they relate to the origin. I'd rather see a solution where distance to the
  walls and other furniture is shown in the GUI when a piece is selected." The
  general rule: when a flow needs a numeric/precise alternative to a spatial,
  visual interaction, prefer values the user can already relate to something they
  see (distance to the nearest wall, gap to the next piece) over absolute
  coordinates in a coordinate system the UI never otherwise exposes.

## Testing & verification

- **When adding or fixing a rule that flags a bad layout, pair it with a
  regression test for the closest *legitimate* layout that must keep passing —
  not just a test that the bad case is caught.** This is the consistent shape of
  every rule-engine change the human hand-built on 2026-07-14: ACC-01 (#161)
  tests two beds walling off a strip *and* a single bed against the wall in an
  open room; ACC-14 (#150) tests a desk blocked by a bed *and* a sofa with its own
  coffee table (the legitimate near-neighbor case); SAF-03/LGT-05 (#164) each test
  the flagged case and a passing one (a low window, a shallow shelf). The
  agent-built #151 (furniture no longer spawns embedded in existing pieces)
  followed the same shape: a test that a fitting candidate is left alone, not
  just that an overlapping one gets moved. A rule that only tests its failure
  case risks a false positive on first real use; test the boundary, not just the
  violation.
- **Ground a new or changed validation rule in the canonical rule catalog
  (`docs/interior-design-rules.md`), and reuse the engine's existing geometry
  helpers instead of writing new collision/measurement math.** #164 aligned two
  rule thresholds (daylight, escape-window) to values it traced back to the
  documented source rather than picking new numbers; #161 and #150 both built
  their check on existing helpers (`freeComponents`, grid-sampled clearance)
  rather than a bespoke geometric routine. A rule proposal or fix should point at
  the catalog entry and the existing helper it will reuse, the same way a UI
  proposal should point at the sibling control it will match.

## Code style & conventions

_No entries yet._

## Areas to avoid / handle carefully

- **[Recurring across two Stage C runs — promoted into `AGENT_PROPOSALS.md`.] The
  AI-furnishing flow end to end — its entry points, wait/progress feedback, the
  validation/rule engine (`src/lib/validation/`), and the proposal-generation
  backend (`server/`) — is being actively and rapidly deepened by the human
  directly, in large hand-built PRs, not narrow ones.** The first signal (previous
  run) was the frontend surface: #137 (mobile plan-editor overhaul), #139
  (Postgres auth gating AI), #140 (AI entry point in the proposal switcher), #141
  (Claude CLI → Anthropic API), #142 (mobile AI progress/cancel/resilience) — all
  merged within a few hours on 2026-07-14, and caused two duplicate-proposal
  rejections (#129, #135, see above). This run confirms the pattern has spread
  *and* deepened further, same day: eleven more hand-built PRs landed touching
  the validation rule engine (#145, #150, #159, #160, #161, #163, #164, #167 — new
  rules, threshold fixes, a new "Layout & zoning" category, new room types) and
  the AI backend (#145, #154, #155, #156, #158 — richer repair loop, parallelized
  generation, two-phase furniture planning, cost/latency logging, quality-score
  iteration). None of these were small — several added new files, new server
  modules, or a whole new rule category in one sitting, well past the pipeline's
  "one issue = one small PR" scope. **Do not propose inside `src/lib/validation/`
  or `server/` (AI proposal generation/repair) while this area stays this hot** —
  check recent commit history on the target path before proposing there, and
  prefer proposing in a different core flow (2D plan editing, room templates,
  saved library) that isn't seeing this volume of same-day hand-built work.
