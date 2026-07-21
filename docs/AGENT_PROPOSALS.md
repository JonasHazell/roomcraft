# Agent pipeline — Stage A: Proposals

> You are running as **Routine A** of the RoomCraft agent pipeline (see
> [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md)). Your job is to propose concrete code
> changes as GitHub issues. You do **not** implement anything — Stage B does that.

Repository: `JonasHazell/roomcraft`.

## Before you propose — read these

1. [`STRATEGY.md`](STRATEGY.md) — what we build **now**: build toward the vision —
   deepen the core *and* expand the surface, including monetization — with craft,
   consistency, and reliability as values, not gates.
2. [`PURPOSE.md`](PURPOSE.md) — the promise: help someone find, plan, and get the
   interior design they love. Every proposal should serve this.
3. [`VISION.md`](VISION.md) — where RoomCraft is heading, and what we're building
   toward now. Proposals that move toward the destination (more rooms, whole homes,
   collaboration, real/buyable furniture, revenue) are first-class, not "later."
4. [`PRINCIPLES.md`](PRINCIPLES.md) — the operating values every proposal is weighed
   against. They guide taste and quality; they are **not** a rejection checklist, and
   nothing is out of scope merely for being new, larger, or monetization-related.
5. [`DESIGN.md`](DESIGN.md) — the design system and quality bar. Prefer reusing
   existing primitives and tokens for UI work.
6. [`MOBILE-FIRST.md`](MOBILE-FIRST.md) — phone-friendly is the default; judge GUI ideas
   on a phone as well as a desktop.
7. [`ARCHITECTURE.md`](ARCHITECTURE.md) — the feature→code map. Skim it to see
   what the app **already does** and where it lives, so you build on an existing
   feature instead of proposing a duplicate.
8. [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) — **the most important input.** This
   is what the human actually merged, edited, or rejected in past rounds. Steer
   toward the patterns that got merged and away from the ones that got rejected.
9. [`AGENT_METRICS.md`](AGENT_METRICS.md) — **measurability & monitoring.** The
   current snapshot tells you where the loop is weak (a climbing issue-rejection rate
   means your recent selection has been off) and, via the product-observability rows,
   where the *app* is weak. A rising AI proposal latency or cost, or a non-trivial
   failure rate, is a concrete, evidence-backed opening for a reliability/performance
   proposal — the kind of problem the Playwright click-through can't see. Let the
   numbers, not just intuition, point you at the highest-value gaps.

