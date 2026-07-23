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

## Direction change: the vision is unparked (2026-07-17)

The human's own #335 rewrote `STRATEGY.md`, `VISION.md`, and `PRINCIPLES.md` (a
near-total rewrite, +249/-249 across those three files) to remove the "core first,
commerce later" sequencing several older entries below were written under. The old
"Non-goals (for now)" — feature sprawl, monetization-driven features, speculative
infrastructure — are now explicitly **in scope**: "Monetization is in play now… no
longer wait on a 'core is done' gate," and the tie-breaker for scope-vs-capability
tradeoffs changed from "clarity and the core promise win over added capability" to
"weigh them with judgment and taste — there is no automatic winner." `AGENT_PROPOSALS.md`
/ `AGENT_BUILD.md` / `AGENT_PIPELINE.md` were mirrored in the same PR. **Read any
older entry below that cites a "non-goal," "core-first," or "parked" monetization/scope
decision as historical evidence for the *mechanism* it demonstrates (sibling-comparison,
duplicate detection, and so on), not as a still-standing scope boundary** — the
boundary itself moved, so the general technique survives even where the specific
example no longer would be rejected today. Nothing below needed rewriting for this: the
one section that stated the old boundary as its actual point ("Areas to avoid"'s
"no-go zone" framing) had already been corrected directly by the human's own #300/#314,
before this pivot landed.

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
  default proposal shape to keep using. This run's batch extends it again, at
  larger scale: of 27 freshly-decided agent PRs, 25 merged clean and 0 were
  rejected — the only 2 exceptions (#279/#205, #297/#263) needed a
  human-assisted merge purely from branch staleness against a same-batch
  sibling, not a scoping or approach problem (see Scoping, below). This run's
  9 freshly-decided agent PRs (#337–#346, minus #342 which is the human's own)
  all merged too, 0 rejected — 7 clean, 2 (#337, #346) touched by the human's
  own same-day integration pass (#357) for reasons unrelated to their own
  approach (see Scoping, below). This run's 8 freshly-decided agent PRs
  (#371–#378, from issues #348–#350/#354–#356/#362/#363) all merged clean too,
  0 rejected, 0 edited — every issue again named its sibling by file/line:
  #372 (Nightstand drawer clamp) reused the exact `Math.max(..., floor)` shape
  already in `Wardrobe.tsx`/`Counter.tsx`; #354→#374 (fridge doors part) and
  #348→#371 (plant pot/foliage colour swap) each pointed at the one sibling
  kind/mesh doing it right; #376 (corner-drag inset freeze) named the existing
  `dragFitWallsRef` pattern to mirror and its own e2e spec verified (via `git
  stash`) that the fix actually changes the outcome, not just adds a test that
  would pass either way. Twenty-seven straight clean merges across three runs now.
  **This run adds a data point at a larger, vision-scale build, not just small
  fixes:** #368/#397 ("Add a printable/exportable room summary — floor plan,
  furniture list, and score," one of the run's *larger steps toward the vision*,
  636 lines) named the exact building blocks the lobby's own room-card thumbnail
  already used (`floorPolygon`/`rectCorners` in `lib/polygon.ts`) and reused
  `ValidationPanel`'s own `.validation-summary` markup verbatim rather than
  inventing a parallel score display, and still merged clean with zero edits
  despite being roughly ten times the size of a typical clean-merge PR. The
  sibling-comparison shape isn't just a small-fix trick — it de-risks a bigger,
  vision-scoped build exactly the same way, by giving the reviewer building
  blocks they already trust instead of new ones to evaluate from scratch.

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
  repeated friction point. **Confirmed further this run:** when #280 later removed
  the 2D plan editor's own long-standing "Fit view" button, its PR cited the *same*
  rejection comment on #240 verbatim — "neither in this nor in the floor plan view" —
  as the reason to remove the existing sibling control too, not just decline to add
  a new one. The human's stated skepticism about a feature applies retroactively to
  an existing control just as much as to a proposed one; don't read a rejection as
  scoped only to the specific PR it closed.

- **[Promoted into `AGENT_PROPOSALS.md` this run.] Proposal volume must respond
  to whether anything downstream can actually merge — a healthy proposal can
  still be the wrong thing to add to a pipeline that's jammed.** Across the
  required-check-integrity incident tracked in *Pipeline reliability* below,
  Stage A kept firing a full 9-proposal batch every run — quality wasn't the
  problem, each batch matched the usual 3/3/3 mix and the usual sibling-cited
  shape — while zero PRs merged for two-plus days because `main`'s own CI
  stayed red. The unclaimed (`agent:ready`, not yet `agent:building`) backlog
  grew from roughly 20 to 20 again between two runs simply because Stage B
  worked through one batch while Stage A added a fresh one on top, and the
  combined queue awaiting the human (unclaimed issues + in-progress issues +
  open built PRs) reached 53 items. None of this is a proposal-quality
  failure; it's a volume-vs-throughput failure the existing "ready backlog
  growing → rebalance Stage A/B" metric rule already anticipates in the
  abstract (`AGENT_METRICS.md`'s *Acting on the metrics*) but never turned into
  a concrete check Stage A runs itself. The general rule: proposing at full
  volume assumes the pipeline downstream can absorb it; when the evidence says
  otherwise (a red required check on the default branch, or an already-large
  combined backlog), the right move is to throttle the *count*, not to lower
  the *bar* — see the new check added to `AGENT_PROPOSALS.md`'s algorithm.

- **The sibling-comparison shape holds at vision/monetization scale, not just
  for small fixes — this run's batch is the clearest evidence yet.** All 19 of
  this run's freshly-decided agent PRs merged, 0 rejected, and effectively all
  clean (the one two-commit PR, #393, was the agent correcting its own
  incomplete commit within the same build session, before any human review —
  not an edit). The batch mixed small fixes (#392 mobile hint overlap, #415
  Desk clamp, #416 touch target) with several genuinely large,
  monetization/vision-scale builds: #382 (multi-home workspaces, 856 lines),
  #398 (account sync + free-tier room cap, 541 lines), #390 (freemium AI-
  generation cap, 432 lines), #391 (shareable room link, 1083 lines, the
  biggest PR in the batch), #389 (product-link "Buy" affordance, 363 lines,
  explicitly framed against `VISION.md`'s "how it makes money"), and #400
  (multi-select furniture, 553 lines). None of these needed a smaller, safer
  slice to land clean — each still pointed at an existing sibling mechanism to
  extend (#398/#369's cap check mirrors the pattern `RoomCapDialog` set up;
  #400 extends the *existing* single-selection toolbar rather than building a
  parallel one) even at this scale. Combined with the STRATEGY.md pivot
  entry at the top of this file, this closes the loop that pivot predicted:
  monetization/vision-scale proposals aren't a riskier category that needs
  extra caution — they clear the bar at the same clean-merge rate as small
  fixes when they're scoped the same sibling-comparison way.

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

- **Two more instances confirm this is a recurring cost of Stage B's serial,
  one-at-a-time build model, not a one-off — promoted into `AGENT_BUILD.md` this
  run.** #205 (PR #279, rebuilding `HistoryBar` on `SelBar`) sat open long enough
  that a same-batch sibling PR (#255, rebuilding `PlanToolbar` on the same `SelBar`
  primitives) landed first and left #279 stale against `main`; the human resolved
  it via #296 (a comment-only conflict in a shared e2e spec — no executable code
  actually collided). #263 (PR #297, an ERG-09 threshold fix) went stale the same
  way against #298 (ERG-02), which appended a sibling `describe` block to the same
  `engine.test.ts` insertion point moments earlier; the human resolved it via #305.
  In both cases the *build* itself was correct — the entire cost was branch
  staleness during the gap between a PR opening and the human getting to review it,
  while other same-batch PRs kept merging ahead of it. `AGENT_BUILD.md` now asks
  Stage B to name any other open or recently-merged issue touching the same file
  directly in the PR body — already an emergent, unprompted habit in #282/#283
  (which coordinated disjoint regions of the same file and merged with only a
  trivial expected conflict) — so a human resolving a conflict has the context
  already in hand instead of discovering it cold. A structural fix for the specific
  `engine.test.ts` collision point — one test file per rule instead of one shared
  file every new rule appends to — would remove that particular collision entirely
  and is a legitimate future Stage A candidate.

- **A same-day batch of 9-10 agent PRs can outrun same-day human review, and when
  it does, the human may resolve the whole backlog with one large hand-built
  integration PR rather than merging each individually — which is where two
  smaller lessons below actually surfaced.** This run's 9 agent PRs (#337–#346,
  minus the human's own #342) were all opened within about 90 minutes on
  2026-07-17 evening and sat open overnight; the human's own #357 the next
  morning merged all of them (plus #342 and Stage C's own #347) onto one branch
  `--no-ff` and resolved the conflicts in a single 25-commit, 92-file session,
  rather than reviewing/merging each PR one at a time. Two real cross-PR issues
  only became visible at that integration point, not to any individual PR's own
  review:
  - **A new control's natural label collided with an existing control's
    accessible name.** #337's empty-room prompt added its own "Add furniture"
    button, reusing the same label the dock's own persistent "Add furniture"
    pill already had — harmless in isolation (#337 alone never had both mounted
    in a way its own spec exercised), but once both controls could be on screen
    together it broke the dock selector's uniqueness assumption used across the
    whole e2e suite. Fixed by renaming the new one to "Browse furniture." When
    proposing or building a new affordance, check not just "does this label read
    well" but "does an existing control elsewhere in the same view already use
    this exact accessible name" — the same sibling-comparison discipline
    Proposal selection already applies to primitives and thresholds applies here
    too, just checking uniqueness instead of consistency.
  - **Concurrent PRs built e2e coverage against a flow another same-day PR was
    mid-replacing.** #342 (human's own) removed the New Room wizard the same
    evening #337 and #346 were built, and both of those PRs' specs still drove
    room creation through the now-deleted wizard steps — mechanical breakage
    requiring their room-creation helpers to be rewritten, unrelated to either
    PR's actual approach. This is the "Areas to avoid" room-creation entry's
    prediction landing concretely: a proposal/build that adds e2e coverage
    exercising a flow already flagged as hot and in flux inherits that flow's
    churn, even when the PR's own feature is unrelated to what's changing.
  - **Counter-example, same run:** #341 (FEN-14) and #343 (ACC-11) both edited
    `src/lib/validation/rules.ts` at different line ranges, each explicitly
    flagged the overlap in its own PR body per the existing same-file lesson —
    and the integration confirms they auto-merged with no conflict at all.
    Flagging a same-file overlap doesn't guarantee a collision; it just makes
    the actual outcome (conflict or clean) cheap to resolve either way, which is
    exactly why the habit is worth keeping regardless of outcome.

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

- **[Urgent — fixed in `AGENT_BUILD.md` this run, but the underlying repo
  setting needs a human check.] Auto-merge landed 7 PRs despite their own
  required `E2E (desktop + mobile)` check reporting `failure`, and the default
  branch itself is standing red on the same check.** `AGENT_BUILD.md` states
  plainly: "Auto-merge only completes when CI is green... A red or pending
  check holds the merge." That did not hold in practice. Checked directly via
  `get_check_runs` on the PRs' own head commits: #371, #372, #374, #375, #376,
  #377, #378 (all `agent:auto-merge`, merged 2026-07-18 evening) each show
  `E2E (desktop + mobile): failure` at the exact commit that merged, with no
  later re-run and no fix commit — the same 4 mobile specs every time
  (`autoarrange-feedback.spec.ts`, `furniture-dialog-dismiss-keep.spec.ts`,
  `furniture-size-commit-on-blur.spec.ts`, `history-bar.spec.ts`, all failing
  on a 60s timeout, not an assertion mismatch — a resource/timeout flake, not a
  regression any one of these PRs introduced). Confirming this isn't confined
  to PR-triggered runs: `main`'s own latest push-triggered CI run (after #361,
  a docs-only PR) **also** fails the identical 4 mobile specs right now — the
  default branch is currently red on its own required check. The most likely
  cause: the repo's branch-protection required-status-checks list may not
  actually include the `E2E (desktop + mobile)` context (the one-time human
  setup step named in `AGENT_PIPELINE.md`'s Activation note), so GitHub's
  auto-merge waits only on `Lint, test & build` and merges regardless of the
  E2E conclusion. **A human needs to check Settings → Branches → the default
  branch's required status checks and confirm both contexts are actually
  listed**, and separately, the 4-test mobile timeout flake itself needs
  fixing (or the suite needs more headroom) — until then it's silently masking
  whatever a future PR's E2E run would otherwise have caught. As an immediate
  safety net, `AGENT_BUILD.md`'s auto-merge step now tells Stage B to verify
  the E2E check's own conclusion via `get_check_runs` before enabling
  auto-merge, rather than trusting the platform gate alone — see the promoted
  rule there. This is a single-occurrence finding but treated as urgent per
  this file's own standing rule for full-batch operational failures: a safety
  gate silently not gating doesn't need to recur before it's worth fixing.

- **[Still unresolved a full day later — escalating, not repeating.] The
  required-check-integrity gap above has not been fixed, and the cost of
  leaving it open is compounding, not sitting still.** This run found zero new
  auto-merges to test whether branch protection was corrected, because `main`'s
  own CI is still failing its required `E2E (desktop + mobile)` check (reconfirmed
  directly: the push-triggered run right after #397 merged is `failure`) — so
  nothing can complete the platform's own auto-merge gate right now regardless of
  the settings question. In the same window, the built-but-unmerged backlog
  roughly doubled (7 → 15 open PRs: #389–#398, #410–#415), none of which can
  auto-merge and all of which show a red required check to a human reviewer too.
  A flagged safety-gate gap that sits for a day while the queue behind it grows is
  exactly the situation this file's "single severe operational incident" rule
  exists for — noting it again, more loudly, rather than assuming last run's
  mention was sufficient. **Update, this run (still unresolved, third
  consecutive flag):** re-checked directly against the newest PR in the backlog
  (#416, `E2E (desktop + mobile)` completed 2026-07-20T05:04:15Z) — still
  `failure`, ~28 hours after the gap was first found. Zero agent PRs merged or
  rejected in this window (nothing for Stage C to learn from on the taste side
  this run), but the gap is now visibly steering *behaviour*, not just sitting
  latent: #416 (a small, faithful, otherwise auto-merge-qualifying CSS fix)
  explicitly declined to request auto-merge, citing PR #379's own
  required-check-integrity finding as the reason not to trust the platform gate
  yet — the promoted `AGENT_BUILD.md` caution from the first flag is visibly
  changing Stage B's behavior mid-incident, which is the fix working as
  intended, but it also means the backlog (now 17 open agent-built PRs) can't
  self-clear through auto-merge *or* confident human review while the check
  stays red. The one lever this file doesn't control is the human actually
  opening Settings → Branches — two prior snapshots asked in the learnings
  body, which a human reviewing a merged doc might not read closely; this
  run's PR description leads with the ask instead, on the theory that
  un-merged-for-a-day is itself evidence the ask needs to be louder, not
  repeated in the same place. **Update, this run (12th snapshot, fourth
  consecutive flag, now unresolved ~2 days):** re-checked directly against
  `main`'s own most recent CI run — still the same head commit (`0f047fa`,
  from #397, merged 2026-07-19T14:25), because **no PR has merged since**, so
  there has been no fresh chance for the platform gate to prove itself either
  way. Pulled that run's own job log: `E2E (desktop + mobile)` fails with 6
  failed specs (`door-leaf-fade.spec.ts` timing out on both desktop *and*
  mobile at the exact orbit-drag line, plus `autoarrange-feedback`,
  `furniture-dialog-dismiss-keep`, `furniture-library-rename` — a fifth
  chronically-flaking mobile spec joining the list this run — and
  `furniture-size-commit-on-blur`), 1 flaky (`color-undo-batch`), 168 passed.
  Nothing has changed about the underlying break; only the cost of leaving it
  has: the combined queue awaiting the human — 20 unclaimed `agent:ready`
  issues, 16 `agent:building` issues each with their own open PR, and 16 open
  agent-built PRs (plus this meta-PR) — is now **53 items**, up from roughly
  20 at the first flag. Stage A kept proposing a full 9-per-run batch every
  run through this entire incident (the unclaimed backlog alone grew 11→20
  this run, meaning a full fresh batch landed on top of one Stage B hadn't
  even started on yet), which is itself a second, distinct problem from the
  CI gate: **proposing more when nothing downstream can merge just deepens a
  pile nobody asked for.** Promoted a backlog/CI-aware throttle into
  `AGENT_PROPOSALS.md` this run for exactly that reason (see *Proposal
  selection*, below) — the CI-gate finding itself still has no fix Stage C can
  make; only a human opening Settings → Branches resolves it, and separately,
  someone needs to either fix or skip `door-leaf-fade.spec.ts`'s orbit-drag
  step so `main`'s own required check can go green again.

- **A brand-new e2e spec passing in its own authoring session is not the same
  claim as "this spec passes in CI" — verify the CI run itself before trusting a
  PR's own `npm run test:e2e` report.** The human's own #396 reported
  `e2e/door-leaf-fade.spec.ts` passing locally ("170 passed") in its PR body, but
  every CI run since it merged (checked directly across 5 independent later PR
  branches, spanning several hours, desktop **and** mobile) times out at the
  exact orbit-drag line the spec drives (`mouse.move: Test timeout of 30000ms
  exceeded`) — a new, 100%-reproducible-in-CI failure, not a rare flake, stacked
  on top of the 4 already-known mobile-timeout specs from last run's finding
  above. It never showed up in the PR's own authoring session, only under CI's
  resource constraints. Combined with the still-open required-check gap, this
  means essentially the entire current backlog is failing its E2E gate for two
  independent reasons at once. A human needs to look at `Walls.tsx`'s new
  per-frame door-registry loop (added by #396) or the spec's own orbit-drag
  interaction — Stage C can observe and report this, per its own guardrails, but
  can't fix product code or the spec itself.

- **Stage C must reuse its own canonical branch and PR, not whichever branch a
  session happens to default to.** A prior run pushed its update to
  `claude/funny-bardeen-j34znb` (the session's own default branch) instead of
  `agent/learnings-update`, opening a second, redundant `chore(agent): update
  learnings, metrics & pipeline` PR (#399) alongside the still-open, substantive
  #379 on the correct branch — two conflicting meta-PRs open at once, with #399's
  "ready backlog is 0" claim already stale and contradicted by #379's own
  content and this run's real (large, growing) backlog. Closed #399 as
  superseded this run, folding its still-valid observations into this update
  instead. **Promoted into `AGENT_ANALYSIS.md`'s "Writing the learnings" section**
  this run: always check for an already-open PR on `agent/learnings-update`
  first and push new commits there instead of assuming a fresh branch/PR is
  needed.

- **A single stuck `agent:building` issue can hide inside an otherwise-healthy
  claimed batch — check every claimed issue for its own PR, not just whether
  the batch as a whole looks fine.** Of 16 open `agent:building` issues this
  run, 15 each have their own open PR (a healthy, actively-reviewed backlog);
  the 16th, #386 ("furniture part's colour swatch below the 44px touch
  target"), has carried `agent:building` since 2026-07-19T02:49 with no PR ever
  opened for it (confirmed directly — no PR anywhere references #386). A 15/16
  healthy ratio would look fine at a glance; only checking each one individually
  surfaced the crash-recovery case `AGENT_BUILD.md`'s reclaim step exists for.
  Left for Stage B's next run to reclaim (Stage C doesn't touch `agent:building`
  itself, per its own label guardrails). **Resolved the very next Stage B run:**
  #416 (`Closes #386`) opened within hours, confirming the reclaim step works
  once the instance is flagged — no further action needed on this specific
  issue. **A second instance, this run (16th snapshot):** #407 ("Implement
  FEN-08") has carried `agent:building` since 2026-07-19T14:57 with no PR ever
  opened for it (confirmed directly — its four same-batch siblings #402, #403,
  #405, #406 all moved to open PRs #450/#451/#453/#454 over the same window,
  while #407 alone never did). Two independent occurrences now, both caught only
  by checking every claimed issue individually rather than trusting a healthy-
  looking ratio — the check-each-one habit is earning its keep, not a one-off.
  Flagged for Stage B's next run to reclaim; not yet promoted into an automatic
  check beyond `AGENT_BUILD.md`'s existing reclaim step since two instances, both
  cleanly resolved by that same step, isn't yet evidence the step itself needs to
  change — just that Stage C should keep checking every claimed issue, every run.
  **Resolved this run (17th snapshot):** #407 now has an open PR (#456, opened
  2026-07-23T05:22:35Z) — the reclaim step caught up on its own, no Stage C
  action needed, and all 8 currently-`agent:building` issues have their own PR
  again. Third instance now cleanly self-resolved by the existing step; still
  not promoting an additional automatic check on top of it.

- **A promoted script/loop fix is inert until the PR carrying it actually
  merges — "promoted this run" is not the same claim as "in effect this run."**
  The twelfth snapshot promoted a backlog/CI-aware proposal throttle into
  `AGENT_PROPOSALS.md` specifically to stop Stage A from compounding the
  required-check outage above. It had zero effect: that edit lives only on this
  still-open `agent/learnings-update` branch, and every Stage A run reads
  instruction docs fresh from the default branch, which never received it.
  Direct proof: issue #435 was opened 2026-07-21T03:00:27Z — nearly two hours
  *after* the throttle commit — with no sign of throttling, and the combined
  backlog grew from 53 to 62 in the following ~19 hours. This is a distinct
  failure mode from every other entry in this section: those were bugs in what
  the pipeline *does*; this is a gap in how a fix *takes effect* — self-improvement
  through this stage's own instrument (editing the instruction docs) only works
  once a human merges the PR carrying the edit, so during any prolonged review
  gap the pipeline cannot actually self-correct even after Stage C has
  correctly diagnosed the problem and written the fix. **General rule:** when
  promoting a fix for a *live, time-sensitive* operational problem (as opposed
  to a taste/quality lesson that can wait for the next normal review cycle),
  say explicitly in the PR/learnings entry that the fix is not yet active, and
  don't let the metrics snapshot imply otherwise — "promoted" and "in effect"
  are different claims and this file should keep them visibly different until
  the carrying PR merges. This also means the true fix for this specific
  incident is unavoidably a human action: merging (or cherry-picking) this
  meta-PR, not anything Stage C can do from inside it.

- **Resolved: the human merged #379 (13th snapshot), and in the same session
  cleared nearly the entire built-PR backlog by hand — the "inert fix" gap
  above is now closed, but the underlying CI gate is not.** #379 merged
  2026-07-21T17:56:46Z, after sitting open ~2.5 days across five Stage C runs;
  confirmed directly that `AGENT_PROPOSALS.md`'s backlog/CI throttle is now
  live on `main`. In the same ~12-minute window (17:53–18:05 that evening) the
  human individually merged **19 more agent-built PRs** (#389–#446, spanning
  small fixes through several vision-scale/monetization builds), each closing
  its own issue as `completed` with zero rejections. The combined queue
  (unclaimed `agent:ready` + `agent:building` + open `agent:built` PRs) fell
  from 62 to **35** in one session — proof that a stalled backlog isn't
  permanent damage, it clears the moment review time is available, and a
  future incident like this one shouldn't be read as an unrecoverable spiral.
  **But the required-check-integrity gap these 19 PRs sat behind is still not
  fixed**: `get_check_runs` on the newest commit on `main` (PR #391's head,
  the last of the batch) shows `E2E (desktop + mobile)` still `failure` while
  `Lint, test & build` is `success` — the same pattern flagged for six
  consecutive snapshots now. The new information this run is about the
  *human's* behaviour, not the check's: they merged all 19 PRs, plus their own
  #379, while the required E2E check was red on every one of them — either
  because branch protection genuinely doesn't require that check (the
  standing suspicion) or because the human has concluded, correctly per every
  prior snapshot's own investigation, that the failures are the known
  mobile-timeout flakes and not real regressions, and merged past them by
  design. **Re-scope the ask accordingly:** stop describing this as "freezing
  the pipeline" — it evidently isn't, human review throughput is what gates
  the queue, not the CI status. Keep two narrower, still-live asks: (1) a
  human should still confirm via Settings → Branches whether `E2E (desktop +
  mobile)` is actually a required check, because it changes whether
  *auto-merge* (which nothing in this batch used — all 19 were plain human
  merges, not `agent:auto-merge`) can be trusted the next time a small,
  low-risk fix qualifies for it; (2) the flaky mobile specs themselves
  (`door-leaf-fade.spec.ts` and friends) still deserve a fix so the check
  stops crying wolf on every PR's review page. Neither blocks Stage A/B in the
  meantime, so this drops out of "urgent" back to a normal watch item.

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

- **Instruction docs must be checked for self-consistency against `PRINCIPLES.md`/
  `STRATEGY.md` and against each other, not just against product code.** The
  human's own #300 found that `AGENT_PROPOSALS.md`'s own quota language ("10 new
  features") silently contradicted `PRINCIPLES.md`'s depth-over-breadth stance and
  `STRATEGY.md`'s direction, and that `AGENT_BUILD.md`'s "no-go zone" phrasing had
  drifted more restrictive than the direction docs intended — both corrected in the
  same PR. When Stage C edits a stage's instructions (including this file), read the
  edit against the direction docs and the *other* stage docs before landing it — the
  same scrutiny already applied when judging a human decision against
  `PRINCIPLES.md`/`VISION.md`.

- **A single large hand-built "integration" PR that merges several other PRs onto
  one branch is a new artifact shape, not a single item — unpack it into its
  constituent decisions rather than reading it as one PR.** #357 merged 11 open
  PRs (10 agent-built plus the human's own #342) `--no-ff` onto one branch and
  resolved the conflicts between them in a single commit. Reading its own PR body
  and file list was enough to trust it this time (unlike #258's misleading
  description, see above) — the body enumerated every merged PR by number and its
  own diff matched exactly what the body claimed — but the *processing* still
  needs to be per-item: each of the 10 agent PRs was analysed and labelled against
  its own issue as usual, and the integration commit's own conflict-resolution
  edits were read separately as the human's-own-PR exemplar (the accessible-name
  and flow-dependency lessons above came from *that* diff, not from any individual
  agent PR's). When a merged PR's body says "merges N other PRs," treat it as N+1
  things to learn from — the individual PRs by the normal recipe, and the
  integration/conflict-resolution work by the human's-own-PR recipe — not as one
  oversized PR to summarize.

- **When a batch of same-day PRs land together, some update the descriptive
  docs they touch and others don't — check every merged feature against
  `ARCHITECTURE.md`'s feature→code map individually, not just the ones that
  happen to mention doc changes in their own body.** Of this run's 19 merged
  PRs, #382 (multi-home workspaces) and #398 (account sync/room cap) each
  updated their own `ARCHITECTURE.md` rows as part of the build — but three
  siblings shipped genuinely new, user-facing capabilities with **no** row at
  all: #391 (shareable room link), #389 (product-link "Buy" affordance), and
  #400 (multi-select furniture). All three were otherwise clean, well-scoped
  merges; the gap was invisible unless the feature→code map was actually
  diffed against what shipped. Fixed directly in this run's own PR (three new
  rows, citing #353/#351/#370). Separately, the same read of #446 (ACC-14
  clearance-rule widening) surfaced an *older*, unrelated drift: the code's
  `ACC-14` (`title: 'Every function keeps its usable clearance'`,
  `src/lib/validation/rules.ts`) has never matched
  `interior-design-rules.md`'s ACC-14 entry (a "minimum area per function"
  condition that no code implements) — predates this run, just never caught
  before. Also corrected directly, since `interior-design-rules.md` is one of
  the descriptive docs this stage may fix on sight. General rule: don't assume
  a clean merge means its docs are current just because a *sibling* PR in the
  same batch happened to update its own — check the feature→code map against
  each shipped capability individually.

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
  **Resolved that run:** #199/#213 built exactly the distance-readout
  alternative the human asked for and merged clean — see the "rejection
  comment as retry spec" entry above. **Reversed two runs later, in two steps:**
  the human's own #358 dropped the "N cm to wall" half of the readout, then
  #360 (same day) removed the rest ("N cm to nearest piece") entirely,
  folding the panel into a single "Colours & materials" section instead (see
  the grouping entry below). Neither PR left a rejection comment to explain
  why — this is hand-built simplification, not a rejected proposal — so don't
  invent a reason the evidence doesn't support; the safe read is that the
  readout didn't earn its place once other panel work made the trade-off
  visible, consistent with `DESIGN.md`'s "minimal and self-evident" principle
  (#262) and "when in doubt, remove a choice rather than add one." **The
  standing lesson for Stage A/B is now the opposite of what this entry said
  two runs ago: do not propose reintroducing a wall/nearest-piece distance
  readout** — it was tried, it worked, and the human still cut it. More
  generally: a feature that clean-merged after satisfying an explicit ask is
  not thereby permanent — when a later merged PR reverses or removes it,
  correct the earlier "positive exemplar" entry in place (as here) rather than
  leaving stale praise standing that could steer a future proposal to rebuild
  something the human deliberately removed.

- **Group a settings panel's controls by the *entity* they act on, not by the
  *kind* of decision they represent — a user makes several decisions about one
  part together, not all of one decision-kind at once.** The furniture editor
  used to show one "Colours" block listing every part's colour, then a
  separate "Materials" block listing every part's material. The human's own
  #360 collapsed both into one "Colours & materials" section that pairs each
  part's colour chip with its material picker side by side (frame colour +
  frame material, then cushions colour + cushions material), because those two
  fields are the pair of decisions a user actually makes about one part at a
  time, not two unrelated axes to compare across parts. When a panel has two or
  more independent fields per repeated entity (part, wall, room), group by
  entity first, then by field — not the other way round — even if the fields
  started as separately-added, separately-maintained blocks.

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

- **An interaction convention shared by several parallel, same-purpose components
  must be implemented identically on all of them — a sibling drifting out of sync
  is itself a bug.** The human's own #323 found that walls/floors select only on a
  *still* click (`onClick`, guarded by `e.delta > 3` so a small drag-then-release
  doesn't fire it), while furniture selected on raw `onPointerDown` — so an
  imprecise touch/drag on a piece of furniture could select it mid-gesture, unlike
  its two siblings. The fix moved furniture to the same `onClick` + `delta` guard,
  and `onPointerDown` now only starts a drag if the piece is already selected. When
  proposing or building a change to one of several parallel components (selection,
  drag, keyboard handling), check the others for the pattern to match — generalising
  an existing convention beats inventing a new one for a single component.

- **A genuinely new user-facing primitive must land with its gallery entry and
  `DESIGN.md` rule in the same PR — CLAUDE.md says so explicitly, and #373
  shows a build can still skip it.** #373 (localStorage-write guard) added
  `.save-error-banner`, a new dismissible fixed-position notice class in
  `src/index.css` and a matching `SaveErrorBanner.tsx` component — a genuinely
  new primitive (nothing in `DESIGN.md`'s "Feedback" vocabulary — `.hint`,
  `.error`, `.score-badge`, `.severity`, — covers a dismissible floating
  banner), but the PR touched neither `StyleGuide.tsx`'s gallery nor
  `DESIGN.md`. It merged clean anyway (no human comment caught it either), so
  the living gallery has silently drifted one primitive behind `index.css`.
  First occurrence of this specific miss — not yet promoted into
  `AGENT_BUILD.md`'s own checklist, but if it recurs, add an explicit
  "introducing a new class not in DESIGN.md's vocabulary? add the gallery
  entry + doc rule in this PR" check there. (Stage C left `DESIGN.md` itself
  alone here rather than describing a primitive with no gallery entry to
  back it — the gallery entry needs a `src/` change, out of Stage C's scope;
  a small Stage A candidate: "add `.save-error-banner` to the StyleGuide
  gallery and document it in DESIGN.md" would close the gap the normal way.)

- **A visual/material effect driven by a parent's existing per-frame loop should
  be extended to cover its attached children by registering into that same
  loop, not by adding a second, parallel one.** The human's own #396 found that
  `Walls.tsx`'s fade loop (an exterior wall standing between the camera and the
  room turns to a faint glass plane) never touched a door mounted on that wall —
  the door kept rendering fully opaque, floating in front of an otherwise
  see-through wall. The fix added a small registry (`doorMatRefs`, keyed by wall
  id) that `DoorLeaf` registers its material into on mount; the wall's existing
  per-frame effect now also mirrors its own `opacity`/`depthWrite` onto every
  door registered against it, right next to where it already sets its own. One
  loop, one source of truth, instead of a second effect racing the first.
  Generalises past doors and walls: any child mesh whose visual state should
  track a parent's animated property (an opening on a fading wall, a decoration
  on a moving piece of furniture, …) should hook into the parent's existing
  per-frame mechanism via a small registration callback, not duplicate the
  update logic in its own `useFrame`.

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
  right. **A related but distinct failure mode, caught by the human's own #334:**
  a rendered-geometry e2e assertion (a bounding-box pixel height/width) needs
  sub-pixel tolerance on mobile emulation — an exact floating-point comparison
  against a rasterised value is a latent flake, not a one-off. `e2e/touch-target.spec.ts`
  (from the #197/#212 fix above) occasionally reported `43.99993896484375` instead
  of `44` under mobile device-scale-factor rasterisation; the fix added a 0.5px
  tolerance to the *rendered* `boundingBox()` check while leaving the *computed-style*
  check at an exact 44px floor, so a real regression (e.g. a slip to 38px) is still
  caught. Generalises beyond touch targets to any geometry assertion in the mobile
  Playwright project: assert computed CSS values exactly, but give rendered/rasterised
  pixel measurements a small tolerance.

- **Renaming a user-facing string/accessible-name is a cross-cutting change — grep
  the whole `e2e/` tree for every spec asserting the old text, not just add a fresh
  spec for the new one.** The human's own #324 fixed a CI break: a same-day rename
  ("3 AI suggestions" → "Suggest 3 layouts") added a new spec for the new label but
  left `e2e/bottom-dock.spec.ts` asserting the old one. "Add a test for the new
  state" is not equivalent to "update every test referencing the old state" — treat
  a rename like any other refactor and search for all call sites, where a call site
  is any spec's string assertion.

- **A flakiness workaround discovered once in a spec file is a property of the flow,
  not of the individual test case — apply it to every test in that file exercising
  the same path, not just the one that happened to flake first.** The human's own
  #336 found one test in `e2e/furniture-picker-search.spec.ts` timing out under CI
  load (r3f's render loop saturating the main thread), and fixed it with
  `test.setTimeout(120000)` — a workaround a *sibling* test in the same file already
  used for the identical reason. The PR that added the extended timeout to one test
  didn't apply it to the other, so the same fix had to be rediscovered reactively
  once CI broke.

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
  flow above for now — re-check recent commit history before proposing there,
  since a narrow slice is likely to land inside or be made redundant by
  whatever the human builds next in that flow. **Update:** that prediction
  played out — the human's own #342 removed the stepped wizard entirely and folded back
  into a single `PlanEditor` surface (`.wizard-*` primitives and `useUiStore`'s
  `wizardStep` are gone; a new room now opens straight in the plan editor, with
  the shape chooser as its empty state and the name editable inline). The
  standing lesson holds: room creation is a fast-moving core flow, so read the
  current `nav.ts`/`PlanEditor.tsx` before assuming its shape.

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
