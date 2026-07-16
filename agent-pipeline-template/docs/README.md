# <PROJECT> documentation

> **[TEMPLATE]** This is the docs map. Keep the intro to a sentence or two once the
> real docs are written, and trim any rows below for docs you chose not to create.

This folder holds the project's reference docs: the *why* behind the product, how we
decide what to build, the design system, and the agent pipeline that proposes and
builds changes. Start here, then follow the links.

## Start here

If you're new to the project, read these, in order — they run from *why* to *how*:

1. [`PURPOSE.md`](PURPOSE.md) — **why** this product exists and the one promise it's
   built around.
2. [`VISION.md`](VISION.md) — **where** it's heading beyond the current phase.
3. [`STRATEGY.md`](STRATEGY.md) — **what** we build right now.
4. [`PRINCIPLES.md`](PRINCIPLES.md) — the operating principles and **non-goals** every
   change is judged against; the tie-breaker when two good options conflict.
5. [`DESIGN.md`](DESIGN.md) — the design system and quality bar. Read it before
   touching any user-facing surface.

## Product & direction

| Doc | What it's for |
| --- | --- |
| [`PURPOSE.md`](PURPOSE.md) | The single promise the product is built around. |
| [`VISION.md`](VISION.md) | Where the product is heading beyond the current phase — the direction proposals move toward. |
| [`STRATEGY.md`](STRATEGY.md) | How we decide what to build right now — depth over breadth. |
| [`PRINCIPLES.md`](PRINCIPLES.md) | The operating principles and non-goals every change is judged against; the tie-breaker for conflicts. |

## Design & UI

| Doc | What it's for |
| --- | --- |
| [`DESIGN.md`](DESIGN.md) | The design reference: tokens, component vocabulary, behaviour conventions. |

## Finding your way around the code

| Doc | What it's for |
| --- | --- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | The feature→code map: where each feature lives. Read it to find *where* something is. |

## The agent pipeline

A three-stage, agent-driven improvement loop. Agents **propose** changes as issues,
**build** each one into a pull request, and **analyse** what the human did so the next
round gets better. Start with the overview.

| Doc | Role |
| --- | --- |
| [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md) | **Overview** — the loop, the label state machine, the guardrails. Read this first. |
| [`AGENT_PROPOSALS.md`](AGENT_PROPOSALS.md) | Stage A — the Routine that proposes changes as issues. |
| [`AGENT_BUILD.md`](AGENT_BUILD.md) | Stage B — the Routine that turns issues into pull requests. |
| [`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md) | Stage C — the Routine that learns from each decision. |
| [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) | The pipeline's memory — durable, qualitative lessons appended by Stage C. |
| [`AGENT_METRICS.md`](AGENT_METRICS.md) | The pipeline's measurable memory — quantitative health and product monitoring. |

## A note on naming

The `AGENT_*.md` files are referenced by name from the live Routine prompts, so their
names are kept stable. When adding a new doc, prefer hyphenated lower-case
(`like-this.md`) unless it belongs to the agent pipeline.
