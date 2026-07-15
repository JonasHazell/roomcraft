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

### 2. Pipeline-health metrics — is the machine itself running cleanly?

Computed from label state and run history:

| Metric | Definition | What it tells us |
| ------ | ---------- | ---------------- |
| **Ready backlog** | open issues labelled `agent:ready` not yet built | Is Stage B keeping up with Stage A? |
| **Stuck-building count** | issues `agent:building` with no PR for a long time | Crashed Stage B runs to reclaim |
| **Duplicate-rejection count** | rejections whose reason was "already did this myself" | Is Stage A's dedup check failing? |
| **Empty-run rate** | runs that produced nothing ÷ runs | Are the stages starved or over-cautious? |

### 3. Product observability — what the running app tells us

The point of the loop is a better app, so the app's own runtime telemetry is a
first-class **input**, not an afterthought. The server already logs, per AI proposal,
the wall-clock duration, the Claude API cost in USD, the token counts, and the number
of model calls (grep `[proposals]` in `server/planning.ts` / `server/claude.ts`).
Surface those as trends so proposals can target real cost/latency/reliability problems
the click-through can't see:

| Metric | Source | What it tells us |
| ------ | ------ | ---------------- |
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

**Second snapshot** (this run, 2026-07-15 22:00 UTC). Cumulative counts computed from
every agent issue/PR to date (#124–#189; meta-PRs #131/#144/#169 excluded, as always).
This run's new decisions: agent PRs #180–#189 (10 decided, 9 merged clean, 1 rejected —
#186), issues #171–#179 (9 decided via their PRs) plus #148 (its second, final decision
— see note below). Δ is versus the first snapshot (from PR #169).

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 13 / 18 = 72% | ↑ (was 50%) | all 18 decided agent PRs to date; this run added 9 merges (#180–#185,#187–#189) and 1 rejection (#186) |
| Clean-merge rate | 13 / 13 = 100% | → (was 100%) | every merged agent PR to date, including this run's 9, landed with zero changes to the agent's commits |
| Edit rate | 0 / 13 = 0% | → (was 0%) | still no merged agent PR has ever needed a human edit |
| PR-rejection rate | 5 / 18 = 28% | ↓ (was 50%) | #127,#129,#135,#153,#186 closed unmerged |
| Issue-rejection rate | 4 / 17 = 24% | ↓ (was 43%) | of 17 *decided* `agent:ready` issues, 4 closed without a merged PR (#124,#125,#133,#148). #148 is counted this run: its PR (#153) was rejected last run but the issue itself stayed open until the human closed it alongside merging the previous learnings PR (#169) — same pattern to watch for on #170 (see stuck-building below) |
| Median PR size | 71 lines | ↑ (was 46) | all 13 merged agent PRs to date (additions+deletions): 5,10,20,26,49,50,**71**,106,138,140,151,245,275 — this run's batch ran larger (#187 275, #189 245, #188 138) than the mostly-CSS first batch |
| Time-to-decision | ~3.4 h this run's window | ↓ (was ~7h) | this run's 10 newly-decided issues (#171–#179, #148) ran creation→decision in 3h19m–3h32m each, except #148 (created 2026-07-14, decided 15h38m after — its *second* decision, following the #153 rejection last run). First-snapshot figure (~7h) isn't directly comparable since raw per-item hours for that batch weren't retained; both windows are reported rather than an invalid combined median |
| Ready backlog | 0 | ↓ (was 1) | no open `agent:ready` issue without `agent:building` — #148 closed this run, #170 is open but already `agent:building` (see next row) |
| Stuck-building count | 1 | ↑ (was 0) | #170 — its PR (#186) was closed unmerged, but `agent:building`/`agent:ready` were never cleared from the issue. Not a crash, just an unfinished loop-back: the same limbo #148 sat in for a full run after #153's rejection, until the human closed it. Watch #170 next run — if it's still open and unlabelled-clean, that's a second instance and worth a label-state-machine fix (who clears `agent:building` when the linked PR is rejected is currently unspecified) |
| Duplicate-rejection count | 2 | → (was 2) | #129, #135 — no new duplicate rejections this run |
| AI proposal latency | not sampled this run | — | still no reachable server/runtime logs from this GitHub-only Stage C session |
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

**Don't over-steer.** A metric has to move consistently across **more than one run**
before it justifies changing an instruction — one noisy data point is not a trend.
Record the observation, and act when the pattern holds.
