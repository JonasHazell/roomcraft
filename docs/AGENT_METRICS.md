# Agent pipeline — metrics & monitoring

This file is the **measurable memory of the agent pipeline**. Where
[`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) captures *qualitative* lessons ("controls
must not hide other controls"), this file captures the *quantitative* health of the
loop — how often proposals get merged, how often they need editing, how big the PRs
are, how much the AI backend costs and how fast it runs — so the pipeline can be
steered by evidence, not vibes.

Stage C (see [`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md)) refreshes the snapshot below
each run. Stages A and B read it before proposing and building. A metric that keeps
moving the wrong way is a signal to change the **instructions** (the agent script) or
the **loop** itself — see [Acting on the metrics](#acting-on-the-metrics).

## What we measure

Three families of signal. Keep every number **grounded in something actually
observable** — GitHub state for the pipeline metrics, server logs for the product
observability metrics. Never invent a figure you can't derive.

### 1. Outcome metrics — is the loop producing work the human keeps?

Computed from the items Stage C already reviews each run (issues + PRs that have
reached a decision). Track them over a **rolling window** (the items in scope this
run, plus the running totals carried in the snapshot):

| Metric | Definition | What it tells us |
| ------ | ---------- | ---------------- |
| **Merge rate** | merged PRs ÷ decided agent PRs | Are proposals worth building at all? |
| **Clean-merge rate** | merged with **no** human edits ÷ merged | Is Stage B hitting the mark first try? |
| **Edit rate** | merged **after** human edits ÷ merged | How much rework each PR costs the human |
| **PR-rejection rate** | closed-unmerged ÷ decided agent PRs | Are we building the wrong things? |
| **Issue-rejection rate** | issues closed with no PR ÷ proposed issues | Is Stage A proposing the wrong things? |
| **Median PR size** | lines changed across merged agent PRs | Are diffs staying small and reviewable? |
| **Time-to-decision** | median hours from issue open → merge/close | How long work sits waiting on the human |

**Auto-merged PRs are a caveat on the clean-merge rate.** PRs Stage B landed via
auto-merge (labelled `agent:auto-merge`) are *by construction* merged with no human
edits, so they inflate the clean-merge rate without being evidence the human reviewed
and approved the work unchanged. When they're a meaningful share of merges, report
the clean-merge rate **split** — human-reviewed vs auto-merged — so the "Stage B hit
the mark first try" signal stays honest. A rising auto-merge share is itself worth a
note: it means more work is landing unreviewed, which is fine only while quality holds.

### 2. Pipeline-health metrics — is the machine itself running cleanly?

Computed from label state and run history:

| Metric | Definition | What it tells us |
| ------ | ---------- | ---------------- |
| **Ready backlog** | open issues labelled `agent:ready` not yet built | Is Stage B keeping up with Stage A? |
| **Stuck-building count** | issues `agent:building` with no PR for a long time | Crashed Stage B runs to reclaim |
| **Duplicate-rejection count** | rejections whose reason was "already did this myself" | Is Stage A's dedup check failing? |
| **Empty-run rate** | runs that produced nothing ÷ runs | Are the stages starved or over-cautious? |
| **Open questions** | open `agent:question` issues awaiting an answer | Is the question channel backing up or unused? |
| **Question-answer rate** | answered ÷ asked `agent:question` issues | Are the questions worth asking — does the human engage? |
| **Required-check integrity** | were merged PRs' required checks actually green at merge time (spot-checked via `get_check_runs`)? | Is the auto-merge safety gate actually enforcing, or only nominally configured? |

### 3. Product observability — what the running app tells us

The point of the loop is a better app, so the app's own runtime telemetry is a
first-class **input**, not an afterthought. The server already logs, per AI proposal,
the wall-clock duration, the Claude API cost in USD, the token counts, and the number
of model calls (grep `[proposals]` in `server/planning.ts` / `server/claude.ts`).
Surface those as trends so proposals can target real cost/latency/reliability problems
the click-through can't see:

| Metric | Source | What it tells us |
| ------ | ------ | ----------------- |
| **AI proposal latency** | `durationMs` in `[proposals]` server logs | Is the core AI wait getting worse? |
| **AI proposal cost** | `costUsd` in `[proposals]` server logs | Is a change making the backend expensive? |
| **AI calls per proposal** | `calls` in `[proposals]` server logs | Are repair/retry loops fanning out? |
| **AI failure/timeout rate** | error/timeout log lines | Is the flow getting less reliable? |

Stage C won't always have production log access from a fresh session. When it does
(or when a PR surfaces these numbers), record the trend. When it doesn't, mark the
row **"not sampled this run"** rather than guessing — a blank is honest, a fabricated
number is not.

## The snapshot

Stage C **overwrites** this section every run with the current picture — it's a live
dashboard, not an append-only log. Keep it compact: the current value, the direction
since last run (↑ / ↓ / →), and the window it was computed over. Cite issue/PR numbers
only where a single item dominates a metric.

<!-- STAGE C: overwrite everything between the markers below each run. -->
<!-- METRICS-SNAPSHOT:START -->

**Seventeenth snapshot** (this run, 2026-07-23). **Empty run for outcomes, third
consecutive** — zero new merged/closed agent PRs, zero new issue rejections, zero
new human-authored merges since the sixteenth snapshot; `main` has not advanced at
all (still `5b7630d`, the same head the sixteenth snapshot checked — confirmed via a
fresh `git fetch`). Re-verified all four scan channels directly: the only
`agent:built` PRs matching merged-or-closed-and-not-`agent:analyzed` are this
stage's own 11 prior meta-PRs (out of scope by definition, left untouched); zero
`agent:ready` issues closed without a merged PR are missing `agent:analyzed`; zero
human-authored merged PRs since 2026-07-14 are missing `agent:built`/`agent:analyzed`;
zero open `agent:question` issues to fold back.

**Resolved since last snapshot:** #407, the stuck-`agent:building` issue the
sixteenth snapshot flagged (no PR since 2026-07-19), now has an open PR (#456,
opened 2026-07-23T05:22:35Z) — Stage B's reclaim mechanism caught up on its own,
no Stage C action needed. All 8 currently-`agent:building` issues (#402, #403,
#404, #405, #406, #407, #408, #409) now each have their own open PR
(#450/#451/#455/#453/#454/#456/#457/#458) — checked individually, per this file's
own "a single stuck issue can hide in a healthy-looking batch" habit. Stuck-building
count is back to 0.

`E2E (desktop + mobile)` **still failing** — reconfirmed on the freshest available
check run, PR #458's own (same `5b7630d` base, completed 2026-07-23T06:04:14Z):
`E2E (desktop + mobile)`: `failure`, `Lint, test & build`: `success`. The candidate
fix is still in flight and still unmerged: **#452** ("Fix server deploy crash +
split E2E CI into a blocking smoke gate," human-authored, open) hasn't changed
state since the sixteenth snapshot noted it.

**PR #448 (this meta-PR, carrying the sixteenth snapshot) is itself still open**,
about 1.3 days since creation, with only a bot deploy-status comment (no human
reply) — a normal review-queue wait so far, not yet the multi-run stall the
thirteenth snapshot escalated. This run folds its update into #448 rather than
opening a new PR, per the reuse-the-branch rule. Δ is versus the sixteenth
snapshot.

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 102 / 109 = 94% | → (unchanged) | no new decisions this run |
| Clean-merge rate | 98 / 102 = 96% | → (unchanged) | no new decisions this run |
| Edit rate | 4 / 102 = 4% | → (unchanged) | no new decisions this run |
| PR-rejection rate | 7 / 109 = 6% | → (unchanged) | no new decisions this run |
| Issue-rejection rate | 5 / 107 ≈ 5% | → (unchanged) | no new decisions this run |
| Median PR size | 140 lines (n=19, last run) | → (unchanged) | no new merges to add to it |
| Time-to-decision | ≈63.1h (~2.6 days) median (n=19, last run) | → (unchanged) | no new decisions this run |
| Ready backlog | 28 | ↓ (was 31) | issues `agent:ready` **without** `agent:building`; net decrease as more of the prior batch moved into `agent:building`/open PRs, offset by fresh issues (#417–#443 range; latest #449 already counted last run) |
| Stuck-building count | 0 | ↓ (was 1) | #407 resolved — see above; all 8 `agent:building` issues now have their own open PR |
| Duplicate-rejection count | 2 | → (unchanged) | #129, #135 — no new duplicate rejections this run |
| Open questions | 0 | → (unchanged) | none asked this run either |
| Question-answer rate | n/a | → (unchanged) | no questions asked yet |
| **Required-check integrity** | **still failing — reconfirmed on the freshest available run** | **→ (unchanged, still bad)** | Freshest check run available, PR #458 on `5b7630d` (completed 2026-07-23T06:04:14): `E2E (desktop + mobile)`: `failure`, `Lint, test & build`: `success`. Human's own PR #452 (open, unmerged) still targets this directly. Combined backlog (ready-without-building 28 + building 8 + open `agent:built` PRs incl. this meta-PR 9) is **45**, up from 41 — expected motion (8 issues moved from bare `agent:building` into open PRs, several fresh issues added), not a regression |
| AI proposal latency | not sampled this run | — | 17th consecutive run with no reachable server/runtime logs from this GitHub-only Stage C session; #402/PR #450 would fix this once merged |
| AI proposal cost | not sampled this run | — | same as above |
| AI calls per proposal | not sampled this run | — | same as above |
| AI failure/timeout rate | not sampled this run | — | same as above |

<!-- METRICS-SNAPSHOT:END -->

## Acting on the metrics

Numbers are only useful if they change behaviour. When a metric is out of line, the
fix is usually a change to the **agent script** (an instruction doc) or the **loop**
(caps, cadence, steps), which Stage C is now allowed to make — see
[`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md) → *Improving the agent script and the loop*.
Some standing rules of thumb:

- **Edit rate climbing** → Stage B keeps missing something. Find the recurring edit,
  write the rule into `AGENT_BUILD.md` (and `AGENT_LEARNINGS.md`).
- **Issue-rejection rate climbing** → Stage A is proposing the wrong things. Tighten
  the selection criteria in `AGENT_PROPOSALS.md`.
- **Duplicate rejections recurring** → Stage A's dedup is too weak. Strengthen the
  "avoid duplicates" step (this is exactly what the #129/#135 learnings warned about).
- **Ready backlog growing** → Stage A is out-running Stage B. Lower Stage A's cap or
  raise Stage B's, in `AGENT_PROPOSALS.md` / `AGENT_BUILD.md`.
- **Median PR size creeping up** → scope discipline is slipping. Reinforce the
  "one issue → one small PR" rule.
- **AI cost or latency trending up** → propose a performance/cost issue for that flow
  (a legitimate Stage A candidate, per `AGENT_PROPOSALS.md`).
- **Required-check integrity failing** → stop trusting the platform gate; verify each
  auto-merge candidate's checks directly (now in `AGENT_BUILD.md`), and flag the
  repo-settings gap for the human immediately — this one doesn't wait for a trend,
  see `AGENT_LEARNINGS.md`'s Pipeline reliability entry.

**Don't over-steer.** A metric has to move consistently across **more than one run**
before it justifies changing an instruction — one noisy data point is not a trend.
Record the observation, and act when the pattern holds.
