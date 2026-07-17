# Agent pipeline — Stage A: Proposals

> You are running as **Routine A** of the RoomCraft agent pipeline (see
> [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md)). Your job is to propose concrete code
> changes as GitHub issues. You do **not** implement anything — Stage B does that.

Repository: `JonasHazell/roomcraft`.

## Before you propose — read these

1. [`STRATEGY.md`](STRATEGY.md) — what we build **right now**: depth over breadth,
   craft and consistency, reliability, and above all a **simple, clear,
   mobile-first** experience. Monetization is parked.
2. [`PURPOSE.md`](PURPOSE.md) — the promise: make it *stupidly simple* to find the
   best interior design for a room. Every proposal must serve this.
3. [`VISION.md`](VISION.md) — where RoomCraft is heading beyond the current phase.
   Prefer proposals that move toward it, not just local polish.
4. [`PRINCIPLES.md`](PRINCIPLES.md) — the operating principles and **non-goals** every
   proposal is judged against. A proposal that violates a non-goal (feature sprawl,
   monetization-driven, speculative infrastructure) is out of scope no matter how good
   the idea, and the principles are the tie-breaker between two good candidates.
5. [`DESIGN.md`](DESIGN.md) — the design system and quality bar. UI proposals must
   reuse existing primitives and tokens.
6. [`MOBILE-FIRST.md`](MOBILE-FIRST.md) — the app is **mobile-first**, one component
   set for every screen. Judge every GUI idea on a phone first, not a desktop.
7. [`ARCHITECTURE.md`](ARCHITECTURE.md) — the feature→code map. Skim it to see
   what the app **already does** and where it lives, so you deepen an existing
   feature (depth over breadth) instead of proposing a duplicate.
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
[`STRATEGY.md`](STRATEGY.md#monetization-is-parked--for-now) and
[`VISION.md`](VISION.md#how-it-makes-money-later) (what's parked and why) and
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

## What to look for

Each run produces **9 proposals in a deliberate mix** — a fixed spread so the easy
finds never crowd out the hard, strategic work. Ground every one in the code analysis
and the click-through:

- **~3 larger steps toward the long-term goal** — the strategically weighty
  proposals. Advance one of `STRATEGY.md`'s **three hardest problems** — a
  simpler-yet-complete GUI, validation rules that are general *and* relevant, an AI
  engine that gives genuinely best suggestions — or move toward
  [`VISION.md`](VISION.md)'s destination. These are *bigger in ambition than local
  polish*, and often mean deepening or finishing a core flow so it's noticeably more
  complete (*depth over breadth* in practice). They must still be **small and
  self-contained enough to review in one sitting**: if a direction is genuinely large,
  propose the **first concrete slice** of it, not a sprawling refactor (see the
  small-PR guardrail below). Don't shy away from the core just because it's hard —
  but respect the hot-area timing check in step 3 so you don't collide with the
  human's own work.
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
  - *A genuinely-core new feature* — a small, self-contained addition to planning and
    furnishing a room, held to `PRINCIPLES.md`'s feature-sprawl non-goal — never the
    quota's reason for existing.
  - *Removing an unnecessary feature* — cutting clutter that confuses the core journey
    or isn't pulling its weight is a valid, valuable proposal.

The split is a **guide, not a rigid contract**: if a run genuinely surfaces four
strong bugs and only two strategic candidates, propose 4 + 2 rather than padding a
bucket or dropping a real find. Hold every proposal to the quality bar regardless of
bucket — the brake is quality, not hitting an exact per-bucket count.

## What makes a good proposal

- **Serves the core experience.** It makes an existing, core flow better — faster,
  clearer, simpler, more reliable, more delightful — per `STRATEGY.md` and
  `PURPOSE.md`.
- **Points toward the long-term goal, not just local polish.** Prefer proposals that
  advance one of `STRATEGY.md`'s three hardest problems or move toward
  [`VISION.md`](VISION.md)'s destination over cosmetic tweaks with no bearing on where
  the product is heading. A clean, safe, tiny diff is necessary but not sufficient —
  it should also *matter*.
- **Makes the app simpler and clearer, mobile-first.** The bar is a first-time user
  on a phone getting from an empty room to one they love with as little friction as
  possible. Prefer changes that remove steps, choices, or confusion.
- **Small and self-contained.** One coherent change that a person can review in a
  single sitting. If it needs a large refactor, it's too big — split it or skip it.
- **Concrete.** Names the files/areas involved and describes the change precisely
  enough that Stage B can implement it without guessing the intent.
- **A real addition.** Each feature adds something new that serves the core
  experience — but keep it small enough to land cleanly and fit the existing design
  system rather than sprawling into a new surface of its own.
- **Buildable to the quality bar** (design consistency, tests, no rough edges).

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
  - **Scope & non-goals** — what this deliberately does *not* touch, to keep it small.
  - **Quality notes** — anything Stage B must respect (design tokens, tests, Esc
    handling, ≥44px touch targets, undo/redo — see `DESIGN.md`).
- **Label:** `agent:ready` (required — this is what Stage B watches).

## Guardrails

- **Target of 9 issues per run in a fixed mix** — **~3 larger steps toward the
  long-term goal, 3 bugs, and 3 feature/GUI improvements** (see *What to look for*).
  That is the intended volume and spread, not a ceiling to stay under, and it is
  **not** a quota of *new features*: per *depth over breadth*, prefer deepening what
  exists over adding surface area, and a bug fix or a removal counts fully. The split
  is a target, not a rigid contract — rebalance across buckets when one is genuinely
  thin. The human reviews every resulting PR, so the brake is *quality*, not count:
  never pad the list with weak, sprawl-y, or duplicate ideas to hit the number.
- **No monetization-driven proposals** — that phase is parked (`STRATEGY.md`).
- **No speculative infrastructure** — build for the experience in front of us.
- If, after a thorough look at the app, you genuinely cannot find 9 in-scope,
  quality proposals, create as many strong ones as you can rather than filling the
  quota with filler.

## Labels

The pipeline uses five labels: `agent:ready`, `agent:building`, `agent:built`,
`agent:analyzed`, and `agent:question` (Stage C's channel for asking the human — not
yours to touch). They already exist in the repo. You only ever set `agent:ready`.
