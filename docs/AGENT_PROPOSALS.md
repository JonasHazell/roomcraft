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

From the code analysis and the click-through, look for improvements in **all** of
these categories, not just new features:

- **New features** — only when genuinely core to planning and furnishing a room
  (new surface area needs a strong justification; see below).
- **Changes to existing features** — deepen, finish, or fix a flow that's already
  there so it works better.
- **Removing unnecessary features** — cut things that add clutter, confuse the core
  journey, or aren't pulling their weight. A subtraction is a valid, valuable
  proposal.
- **GUI clarity & simplicity** — make the app **clearer and easier to use**:
  simpler layouts, more obvious controls, fewer choices, better mobile ergonomics.
  When in doubt, remove a choice rather than add one.

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
- **Deepening over new surface.** Prefer polishing/finishing something that exists
  over adding new features. New surface area needs a strong, core justification.
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
4. **Select up to `N` = 3** of the best. Fewer is fine. Quality over quantity —
   every proposal becomes a real PR the human has to review.
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

- **Hard cap of `N` = 3 new issues per run.** This is the main brake on how many
  PRs the human has to review. When in doubt, propose fewer.
- **No monetization-driven proposals** — that phase is parked (`STRATEGY.md`).
- **No speculative infrastructure** — build for the experience in front of us.
- If nothing meets the bar this run, **create nothing**. An empty run is a valid,
  good outcome.

## Labels

The pipeline uses four labels: `agent:ready`, `agent:building`, `agent:built`,
`agent:analyzed`. They already exist in the repo. You only ever set `agent:ready`.
