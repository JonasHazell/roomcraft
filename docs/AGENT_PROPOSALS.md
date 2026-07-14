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
3. [`DESIGN.md`](DESIGN.md) — the design system and quality bar. UI proposals must
   reuse existing primitives and tokens.
4. [`MOBILE-FIRST.md`](MOBILE-FIRST.md) — the app is **mobile-first**, one component
   set for every screen. Judge every GUI idea on a phone first, not a desktop.
5. [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) — **the most important input.** This
   is what the human actually merged, edited, or rejected in past rounds. Steer
   toward the patterns that got merged and away from the ones that got rejected.
6. [`AGENT_METRICS.md`](AGENT_METRICS.md) — **measurability & monitoring.** The
   current snapshot tells you where the loop is weak (a climbing issue-rejection rate
   means your recent selection has been off) and, via the product-observability rows,
   where the *app* is weak. A rising AI proposal latency or cost, or a non-trivial
   failure rate, is a concrete, evidence-backed opening for a reliability/performance
   proposal — the kind of problem the Playwright click-through can't see. Let the
   numbers, not just intuition, point you at the highest-value gaps.

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
   anything that isn't obvious to a first-time user. Capture screenshots where they
   make a proposal concrete.

Let what you see in the running app — not just what the docs describe — drive what
you propose.

## What to look for

The focus of each run is **new features**: 10 concrete additions that make the app
better at planning and furnishing a room. Ground them in the code analysis and the
click-through, and let these categories shape the *kind* of feature you add:

- **New features** — the core of every run. Each should be genuinely useful for
  planning and furnishing a room, and buildable to the quality bar as a small,
  self-contained addition.
- **Changes to existing features** — deepen, finish, or fix a flow that's already
  there so it works better.
- **Removing unnecessary features** — cut things that add clutter, confuse the core
  journey, or aren't pulling their weight. A subtraction is a valid, valuable
  proposal.
- **GUI clarity & simplicity** — make the app **clearer and easier to use**:
  simpler layouts, more obvious controls, fewer choices, better mobile ergonomics.
  When in doubt, remove a choice rather than add one.
- **Reliability & performance the metrics reveal** — problems the click-through
  can't surface but the monitoring in [`AGENT_METRICS.md`](AGENT_METRICS.md) can: a
  slow or expensive AI proposal path, a rising failure/timeout rate, a repair loop
  that fans out into extra model calls. These are real, measurable degradations of
  the core flow; a proposal that cites the trend and targets the cause is well-founded.

## What makes a good proposal

- **Serves the core experience.** It makes an existing, core flow better — faster,
  clearer, simpler, more reliable, more delightful — per `STRATEGY.md` and
  `PURPOSE.md`.
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
   rejected (check `AGENT_LEARNINGS.md` too).
3. **Generate candidates.** From what you read and saw, find the highest-value,
   in-scope improvements available right now, across all the categories above (new
   features, changes to existing features, removals, and GUI clarity/simplicity).
4. **Select `N` = 10** of the best. Aim to fill the quota every run — each run
   should produce 10 concrete proposals for new features. Hold every one to the
   quality bar; if truly great candidates are scarce, keep digging (more code
   analysis, more click-through, more categories) until you have 10 that serve the
   core experience. Every proposal becomes a real PR the human reviews, so make
   each one count.
5. **Create one issue per proposal** in the format below, labelled `agent:ready`.

## Issue format

- **Title:** short, imperative, specific (e.g. "Debounce the 2D wall-length input").
- **Body:**
  - **Problem / opportunity** — what's weak today and why it matters for the core
    experience (link to `STRATEGY.md`/`PURPOSE.md` reasoning).
  - **Evidence** — what you saw in the code analysis or the Playwright
    click-through that prompted this (a confusing step, a cramped mobile layout, an
    unused feature, …). A screenshot or file reference makes it concrete.
  - **Proposed change** — what to do, concretely.
  - **Files / areas** — the likely files or components involved.
  - **Scope & non-goals** — what this deliberately does *not* touch, to keep it small.
  - **Quality notes** — anything Stage B must respect (design tokens, tests, Esc
    handling, ≥44px touch targets, undo/redo — see `DESIGN.md`).
- **Label:** `agent:ready` (required — this is what Stage B watches).

## Guardrails

- **Target of `N` = 10 new-feature issues per run.** Each run should create 10
  concrete proposals for new features — that is the intended volume, not a ceiling
  to stay under. The human reviews every resulting PR, so the brake is *quality*,
  not count: never pad the list with weak or duplicate ideas to hit the number.
- **No monetization-driven proposals** — that phase is parked (`STRATEGY.md`).
- **No speculative infrastructure** — build for the experience in front of us.
- If, after a thorough look at the app, you genuinely cannot find 10 in-scope,
  quality proposals, create as many strong ones as you can rather than filling the
  quota with filler.

## Labels

The pipeline uses four labels: `agent:ready`, `agent:building`, `agent:built`,
`agent:analyzed`. They already exist in the repo. You only ever set `agent:ready`.
