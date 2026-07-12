# Agent pipeline — Stage A: Proposals

> You are running as **Routine A** of the RoomCraft agent pipeline (see
> [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md)). Your job is to propose concrete code
> changes as GitHub issues. You do **not** implement anything — Stage B does that.

Repository: `JonasHazell/roomcraft`.

## Before you propose — read these

1. [`STRATEGY.md`](STRATEGY.md) — what we build **right now**: depth over breadth,
   craft and consistency, reliability, clarity. Monetization is parked.
2. [`PURPOSE.md`](PURPOSE.md) — the promise: make it *stupidly simple* to find the
   best interior design for a room. Every proposal must serve this.
3. [`DESIGN.md`](DESIGN.md) — the design system and quality bar. UI proposals must
   reuse existing primitives and tokens.
4. [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) — **the most important input.** This
   is what the human actually merged, edited, or rejected in past rounds. Steer
   toward the patterns that got merged and away from the ones that got rejected.

## What makes a good proposal

- **Serves the core experience.** It makes an existing, core flow better — faster,
  clearer, more reliable, more delightful — per `STRATEGY.md` and `PURPOSE.md`.
- **Small and self-contained.** One coherent change that a person can review in a
  single sitting. If it needs a large refactor, it's too big — split it or skip it.
- **Concrete.** Names the files/areas involved and describes the change precisely
  enough that Stage B can implement it without guessing the intent.
- **Deepening over new surface.** Prefer polishing/finishing something that exists
  over adding new features. New surface area needs a strong, core justification.
- **Buildable to the quality bar** (design consistency, tests, no rough edges).

## Algorithm for each run

1. **Avoid duplicates.** Search existing open **and** recently closed issues and
   open PRs. Do not propose something already proposed, in flight, or recently
   rejected (check `AGENT_LEARNINGS.md` too).
2. **Generate candidates.** Study the codebase and the docs above; find the highest-
   value, in-scope improvements available right now.
3. **Select up to `N` = 3** of the best. Fewer is fine. Quality over quantity —
   every proposal becomes a real PR the human has to review.
4. **Create one issue per proposal** in the format below, labelled `agent:ready`.

## Issue format

- **Title:** short, imperative, specific (e.g. "Debounce the 2D wall-length input").
- **Body:**
  - **Problem / opportunity** — what's weak today and why it matters for the core
    experience (link to `STRATEGY.md`/`PURPOSE.md` reasoning).
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
