# RoomCraft documentation

This folder holds the project's reference docs: the *why* and the *vision* behind the
app, how we decide what to build and the principles that guide it, the design system,
the interior-design rule catalog, and the agent pipeline that proposes and builds
changes. This page is the map — start here, then follow the links.

For the codebase itself, see the top-level [`../README.md`](../README.md) (setup,
features, deployment) and [`../CLAUDE.md`](../CLAUDE.md) (working conventions for
Claude).

## Start here

If you're new to the project, read these, in order — they run from *why* to *how*:

1. [`PURPOSE.md`](PURPOSE.md) — **why** RoomCraft exists and the one promise it's
   built around.
2. [`VISION.md`](VISION.md) — **where** it's heading beyond the current phase.
3. [`STRATEGY.md`](STRATEGY.md) — **what** we build now: build toward the vision —
   deepen the core *and* expand the surface, including monetization.
4. [`PRINCIPLES.md`](PRINCIPLES.md) — the operating values every change is weighed
   against; guidance for good, ambitious work.
5. [`DESIGN.md`](DESIGN.md) — the UI design system and quality bar. Read it before
   touching any user-facing surface.

## Product & direction

The *why*, the *where*, the *what*, and the rules every change is judged against —
read these before proposing or shaping new work.

| Doc | What it's for |
| --- | --- |
| [`PURPOSE.md`](PURPOSE.md) | The single promise: make it *stupidly simple* to find the best interior design for a room. |
| [`VISION.md`](VISION.md) | Where RoomCraft is heading beyond the current phase — the direction proposals should move toward. |
| [`STRATEGY.md`](STRATEGY.md) | How we decide what to build now — build toward the vision, deepen the core *and* expand the surface (monetization included) — and the hardest problems the experience lives or dies by. |
| [`PRINCIPLES.md`](PRINCIPLES.md) | The operating values every change is weighed against; guidance for good, ambitious work, not a rejection checklist. |

## Design & UI

Read both before creating or changing any screen, panel, dialog, or control.

| Doc | What it's for |
| --- | --- |
| [`DESIGN.md`](DESIGN.md) | The design reference: tokens, component vocabulary, behaviour conventions. Pairs with the `#styleguide` gallery. |
| [`MOBILE-FIRST.md`](MOBILE-FIRST.md) | How the one component set adapts across viewports — the mobile-first rules and breakpoints. |

## Finding your way around the code

An orientation map to jump from a feature to the files that implement it.

| Doc | What it's for |
| --- | --- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | The feature→code map: surfaces, stores, and which files own each feature. Read it when you need to find *where* something lives. |

## Interior-design rule catalog

The rules the app uses to judge and improve a layout.

| Doc | What it's for |
| --- | --- |
| [`interior-design-rules.md`](interior-design-rules.md) | The structured rule catalog — safety, accessibility, ergonomics, feng shui — that the rule engine and the agent docs reference. |

## The agent pipeline

A three-stage, agent-driven improvement loop. Agents **propose** changes as issues,
**build** each approved one into a pull request, and **analyse** what the human did
so the next round gets better. Start with the overview.

| Doc | Role |
| --- | --- |
| [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md) | **Overview** — the loop, the label state machine, the guardrails. Read this first. |
| [`AGENT_PROPOSALS.md`](AGENT_PROPOSALS.md) | Stage A — instructions for the Routine that proposes changes as issues. |
| [`AGENT_BUILD.md`](AGENT_BUILD.md) | Stage B — instructions for the Routine that turns issues into pull requests. |
| [`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md) | Stage C — instructions for the Routine that learns from each decision. |
| [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) | The pipeline's memory — durable, qualitative lessons appended by Stage C. |
| [`AGENT_METRICS.md`](AGENT_METRICS.md) | The pipeline's measurable memory — quantitative health and product monitoring. |
| [`AI_RUNTIME_METRICS.md`](AI_RUNTIME_METRICS.md) | Machine-generated: AI proposal latency/cost/reliability, exported from the `ai_generations` table on a schedule (#402) so Stage C can read real numbers without production log access. Feeds `AGENT_METRICS.md`'s "Product observability" rows. |

## A note on naming

The `AGENT_*.md` files are referenced by name from the live Routine prompts, so
their names are kept stable even though they don't match the hyphenated style of the
other docs. When adding a new doc, prefer the hyphenated lower-case style
(`like-this.md`) unless it belongs to the agent pipeline.
