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

Some entries come from a **direct answer** the human gave to an `agent:question`
issue rather than from a merge/reject signal (see
[`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md) → *Asking the human a question*). Record
those the same way, citing the question issue `#N`; if the answer came from an
un-answered, timed-out question, mark the entry **provisional (low-confidence)** so a
later run knows it rests on Stage C's guess, not the human's word.

This file is the *qualitative* half of the loop's memory; its quantitative half lives
in [`AGENT_METRICS.md`](AGENT_METRICS.md). The two work together: a lesson here that
**keeps recurring**, or one that a metric confirms is costing merges, is Stage C's cue
to **promote** it — bake it into the actual agent instructions (the stage docs
`AGENT_PROPOSALS.md` / `AGENT_BUILD.md`, and where warranted `AGENT_ANALYSIS.md` or the
loop in `AGENT_PIPELINE.md`) so it's enforced by default, not just remembered. When that happens,
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
  over ones that ask for a new mechanism to be built. This run reinforced the
  pattern at scale: 9 of 10 decided agent PRs (#180–#189, every one except the
  relocated-not-shrunk #186) merged with **zero edits**, and nearly every issue
  named its sibling explicitly — #181/#178 and #178's own issue text cite the
  #128 precedent by number, #182 points at the `--score-good`/`--score-mid`
  tokens defined a few lines above the hardcoded colors it fixes, and #183
  points at the one drifted literal among three near-identical WebGL color
  constants. Naming the specific sibling by file/line, not just the abstract
  rule, keeps being the single highest-yield proposal shape. This run
  extended it further: **10 of 10** decided agent PRs (#206–#215) merged
  with zero edits and zero rejections — #203/#206 (`hasOptions()` reuse,
  same shape as #146), #200/#207 (`openAddFurniture` reusing `select()`'s
  own panel-clearing rule), #198/#215 (giving `updateFurniture` the same
  `furnitureFits`/`slideFurniture` guarantee `moveFurniture` already had —
  a second instance of the #146 placement-path pattern), and #204/#209 (two
  more sibling rules a few lines away already tokenized) all named their
  sibling by file/line. Nineteen straight clean merges across two runs is
  strong enough that this is no longer a hypothesis to test — it's the
  default proposal shape to keep using.

- **When re-proposing a previously-rejected issue, treat the human's
  rejection comment as the spec for the retry — build exactly the
  alternative they named, not a variant of the rejected approach.** Two
  independent instances this run confirm this, both clean merges: #199/#213
  built the relative wall/piece-distance readout the human explicitly asked
  for when rejecting #148/#153's raw-coordinate fields ("I'd rather see...
  distance to the walls and other furniture... shown in the GUI"); #170/#214
  moved Auto-arrange/AI into the proposal-switcher menu, exactly the fix the
  human named when rejecting #186's CSS-only clipping fix ("A better
  solution would be to move the ai and auto buttons to the proposal menu
  instead"). Both waited through at least one full run in this state before
  being rebuilt correctly — a rejection with a stated alternative is a
  concrete, low-risk proposal waiting to be picked up, not a dead end.
  **[Promoted into `AGENT_PROPOSALS.md`'s "Avoid duplicates" step this
  run.]**

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

- **Pointing at an existing sibling control predicts a clean, low-risk *build* —
  it doesn't by itself prove the *feature* is wanted.** #224 proposed a 3D "Reset
  view" button using exactly the high-yield shape this file has praised all along:
  it named the 2D plan editor's own "Fit view" button as the sibling to mirror,
  reused its icon and primitive family, and was built faithfully as #240. The
  human closed it unmerged: *"Tycker inte denna funktionalitet behövs. Varken i
  denna eller i floor plan vyn"* ("I don't think this functionality is needed.
  Neither in this nor in the floor plan view.") — rejecting not just the copy but
  casting doubt on the sibling control itself. The evidence behind #224 was a
  single accidental repro during a click-through ("an imprecise attempt to grab
  the rotation handle instead orbited the scene"), not a recurring pain point.
  The general rule: the sibling-comparison framing (see the entry above) is still
  the right way to *scope and de-risk* a proposal once you've decided a feature is
  worth building, but it is not itself evidence of *need* — don't treat "an
  analogous control exists elsewhere" as sufficient justification on its own,
  especially when the supporting evidence is a single one-off repro rather than a
  repeated friction point.

## Scoping (Stage B)

- **Two issues proposed in the same batch that touch the same file are a real
  merge-conflict risk, even when each PR is individually scoped and careful.**
  #225 (furniture-picker search) and #226 (library-entry rename) both targeted
  `FurniturePicker.tsx` from the same day's proposal batch. #226's own PR (#236)
  explicitly tried to avoid collision — "did not touch `FurniturePicker`'s
  top-level layout or add filtering, to avoid colliding with the parallel search-
  field work in #225" — but the conflict happened anyway: #236 merged first, which
  left #225's PR (#232) conflicted against `main` by the time it was reviewed, and
  the human had to hand-build a merge-conflict-resolution branch (#238) to land it
  instead of a straight agent-PR merge. Being careful about *what lines* to touch
  in a shared file isn't enough to prevent a conflict — any two edits to the same
  file can collide depending on merge order, regardless of scope discipline. One
  instance so far, so not yet a rule to enforce automatically (see promotion
  criteria in `AGENT_ANALYSIS.md`), but worth watching: if Stage A's dedup step
  (`AGENT_PROPOSALS.md` step 2) notices two same-run candidates would touch the
  same file, it should be a signal to flag the risk in both issue bodies, or
  stagger them across runs, rather than proposing both blind to the collision.

## Pipeline reliability

- **Any batch/queue-processing step in the pipeline must claim and finish one
  unit of work at a time, not claim the whole batch up front — so a crash
  strands at most the item in flight, not the entire run.** A Stage B run
  fired, labelled **10** open `agent:ready` issues `agent:building` within
  ~2 minutes, then died before opening a single PR — a "0 delivered + 10
  stranded" outcome. The human hand-built #278 (docs-only,
  `AGENT_BUILD.md`/`AGENT_PIPELINE.md`, +40/-15, one commit) to make Stage B
  claim → build → verify → open-PR **one issue at a time**, lower the
  per-run cap 10→5 (now a throughput knob, not a safety one, since one-at-a-
  time claiming means a bigger batch can never strand work), and strengthen
  the stuck-issue reclaim to recover a **whole** crashed batch, not just the
  first stuck issue found. The very next Stage B run validated the fix
  end-to-end: of the 10 originally-stranded issues, 5 (#205, #247, #249,
  #252, #253) each got a fresh individual PR (#279–#283) and the other 5
  (#263, #264, #268, #269, #270) were correctly reclaimed to plain
  `agent:ready`, sitting in the backlog for the next run — exactly "ship
  what you finish; stop cleanly when time is short" in action, with zero
  issues left silently stuck. The general rule extends beyond Stage B: any
  future batch-processing step this pipeline adds — including one Stage C
  might add to its own multi-item review loop — should claim-just-before-
  processing, never claim-the-whole-batch-then-process, for the same reason.
- **A full-batch pipeline failure (0 delivered, N stranded) is worth fixing
  on a single occurrence — it doesn't need to recur first, the way a taste
  or proposal-quality lesson would before it's promoted.** This file's
  promotion bar (a lesson recurring, or a metric trending across ≥2 runs) is
  calibrated for *taste* judgments, where one data point could be noise. An
  operational crash that drops an entire run's output to zero isn't that
  kind of signal: the human fixed #278 immediately, in the smallest
  surgical diff that solved it, without waiting to see whether it happened
  a second time. Stage C should hold its own operational failures to the
  same bar (e.g. an `agent:question` queue silently exceeding its cap, a
  metrics refresh silently failing) — a single severe operational incident
  earns an immediate fix, not a wait-and-see.

## Stage C methodology

- **A PR's own description is evidence, not ground truth — always check it against
  the actual diff before trusting what it claims to have changed.** The human's own
  #258 is titled "Add portable agent-pipeline template for reuse in other projects"
  and its body states it's "additive and self-contained... does not touch the
  RoomCraft app, its docs, or its live pipeline." The real diff (17 files, +347/-185)
  did the opposite: it deleted `docs/MONETIZATION.md` and `docs/TECHNICAL-CHALLENGES.md`
  outright, added two brand-new human-owned direction docs (`PRINCIPLES.md`,
  `VISION.md`), and edited `CLAUDE.md`, `README.md`, `ARCHITECTURE.md`,
  `MOBILE-FIRST.md`, `STRATEGY.md`, `PURPOSE.md`, `docs/README.md`,
  `interior-design-rules.md`, and all four `AGENT_*.md` pipeline docs — no
  `agent-pipeline-template/` directory exists anywhere in the shipped result. The
  PR's 10 commits show why: the session started by literally building the template
  (`Add portable agent-pipeline template...`), then reversed course mid-session
  (`Remove agent-pipeline template folder`) after live human steering (one commit is
  titled `Fill in RoomCraft VISION destination from owner input`) and pivoted to the
  docs consolidation that actually shipped — but the PR's title and top-level body
  were never rewritten to describe the final scope, so they still describe the
  abandoned first draft. The lesson cuts two ways: (1) for Stage C's own method —
  since this whole stage's technique is "read the PR body, diff commits" — always
  pull the actual file list/diff for anything that looks unusually broad or
  meta, especially a multi-commit PR (this one had 10, versus the usual 1 for an
  agent-built PR), rather than summarizing from the description alone; (2) for
  Stage B's own PR-opening step — when a build's scope changes mid-session, the
  title and body must be rewritten to match what actually shipped, not left
  describing the original plan.

## Design & UI

- **A new "first principle" now governs every UI decision: the app must be minimal
  and explain itself without words.** The human hand-built #262, adding "minimal and
  self-evident" as the lead section of `DESIGN.md`, above the token/primitive rules —
  show don't tell, less on the screen, make the next step obvious, rely on the
  shared vocabulary, treat explanatory text as a last resort rather than the way a
  surface communicates its purpose. Read this before proposing or building any UI
  change: a proposal that adds a label, caption, or instructional string to make a
  control understandable is weaker than one that makes the control self-evident by
  its shape, position, or icon alone; prefer the latter.

- **When two sibling proposals both touch the same shared file, say so in the PR
  body even if you can't avoid it — it costs nothing and de-risks the merge order.**
  #255 (rebuilding `PlanToolbar` on `SelBar`) explicitly flagged in its own
  description that #205 (rebuilding `HistoryBar` on the same primitives) might add
  the same `disabled`/`history` props to `SelBar.tsx` and collide. No conflict
  actually happened (#205's PR was rejected first), but the proactive flag is the
  right habit regardless of outcome — it's what the #225/#226 postmortem (see
  Scoping, above) asked future same-file pairs to do, and this is the first
  instance of a PR actually doing it unprompted.

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
  **Resolved this run:** #199/#213 built exactly the distance-readout
  alternative the human asked for and merged clean — see the "rejection
  comment as retry spec" entry above.

- **Stopping controls from overlapping isn't the same as keeping them usable —
  if the fix works by shrinking a control until it's no longer legible, that's
  not a fix, it's a smaller version of the same problem.** #186 (CSS `minmax(0,
  1fr)` on the bottom dock's middle track, so a multi-button pill could no
  longer overflow into its neighbours) was rejected: *"Good idea, this needs
  fixing, but now only the copy button shows. A better solution would be to
  move the ai and auto buttons to the proposal menu instead."* The overlap was
  gone, but squeezing the pill into a now-bounded track just clipped it down to
  one visible action — no more usable than the overlap it replaced. When a
  group of dock/toolbar controls doesn't fit a narrow viewport, check whether
  some of them belong in an existing menu/overflow surface (the app already has
  this pattern — the proposal switcher, `More`) before reaching for a
  shrink-to-fit CSS tweak that keeps every control in place but makes one
  illegible. **Resolved this run:** #170/#214 rebuilt it by moving
  Auto-arrange/AI into the proposal-switcher menu, exactly as asked, and
  merged clean — see the "rejection comment as retry spec" entry above.

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

- **[Promoted into `AGENT_BUILD.md` this run.] Any user-facing change must now
  be validated end-to-end in a real browser, desktop and mobile — this is
  enforced, not optional.** The human landed #192: a Playwright harness (two
  projects running the same specs, desktop + mobile) plus a `Stop` hook that
  blocks a session from finishing while `src/` has changes `npm run test:e2e`
  hasn't validated, and `CLAUDE.md` now states the rule directly. A Stage B
  subagent that only follows the old three-command verify checklist (build,
  lint, test) without adding/extending an `e2e/` spec and running
  `npm run test:e2e` will get stuck on that hook — so this is promoted into
  `AGENT_BUILD.md`'s own verify step rather than left for a subagent to infer
  from `CLAUDE.md` alone.
- **When a change adds a new file-naming convention or directory that another
  tool already globs over, verify that tool still passes too.** #193 was a
  same-day fix for a regression #192 itself introduced: the new
  `e2e/*.spec.ts` files matched Vitest's default `**/*.spec.ts` pattern and
  broke `npm test` on `main`, since Playwright's `test.beforeEach` can't run
  under Vitest. Scoping `e2e/**` out of `vite.config.ts`'s Vitest config fixed
  it. Don't just verify the tool you're building for — check whether the new
  files/paths intersect an existing tool's glob or config and would break it.

- **If your own `npm run test:e2e` run surfaces a pre-existing failure unrelated to
  your change, fix it in your PR instead of just noting it as "pre-existing" and
  moving on — a red baseline erodes the validation gate for every other in-flight
  PR, and "not my problem" means nobody fixes it.** Three same-batch PRs (#259,
  #260, #261) independently hit the exact same stale assertion
  (`e2e/touch-target.spec.ts` expecting 5 `.sel-action` pills; the real count had
  been 3 since #170/#214 moved Auto-arrange/AI out of `ActionBar`) and each
  confirmed via `git stash`/history that it was pre-existing and unrelated to their
  own diff — but only the last one to be written, #261, actually spent the one-line
  fix to correct it, noting in its body that the other two "may no-op harmlessly if
  merged after this one." For the ~3.5 hours between the first of the batch
  merging and #261 landing, `main`'s own e2e suite was failing this assertion,
  which is exactly the kind of standing-red state `CLAUDE.md`'s validation rule is
  meant to prevent. When a full-suite run turns up a stale, unrelated failure,
  spend the one line to fix it rather than documenting around it — don't assume a
  sibling PR in the same batch will be the one that does it.

- **A regression test for a computed-style invariant (a touch-target minimum,
  a color, a layout dimension) must assert the actual computed value, not
  just look right in a manual/visual check — because a later, unrelated CSS
  addition with equal specificity can silently re-break an earlier fix, and
  visual review won't reliably catch it.** #197/#212 found that the ≥44px
  coarse-pointer rule #128 established for `.sel-action` had been silently
  defeated: a later, unconditional `.sel-action { min-height: 38px; }` rule
  (added for an unrelated "same height for every dock pill" reason) sat
  further down the file and won the cascade on every viewport, since both
  rules share identical specificity and source order decides the tie. The
  fix's own regression test (`e2e/touch-target.spec.ts`) reads
  `getComputedStyle(...).minHeight` directly and was verified to fail against
  the pre-fix CSS — that's what would have caught this the moment the 38px
  rule was added. When a fix's whole point is a specific computed value,
  test that value directly rather than trusting that it'll keep looking
  right.

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
  "one issue = one small PR" scope. **While these areas are being actively
  hand-built the same day, don't propose a narrow slice inside `src/lib/validation/`
  or `server/` (AI proposal generation/repair) that a bigger hand-built PR would
  make redundant within hours** — check recent commit history on the target path
  before proposing there. This is *collision avoidance, not a no-go zone*: these are
  two of the three hardest problems the whole experience lives or dies by
  (`STRATEGY.md`), so when the area is quiet — or when you can propose at the scale
  the human is clearly already working at — it is a **high-priority target, not one
  to skip**. Only when it *is* hot and you can't match that scale should you prefer a
  different core flow (2D plan editing, room templates, saved library) for that run.

- **A new hot area, same mechanism: room creation.** #168 replaced the
  single-modal template picker with a full stepped wizard (name → walls →
  openings, 858 lines, new `.wizard-*`/`.plan-chooser` primitives) in one
  hand-built PR. Treat "start a new room" the same way as the AI-furnishing
  flow above for now — re-check recent commit history on
  `src/components/*Wizard*`/`useUiStore`'s wizard state before proposing there,
  since a narrow slice is likely to land inside or be made redundant by
  whatever the human builds next in that flow.

- **Pipeline/documentation infrastructure the human builds by hand
  (`docs/*.md`, `e2e/**`, `playwright.config.ts`, `scripts/*`,
  `.claude/settings.json`) is not a "hot product area" signal — don't read it
  the same way as hot product code.** #190/#191/#192/#193/#194 were all
  same-day human PRs, but they harden the agent pipeline itself (a docs index,
  an architecture map, e2e enforcement, a CI fix) rather than deepen a room-
  planning flow. Keep applying the "check recent activity before proposing"
  rule to *product* paths (`src/`, `server/`); don't let a burst of doc/infra
  commits read as "this area is spoken for" the way a burst of `src/lib/validation/`
  commits does — and don't propose *changes to the pipeline docs themselves*,
  since that's explicitly Stage C's job, not Stage A's. #216/#218 confirm the
  pattern again: a PR template requiring GUI-change media, then a same-day
  follow-up fixing it (the API/CLI posting layer defangs any URL containing
  an image extension — even a bare `…png` link — so an automated PR must
  commit screenshots under `.github/pr-media/<branch>/` and link the folder,
  not the image, per `scripts/pr-media.mjs`). Both are pipeline tooling, not
  a product signal — and the human already wired the new convention directly
  into `AGENT_BUILD.md`'s own PR-opening step in #218, so there's nothing
  left for Stage C to promote here. This run adds three more, all hand-built, all
  pipeline/doc infrastructure rather than product surface: #258 (a large docs
  consolidation — new `PRINCIPLES.md`/`VISION.md`, `MONETIZATION.md`/
  `TECHNICAL-CHALLENGES.md` folded in and removed, edits across every reference doc
  and all four `AGENT_*.md` files — see the Stage C methodology entry above for the
  catch in its misleading PR description), #265 (added the very `agent:question`
  channel this stage now uses), and #266 (added this stage's own reference-doc-
  honesty duty, the section this bullet lives under). The pattern keeps holding
  without exception: every time the human invests same-day hand-built effort in
  `docs/*.md`/pipeline tooling, it's about the pipeline or the taste docs, never a
  signal to treat that area as a hot product zone the way `src/lib/validation/` or
  `server/` are. This run adds a fourth instance: #278, a same-day hand-built
  fix to the pipeline's own crash-resilience (Stage B's batch-claiming) — again
  pipeline ops, not a product signal; see the new "Pipeline reliability"
  section above for the operational lesson itself.

- **[Promoted into `AGENT_BUILD.md` this run.] An issue whose PR is closed
  without merging must be reclaimed — `agent:building` doesn't clear itself, and
  the issue silently drops out of the pipeline otherwise.** The watch flagged
  after #170/#186 ("watch for a second rejection leaving an issue stuck with no
  re-proposal before promoting a label-clearing rule") landed twice at once this
  run: #205 (PR #239, "Rebuild HistoryBar on shared SelBar primitives") and #224
  (PR #240, "Reset view", rejected — see the sibling-control entry above) were
  both closed unmerged, and both issues are still open and still labelled
  `agent:building` with no open PR — invisible to Stage B's queue-finding step
  (which only looks at issues *without* `agent:building`) and invisible to Stage
  A's dedup (which wouldn't re-propose something that still looks "in flight").
  Three total instances across two runs is a clear recurring gap, not a one-off.
  `AGENT_BUILD.md`'s queue-finding step now reclaims these explicitly: clear
  `agent:building`, and close the issue too when the PR's own closing comment was
  a plain rejection (as #240's was), otherwise leave it `agent:ready` for a
  future retry.