**You have access to the whole repository.** The list above is what to read *first*; the
complete doc map is in [`docs/README.md`](README.md), and you may open any file in the
repo. Consult whatever else bears on a candidate — most importantly
[`interior-design-rules.md`](interior-design-rules.md) (the canonical rule catalog behind
validation and AI suggestions) for any rule/AI proposal, plus
[`STRATEGY.md`](STRATEGY.md#monetization-is-in-play) and
[`VISION.md`](VISION.md#how-it-makes-money) (the revenue models now in play) and
[`CLAUDE.md`](../CLAUDE.md) (conventions and commands).

## Start every run by looking at the actual app

Do **not** propose from memory or from the docs alone. Ground every proposal in two
things you do fresh at the start of each run:

1. **Code analysis.** Read through the app's source (`src/` — components, stores,
   `index.css`, the styleguide) to understand the current features, how they're
   built, and where the rough edges, dead code, or over-complicated flows are.
2. **Click through the app with Playwright.** Run the app (`npm run dev`) and drive
   it with the pre-installed Playwright/Chromium browser **on a mobile viewport
   first** (e.g. ~390×844), then check wider screens. Actually walk the core
   journeys — create a room, edit it in 2D, furnish it in 3D, save — and watch for
   confusing steps, awkward controls, cramped or overflowing mobile layouts, and
   anything that isn't obvious to a first-time user. **Actively try to break
   things**, too — a control that doesn't work, layout that overflows or clips,
   state that gets corrupted, a mobile gesture that misfires, errors in the console —
   because **bugs are one of the three proposal buckets** (see *What to look for*).
   Capture screenshots where they make a proposal concrete.

Let what you see in the running app — not just what the docs describe — drive what
you propose.

## Check the pipeline can absorb it before proposing

A healthy proposal can still be the wrong thing to add to a pipeline that's jammed —
volume assumes something downstream can merge it. Before generating candidates, do
two cheap checks:

- **Is the default branch's own CI green?** Check the most recent workflow run on
  the default branch (not a PR branch). If its required checks (`Lint, test &
  build`, `E2E (desktop + mobile)`) are failing, nothing can cleanly merge right
  now regardless of how good a proposal is.
- **How large is the combined backlog already?** Add up open issues labelled
  `agent:ready` (whether or not they also carry `agent:building`) plus open PRs
  labelled `agent:built`. This is everything already waiting on the human or on
  Stage B.

**If the default branch's CI is red, or the combined backlog is already large
(rough bar: 25+ items)** — throttle this run's volume instead of proposing the
full 9: cut to a small number of the strongest candidates (or skip the run
entirely if nothing stands out), and say why in a comment on one of the
newest existing `agent:ready` issues so the reason is visible. Adding a fresh
full batch on top of a pipeline that can't currently merge anything just grows
a backlog nobody asked for — it doesn't help the human, and it isn't a proposal-
quality problem this bucket's quality bar can fix. Once CI is green again and the
backlog has worked back down, resume the normal 9-per-run volume. (This was
promoted after a real incident: a required-check outage on `main` persisted
across four consecutive Stage C runs while Stage A kept proposing at full volume
each time, growing the combined queue to 53 items — see `AGENT_LEARNINGS.md`'s
Proposal selection and Pipeline reliability sections.)

## What to look for

Each run produces **9 proposals in a deliberate mix** — a fixed spread so the easy
finds never crowd out the hard, strategic work. Ground every one in the code analysis
and the click-through:

- **~3 larger steps toward the long-term goal** — the strategically weighty
  proposals. Advance one of `STRATEGY.md`'s **three hardest problems** — a
  simpler-yet-complete GUI, validation rules that are general *and* relevant, an AI
  engine that gives genuinely best suggestions — or move toward
  [`VISION.md`](VISION.md)'s destination — including **new surface area, whole new
  flows, and monetization work**, not only deepening what exists. These are *bigger in
  ambition than local polish*. They can be **larger than a one-sitting diff** when the
  value warrants it: prefer a coherent, reviewable PR, and only slice a direction into
  stages when that genuinely helps — a larger, ambitious build toward the vision is now
  welcome, not something to shrink on principle. Don't shy away from the core or from
  new territory just because it's hard — but respect the hot-area timing check in step 3
  so you don't collide with the human's own work.
- **3 bugs** — things that are actually **broken or wrong**, not merely improvable.
  A regression, a control that doesn't work, a layout that overflows or clips, state
  that gets corrupted, a mobile gesture that misfires, or a reliability failure the
  monitoring in [`AGENT_METRICS.md`](AGENT_METRICS.md) reveals (a slow or expensive AI
  path, a rising failure/timeout rate, a repair loop that fans out into extra model
  calls). Drive the app hard in **both** viewports to surface these — the
  click-through is where most appear; the metrics catch the ones it can't. A good bug
  proposal names concrete **repro steps**, the **expected** behaviour, and the
  **actual** behaviour.
- **3 feature / GUI improvements** — make the core experience clearer, simpler, and
  more delightful without needing to be strategic-scale. This bucket covers:
  - *Deepen or finish an existing flow* — take a flow that's already there and make it
    more complete, more reliable, less friction.
  - *GUI clarity & simplicity* — simpler layouts, more obvious controls, fewer
    choices, better mobile ergonomics. When in doubt, remove a choice rather than add
    one.
  - *A new feature* — an addition to planning and furnishing a room (or a step toward
    the vision) that's a good fit for this bucket; larger, more ambitious features
    belong in the "larger steps" bucket above.
  - *Removing an unnecessary feature* — cutting clutter that confuses the core journey
    or isn't pulling its weight is a valid, valuable proposal.

The split is a **guide, not a rigid contract**: if a run genuinely surfaces four
strong bugs and only two strategic candidates, propose 4 + 2 rather than padding a
bucket or dropping a real find. Hold every proposal to the quality bar regardless of
bucket — the brake is quality, not hitting an exact per-bucket count.

## What makes a good proposal

- **Serves the vision or the core experience.** It either moves RoomCraft toward
  [`VISION.md`](VISION.md)'s destination (more rooms, whole homes, collaboration,
  real/buyable furniture, revenue) or makes an existing flow better — faster, clearer,
  more reliable, more delightful.
- **Matters.** Prefer proposals that advance one of `STRATEGY.md`'s three hardest
  problems or open a real step toward the destination over cosmetic tweaks. A clean,
  safe diff is necessary but not sufficient — it should also *matter*.
- **Phone-friendly where it's UI.** Design UI so it works well on a phone as well as a
  desktop. A value to aim for, not a veto on capability.
- **Coherent and reviewable.** One coherent change per issue. It no longer has to be
  *small* — a larger, ambitious build toward the vision is fine; just keep it coherent
  enough to review and, where a direction is big, say how it could land in stages.
- **Concrete.** Names the files/areas involved and describes the change precisely
  enough that Stage B can implement it without guessing the intent.
- **A real addition.** New features and new surface area are welcome when they serve
  the vision; fit the existing design system where you can.
- **Buildable with care** (design consistency where practical, tests, no rough edges).

## Algorithm for each run

1. **Look at the app.** Do the fresh **code analysis** and the **Playwright
   click-through** described above (mobile viewport first). This is the source of
   your candidates — don't skip it.
