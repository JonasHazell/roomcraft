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

**Seventh snapshot** (this run, 2026-07-18). This run cleared a large backlog: the
5 PRs left undecided at the sixth snapshot (#279, #280, #281, #282, #283) plus 22
more agent-built PRs opened and decided since then all reached a merge decision,
and 51 closed `agent:ready` issues (most from earlier Stage B runs whose PRs were
already counted in a prior snapshot but whose *issue* label was never stamped
`agent:analyzed`) were caught up on labelling. Of the 51 issues, 27 correspond to
this run's 27 freshly-decided agent PRs — the other 24 were bookkeeping catch-up
only and are **not** double-counted in the outcome metrics below. Also processed:
11 of the human's own merged PRs (#295, #296, #300, #305, #314, #319, #323, #324,
#334, #335, #336) — see `AGENT_LEARNINGS.md`'s new entries, including the
"Direction change" note on #335's strategy/vision/principles rewrite. No open
`agent:question` issues to fold back (none exist yet). Δ is versus the sixth
snapshot.

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 65 / 72 = 90% | ↑ (was 84%) | +27 newly-decided agent PRs this run, all 27 merged, 0 rejected — cumulative 65 merged / 72 decided to date |
| Clean-merge rate | 63 / 65 = 97% | ↓ (was 100%) | first non-clean merges on record: 25 of this run's 27 were clean; 2 (#279/#205, #297/#263) needed human-assisted conflict resolution (#296, #305) — see `AGENT_LEARNINGS.md`'s Scoping section. Not from an auto-merge inflation — `agent:auto-merge` hasn't been used on any of these yet |
| Edit rate | 2 / 65 = 3% | ↑ (was 0%) | the same 2 human-assisted merges above; both were branch-staleness conflicts, not scope/approach misses |
| PR-rejection rate | 7 / 72 = 10% | ↓ (was 16%) | numerator unchanged (still #240, #239, #186, #153, #135, #129, #127) — denominator grew from this run's 27 new decisions, all merged |
| Issue-rejection rate | 5 / 70 = 7% | ↓ (was 12%) | numerator unchanged; denominator grew by the 27 issues newly decided this run (the 24 catch-up-only issues were already counted in a prior snapshot's denominator, so not added again) |
| Median PR size | 73 lines | ↓ (was 126) | this run's 27 freshly-merged agent PRs (additions+deletions), reversing the five-run growth trend flagged previously — range 19–331 lines, driven down by a cluster of small validation-threshold and copy fixes (#297–#299, #301–#313) |
| Time-to-decision | ≈101 min (1.7h) median | — (no prior data) | **proxy metric, not the full definition:** PR-open→merge latency for this run's 27 fresh merges (true issue-open→decision time not sampled — would need each issue's `created_at`, not gathered this run). Bimodal: 20 PRs opened same-day as a late-afternoon batch merged within ~1–14 min of opening (human was actively reviewing), the other 7 (opened earlier in the day, mostly the #279–#283 backlog) took 1.3–5.5h |
| Ready backlog | 0 | ↓ (was 12) | fully drained — all 9 currently-open `agent:ready` issues (#325–#333) already have an open `agent:built` PR (#337–#346), confirmed 1:1 by spot-checking PR bodies' `Closes #N` |
| Stuck-building count | 0 confirmed | → (unchanged) | all 9 open `agent:building` issues verified to have a matching open PR; none stuck without one |
| Duplicate-rejection count | 2 | → (unchanged) | #129, #135 — no new duplicate rejections this run |
| Open questions | 0 | → (unchanged) | none asked yet |
| Question-answer rate | n/a | → (unchanged) | no questions asked yet — first data point once Stage C opens one |
| AI proposal latency | not sampled this run | — | 7th consecutive run with no reachable server/runtime logs from this GitHub-only Stage C session — if this persists, worth a future Stage A proposal to log/export these metrics somewhere Stage C can reach |
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
