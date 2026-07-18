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

**Eighth snapshot** (this run, 2026-07-18). This run's 9 freshly-decided agent
PRs (#337–#346, minus the human's own #342) all merged, 0 rejected, via the
human's own large integration PR #357 (which merged all 11 same-batch open PRs
— 10 agent-built plus #342 — onto one branch and resolved their conflicts in a
single session; see `AGENT_LEARNINGS.md`'s new Scoping and Stage C methodology
entries). The matching 9 issues (#325–#333) were labelled in step. Also
processed: 3 more of the human's own merged PRs (#357 itself, #358, #360) — see
`AGENT_LEARNINGS.md`'s corrected distance-readout entry and new grouping-by-part
entry. No open `agent:question` issues to fold back (none exist yet). Δ is
versus the seventh snapshot.

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 74 / 81 = 91% | ↑ (was 90%) | +9 newly-decided agent PRs this run, all 9 merged, 0 rejected — cumulative 74 merged / 81 decided to date |
| Clean-merge rate | 70 / 74 = 95% | ↑ (was 97% off a smaller base; up from 63/65) | 7 of this run's 9 were clean; 2 (#337, #346) were touched by the human's own integration pass #357 for reasons unrelated to their own approach (an accessible-name collision and a room-creation-flow dependency — see `AGENT_LEARNINGS.md`'s Scoping section), not scope/approach misses. Not from auto-merge inflation — `agent:auto-merge` still unused |
| Edit rate | 4 / 74 = 5% | ↑ (was 3%) | the same 2 integration-touched PRs above, on top of the prior 2 |
| PR-rejection rate | 7 / 81 = 9% | ↓ (was 10%) | numerator unchanged (still #240, #239, #186, #153, #135, #129, #127) — denominator grew from this run's 9 new decisions, all merged |
| Issue-rejection rate | 5 / 79 = 6% | ↓ (was 7%) | numerator unchanged; denominator grew by the 9 issues newly decided this run |
| Median PR size | 74 lines | → (was 73) | this run's 9 freshly-merged agent PRs (additions+deletions), range 13–234 — essentially flat versus last run's 73-line median |
| Time-to-decision | ≈643 min (10.7h) median this run's PRs | ↑ (was ≈101 min) | **proxy metric, not the full definition** (PR-open→merge, not issue-open→decision). The jump is structural, not a slowdown in review care: all 9 PRs were opened within ~90 min on 2026-07-17 evening and sat overnight until the human's single integration session the next morning (#357) merged the whole batch at once, rather than reviewing each as it landed — see the new Scoping entry on same-day batches outrunning same-day review. Watch whether this recurs; if large batches keep waiting for one big integration pass, consider whether that's a sign Stage A/B's same-evening cadence is outrunning review capacity |
| Ready backlog | 9 | ↑ (was 0) | #348–#356, a fresh same-day Stage A batch (created ~02:20 UTC today) in the documented 3/3/3 mix — 3 bugs (#348 Plant colour, #349 Nightstand drawer clamp, #350 unguarded localStorage writes), 3 vision/monetization steps (#351 product link + Buy, #352 freemium gate, #353 shareable room link), 3 feature/consistency fixes (#354 Fridge doors material, #355 door leaf visual, #356 hide inert colour/material controls) — none yet claimed by Stage B |
| Stuck-building count | 0 confirmed | → (unchanged) | no open `agent:building` issues at all this run (the prior 9 all resolved via #357); nothing to reclaim |
| Duplicate-rejection count | 2 | → (unchanged) | #129, #135 — no new duplicate rejections this run |
| Open questions | 0 | → (unchanged) | none asked yet |
| Question-answer rate | n/a | → (unchanged) | no questions asked yet — first data point once Stage C opens one |
| AI proposal latency | not sampled this run | — | 8th consecutive run with no reachable server/runtime logs from this GitHub-only Stage C session — if this persists, worth a future Stage A proposal to log/export these metrics somewhere Stage C can reach |
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