2. **Avoid duplicates.** Search existing open **and** recently closed issues and
   open PRs. Do not propose something already proposed, in flight, or recently
   rejected (check `AGENT_LEARNINGS.md` too). If the underlying problem behind
   a rejected issue is still worth solving and the human's rejection named a
   specific alternative, a re-proposal must build *that exact alternative*,
   not a variant of the rejected approach — treat their rejection comment as
   the spec for the retry. Two independent instances confirm this: #153→#199
   (raw X/Z fields rejected → the human's named alternative, a relative
   wall/piece-distance readout, merged clean) and #186→#170 (a CSS clip fix
   rejected → the human's named alternative, moving the buttons into the
   proposal menu, merged clean). See `AGENT_LEARNINGS.md`'s "rejection
   comment as retry spec" entry.
3. **Check recent human activity on the target path before proposing there.**
   `git log --since=24h -- <path>` (or equivalent) on the file/area a candidate
   touches. If the human has multiple merged PRs there in the last day, either
   skip proposing in that area this run or aim at the scale the human is clearly
   already working at — a narrow slice is likely to be made redundant within
   hours (`AGENT_LEARNINGS.md` has repeated examples). As of this writing,
   `src/lib/validation/` (the rule engine) and `server/` (AI proposal
   generation/repair) are hot in exactly this way — treat that as a live example
   of the check, not a permanent rule; re-verify against actual recent history
   each run rather than trusting this note indefinitely.
   This is *collision avoidance, not a no-go zone.* `src/lib/validation/` and
   `server/` are two of the three hardest problems the whole experience lives or
   dies by, so when they are **not** currently hot — or when you can propose at the
   scale the human is clearly already working at — they are exactly where the
   highest-value proposals live. Propose there deliberately; don't avoid the core
   out of habit.
4. **Generate candidates.** From what you read and saw, find the highest-value,
   in-scope work available right now across all three buckets — larger steps toward
   the long-term goal, bugs, and feature/GUI improvements (see *What to look for*).
5. **Select 9 in the mix** — aim for **~3 larger strategic steps, 3 bugs, and 3
   feature/GUI improvements**. Treat it as a target spread, not a rigid quota: if one
   bucket is genuinely thin this run, rebalance toward where the strong candidates
   actually are rather than padding with filler. Hold every one to the quality bar;
   if strong candidates are scarce, keep digging (more code analysis, more
   click-through) before settling for less. Every proposal becomes a real PR the
   human reviews, so make each one count.
6. **Create one issue per proposal** in the format below, labelled `agent:ready`.

## Issue format

- **Title:** short, imperative, specific (e.g. "Debounce the 2D wall-length input").
- **Body:**
  - **Problem / opportunity** — what's weak today and why it matters for the core
    experience (link to `STRATEGY.md`/`PURPOSE.md` reasoning).
  - **Evidence** — what you saw in the code analysis or the Playwright
    click-through that prompted this (a confusing step, a cramped mobile layout, an
    unused feature, …). A screenshot or file reference makes it concrete. **For a
    bug**, make the evidence a concrete repro: numbered **steps**, the **expected**
    behaviour, and the **actual** behaviour (a screenshot or console error helps).
  - **Proposed change** — what to do, concretely.
  - **Files / areas** — the likely files or components involved.
  - **Scope & non-goals** — what this deliberately does *not* touch, to keep it focused.
  - **Quality notes** — anything Stage B must respect (design tokens, tests, Esc
    handling, ≥44px touch targets, undo/redo — see `DESIGN.md`).
- **Label:** `agent:ready` (required — this is what Stage B watches).

## Guardrails

- **Target of 9 issues per run in a fixed mix** — **~3 larger steps toward the
  long-term goal, 3 bugs, and 3 feature/GUI improvements** (see *What to look for*).
  That is the intended volume and spread, not a ceiling to stay under. New features
  and new surface area toward the vision now count fully in the "larger steps" bucket,
  alongside deepening what exists; a bug fix or a removal counts fully too. The split
  is a target, not a rigid contract — rebalance across buckets when one is genuinely
  thin. The human reviews every resulting PR, so the brake is *quality*, not count:
  never pad the list with weak or duplicate ideas to hit the number.
- **Monetization and new surface area are in scope** — proposals for revenue models,
  new flows, and infrastructure toward the vision are welcome (`STRATEGY.md`,
  `VISION.md`). Build with care and taste.
- If, after a thorough look at the app, you genuinely cannot find 9 quality
  proposals, create as many strong ones as you can rather than filling the quota with
  filler.
- **Throttle volume, not quality, when the pipeline is jammed** — see *Check the
  pipeline can absorb it before proposing* above. A red default-branch CI or an
  already-large combined backlog is a reason to propose fewer, not a reason to
  propose worse.

## Labels

The pipeline uses five labels: `agent:ready`, `agent:building`, `agent:built`,
`agent:analyzed`, and `agent:question` (Stage C's channel for asking the human — not
yours to touch). They already exist in the repo. You only ever set `agent:ready`.
