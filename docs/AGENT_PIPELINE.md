# Agent pipeline — overview

This document describes a three-stage, agent-driven improvement loop for RoomCraft.
Agents **propose** changes as issues, **build** every approved proposal into a pull
request for you to review, and **analyse** what you did with each one so the next
round of proposals gets better.

The analyse stage closes the loop on **three** channels, not one: durable *lessons*
([`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md)), *measurement & monitoring*
([`AGENT_METRICS.md`](AGENT_METRICS.md) — how often work gets merged/edited/rejected,
PR sizes, and the app's own AI latency/cost/reliability telemetry), and
*self-improvement* — editing the agent instruction docs and the loop itself when a
lesson or metric has proven itself. So the pipeline doesn't just get better at *what*
it proposes; it gets better at *how it runs*.

The whole thing is driven by three [Routines](https://code.claude.com/docs/en/claude-code-on-the-web)
(scheduled triggers). Each Routine fires into a **fresh session** on a schedule and
does one job. The stages don't share memory — **GitHub (issues, pull requests, and
labels) is the shared state** that carries work from one stage to the next.

## The loop at a glance

```
Routine A — Propose        Routine B — Build           Routine C — Analyse
  daily 06:00                every 2 hours               daily 22:00
      │                          │                            │
  reads the docs +           picks EVERY open issue        reads merged/closed agent
  AGENT_LEARNINGS.md +       labelled `agent:ready`,       PRs, rejected issues, and
  AGENT_METRICS.md,          opens a PR (`Closes #N`),     the human's own merged PRs;
  creates issues             labels the PR `agent:built`   updates LEARNINGS + METRICS,
  labelled `agent:ready`                                   tunes the agent docs/loop
      │                          │                            │
      └──── (no gate) ───────────┴──── YOU decide ────────────┘
                                       merge / edit+merge / close
```

Stage C's outputs — the lessons, the metrics snapshot, and any tuning of the
instruction docs — feed straight back into Stages A and B on their next run. That
feedback edge is what makes this a *loop* rather than a one-way conveyor.

There is **no human gate between propose and build** — everything proposed gets
built so you can look at real, working changes before deciding. Your only decision
point is the **merge** on each pull request.

## The label state machine

Labels are the backbone. They are the contract between stages.

| Label            | Meaning                                                                 | Set by      |
| ---------------- | ----------------------------------------------------------------------- | ----------- |
| `agent:ready`    | Issue is queued for automatic implementation. **This is the trigger.**  | A (or you)  |
| `agent:building` | Routine B has claimed the issue and is implementing it (avoids doubles) | B           |
| `agent:built`    | A pull request is open and waiting for your merge decision              | B           |
| `agent:analyzed` | Routine C has already learned from this issue/PR (won't re-process)     | C           |

**`agent:ready` is your one lever:**

- To stop an issue from being built, remove `agent:ready` or close the issue.
- To build anything by hand — even an issue **you** wrote — add `agent:ready` to it
  and Routine B will pick it up on its next run.

## Where the instructions live

Two layers, on purpose:

1. **The Routine prompt** (inside the trigger config) is thin — it just points to
   the matching doc below.
2. **The instruction docs** (this folder) hold the actual behaviour and are
   version-controlled, so you edit how the agents think in a normal pull request.

| Stage       | Instruction doc                              | Routine schedule |
| ----------- | -------------------------------------------- | ---------------- |
| A — Propose | [`AGENT_PROPOSALS.md`](AGENT_PROPOSALS.md)   | daily 06:00 UTC  |
| B — Build   | [`AGENT_BUILD.md`](AGENT_BUILD.md)           | every 2 hours    |
| C — Analyse | [`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md)     | daily 22:00 UTC  |

The taste — *what* is worth building — comes from the docs the agents read:
[`STRATEGY.md`](STRATEGY.md), [`PURPOSE.md`](PURPOSE.md), [`DESIGN.md`](DESIGN.md),
and the two files Stage C keeps current: [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md)
(qualitative lessons) and [`AGENT_METRICS.md`](AGENT_METRICS.md) (quantitative health
+ product monitoring). Those two files are what close the loop: your merge decisions,
turned into lessons and numbers, feed back into the next round of proposals — and,
when a pattern is strong enough, into the agent instructions themselves.

## Guardrails

- **Volume is controlled at Stage A.** With no approval gate, the proposal cap
  (`N` per day, default 2–3) is the main brake on how many PRs you get. Keep it low.
- **Stage B caps PRs per run** (default 3) so a large `agent:ready` backlog can't
  generate a flood of PRs at once.
- **Nothing auto-merges.** Every change waits for you.
- **One issue = one small PR.** Keep scope tight and reviewable.
- **Self-improvement stays reviewable too.** Stage C may edit the agent instruction
  docs and the loop's levers (caps, cadence, steps), but only inside a normal PR you
  merge — never product code, and never a wholesale rewrite. It changes the script
  conservatively, when a lesson recurs or a metric trends (see
  [`AGENT_METRICS.md`](AGENT_METRICS.md) → *Acting on the metrics*).

## Activation note

The Routines run in fresh sessions that clone the repository's **default branch**.
These instruction docs must be **merged to the default branch** before the Routines
can read them. Until this setup PR is merged, the Routines are configured but will
not find their instructions.
