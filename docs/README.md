# RoomCraft documentation

This folder holds the project's reference docs: the *why* behind the app, how we
decide what to build, the design system, the interior-design rule catalog, and the
agent pipeline that proposes and builds changes. This page is the map — start here,
then follow the links.

For the codebase itself, see the top-level [`../README.md`](../README.md) (setup,
features, deployment) and [`../CLAUDE.md`](../CLAUDE.md) (working conventions for
Claude).

## Start here

If you're new to the project, read these three, in order:

1. [`PURPOSE.md`](PURPOSE.md) — **why** RoomCraft exists and the one promise it's
   built around.
2. [`STRATEGY.md`](STRATEGY.md) — **what** we build right now: a small number of
   well-built features, mobile-first.
3. [`DESIGN.md`](DESIGN.md) — the UI design system and quality bar. Read it before
   touching any user-facing surface.

## Product & direction

The *why* and *what* — read these before proposing or shaping new work.

| Doc | What it's for |
| --- | --- |
| [`PURPOSE.md`](PURPOSE.md) | The single promise: make it *stupidly simple* to find the best interior design for a room. |
| [`STRATEGY.md`](STRATEGY.md) | How we decide what to build right now — depth over breadth, mobile-first, monetization parked. |
| [`TECHNICAL-CHALLENGES.md`](TECHNICAL-CHALLENGES.md) | The three hardest problems the core experience lives or dies by. |
| [`MONETIZATION.md`](MONETIZATION.md) | A future idea bank for revenue models — parked for now, not a current mandate. |

## Design & UI

Read both before creating or changing any screen, panel, dialog, or control.

| Doc | What it's for |
| --- | --- |
| [`DESIGN.md`](DESIGN.md) | The design reference: tokens, component vocabulary, behaviour conventions. Pairs with the `#styleguide` gallery. |
| [`MOBILE-FIRST.md`](MOBILE-FIRST.md) | How the one component set adapts across viewports — the mobile-first rules and breakpoints. |

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

## A note on naming

The `AGENT_*.md` files are referenced by name from the live Routine prompts, so
their names are kept stable even though they don't match the hyphenated style of the
other docs. When adding a new doc, prefer the hyphenated lower-case style
(`like-this.md`) unless it belongs to the agent pipeline.
