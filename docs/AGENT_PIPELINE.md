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
it proposes; it gets better at *how it runs*. The same stage also **keeps the
descriptive reference docs honest** — the merged changes it reads are what make those
docs go stale, so it corrects drift it can fix and asks the human when a doc is
genuinely ambiguous.

The whole thing is driven by three [Routines](https://code.claude.com/docs/en/claude-code-on-the-web)
(scheduled triggers). Each Routine fires into a **fresh session** on a schedule and
does one job. The stages don't share memory — **GitHub (issues, pull requests, and
labels) is the shared state** that carries work from one stage to the next.

## The loop at a glance

```
Routine A — Propose        Routine B — Build           Routine C — Analyse
  twice daily                twice daily                 twice daily
      │                          │                            │
  reads the docs +           picks up to 10 per run,       reads merged/closed agent
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

Stage C mostly **observes** your decisions, but it has one path to **ask**: when it
can't confidently tell *why* you did something and the guess would meaningfully steer
future work, it opens an `agent:question` issue for you, and a later run folds your
answer back into the learnings (see the label table below and
[`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md)).

There is **no human gate between propose and build** — everything proposed gets
built so you can look at real, working changes before deciding. Your decision point
is the **merge** on each pull request — with one scoped exception: small, low-risk
bug fixes and minor GUI improvements can **auto-merge once every required check
passes** (see the guardrails below and `AGENT_BUILD.md` →
[*When to auto-merge*](AGENT_BUILD.md#when-to-auto-merge)). Everything larger still
waits for you.

## The label state machine

Labels are the backbone. They are the contract between stages.

| Label            | Meaning                                                                 | Set by      |
| ---------------- | ----------------------------------------------------------------------- | ----------- |
| `agent:ready`    | Issue is queued for automatic implementation. **This is the trigger.**  | A (or you)  |
| `agent:building` | Routine B has claimed the issue and is implementing it (avoids doubles) | B           |
| `agent:built`    | A pull request is open and waiting for your merge decision              | B           |
| `agent:auto-merge` | PR is a small, low-risk fix cleared to merge itself once checks pass  | B           |
| `agent:analyzed` | Routine C has already learned from this issue/PR (won't re-process)     | C           |
| `agent:question` | Routine C opened this issue to ask **you** something; answer in a comment | C         |

**`agent:ready` is your one lever:**

- To stop an issue from being built, remove `agent:ready` or close the issue.
- To build anything by hand — even an issue **you** wrote — add `agent:ready` to it
  and Routine B will pick it up on its next run.

**`agent:question` runs the other way — Routine C asks, you answer.** When Stage C
can't confidently tell *why* you did something and the guess would meaningfully steer
future work, it opens an `agent:question` issue instead of recording a shaky rule
(see [`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md) → *Asking the human a question*). Just
reply in a comment — no label to manage — and a later Routine C run folds your answer
into `AGENT_LEARNINGS.md` and closes the issue. It's the loop's one path where the
human is asked rather than only observed.

## Where the instructions live

Two layers, on purpose:

1. **The Routine prompt** (inside the trigger config) is thin — it just points to
   the matching doc below.
2. **The instruction docs** (this folder) hold the actual behaviour and are
   version-controlled, so you edit how the agents think in a normal pull request.

| Stage       | Instruction doc                              | Routine schedule       |
| ----------- | -------------------------------------------- | ---------------------- |
| A — Propose | [`AGENT_PROPOSALS.md`](AGENT_PROPOSALS.md)   | twice daily, 02 & 14 UTC |
| B — Build   | [`AGENT_BUILD.md`](AGENT_BUILD.md)           | twice daily, 03 & 15 UTC |
| C — Analyse | [`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md)     | twice daily, 01 & 13 UTC |

The taste — *what* is worth building — comes from the docs the agents read:
[`PURPOSE.md`](PURPOSE.md), [`VISION.md`](VISION.md), [`STRATEGY.md`](STRATEGY.md),
[`PRINCIPLES.md`](PRINCIPLES.md), [`DESIGN.md`](DESIGN.md), and the two files Stage C
keeps current: [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md)
(qualitative lessons) and [`AGENT_METRICS.md`](AGENT_METRICS.md) (quantitative health
+ product monitoring). Those two files are what close the loop: your merge decisions,
turned into lessons and numbers, feed back into the next round of proposals — and,
when a pattern is strong enough, into the agent instructions themselves.

## Guardrails

- **Volume is set at Stage A.** With no approval gate, the proposal target
  (`N` per day, currently 9 proposals in a fixed mix — **~3 larger steps toward the
  long-term goal, 3 bugs, and 3 feature/GUI improvements**, not a quota of new surface
  area) sets how many PRs you get. The brake is quality, not count — every proposal
  must clear the bar.
- **Stage B builds up to 10 PRs per run**, claiming and building each issue **one at a
  time** so a crashed run strands at most the single in-flight issue instead of a
  whole batch; a larger backlog drains in order across successive runs rather than all
  at once. The cap comfortably covers Stage A's 9-proposal target so a full batch can
  drain in a single run. The per-run cap is a throughput knob, not a safety one — since one-at-a-time
  claiming means a bigger batch can never strand work, raise the cap (or the run
  cadence) if the ready backlog grows.
- **Auto-merge is scoped to small, low-risk fixes.** By default every change waits
  for you — that's still the norm. The one exception is a **small bug fix or minor
  GUI improvement** that clears every bar in `AGENT_BUILD.md` →
  [*When to auto-merge*](AGENT_BUILD.md#when-to-auto-merge): Stage B labels it
  `agent:auto-merge` and enables GitHub auto-merge, so it lands **only once every
  required check is green** — lint, test, build, **and the e2e run in desktop +
  mobile** (`ci.yml`). The checks are the gate, so auto-merge can only add a merge to
  a PR that already passes; it never lands anything the human would have blocked.
  Anything larger, novel, or ambiguous still waits for your review.
- **One issue = one small PR.** Keep scope tight and reviewable.
- **Self-improvement stays reviewable too.** Stage C may edit the agent instruction
  docs and the loop's levers (caps, cadence, steps), and may correct **factual drift**
  in the descriptive reference docs (`ARCHITECTURE.md`, `MOBILE-FIRST.md`,
  `interior-design-rules.md`, the READMEs, and `DESIGN.md`'s factual parts) — but only
  inside a normal PR you merge, never product code, and never a wholesale rewrite. It
  never rewrites the intent of the human-owned direction & taste docs; where those are
  unclear it asks via `agent:question`. It changes the script conservatively, when a
  lesson recurs or a metric trends (see
  [`AGENT_METRICS.md`](AGENT_METRICS.md) → *Acting on the metrics*).

## Activation note

The Routines run in fresh sessions that clone the repository's **default branch**.
These instruction docs must be **merged to the default branch** before the Routines
can read them. Until this setup PR is merged, the Routines are configured but will
not find their instructions.

**One-time label setup:** the `agent:question` label is new. Create it in the repo
(any colour) before Stage C next runs — GitHub rejects an issue created with a label
that doesn't exist, so the first question would otherwise fail to post. The
`agent:auto-merge` label (below) is also new — create it too. The other four pipeline
labels already exist.

**One-time auto-merge setup (human, in GitHub settings).** Stage B can only *request*
auto-merge; the repo has to allow it and have something to gate on, so before the
scoped auto-merge above can work you must, once:

1. **Settings → General → Pull Requests → enable "Allow auto-merge."** Without this,
   `enable_pr_auto_merge` fails and every PR simply waits as before (safe default).
2. **Protect the default branch with the CI checks as *required* status checks** —
   `Lint, test & build` **and** `E2E (desktop + mobile)` from `ci.yml`. This is what
   makes auto-merge wait for green: with no required check, GitHub would merge
   immediately, defeating the safety gate. (A required review would also gate it, but
   the point here is to gate on CI, not to reintroduce a manual click.)
3. **Create the `agent:auto-merge` label** (any colour).

Until steps 1–2 are done, nothing auto-merges — Stage B's request is simply refused
and the PR waits for you, exactly as today. So this change is safe to merge before the
settings are flipped.
