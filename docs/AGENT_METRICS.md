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

**Fifth snapshot** (this run, 2026-07-17). Cumulative counts computed from every
agent issue/PR to date (#124–#261; meta-PRs #131/#144/#169/#195/#219/#243 excluded,
as always). This run's new decisions: agent PRs #254,#255,#256,#257,#259,#260,#261
(7 decided, **7 merged clean, 0 rejected**), issues #229,#244,#245,#246,#248,#250,#251
(7 decided via a merged PR, 0 rejected) and #224 (1 decided — closed `not_planned`
directly by the human, no PR; the underlying rejection was already analyzed last run
via PR #240, so this is bookkeeping, not a new lesson). Also reviewed the human's own
merged PRs #258, #262, #265, #266 — see `AGENT_LEARNINGS.md`'s new "Stage C
methodology" and "Design & UI" entries, and the extended pipeline-infra entry under
"Areas to avoid." No open `agent:question` issues to fold back (none exist yet). Δ is
versus the fourth snapshot (from PR #243).

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 38 / 45 = 84% | ↑ (was 82%) | all 45 decided agent PRs to date; this run added 7 merges (#254,#255,#256,#257,#259,#260,#261) and 0 rejections |
| Clean-merge rate | 38 / 38 = 100% | → (was 100%) | every merged agent PR to date, including this run's 7 (each a single commit by the agent, no human-added commits), landed with zero changes to the agent's commits — 34 clean merges in a row across the last four runs |
| Edit rate | 0 / 38 = 0% | → (was 0%) | still no merged agent PR has ever needed a human edit |
| PR-rejection rate | 7 / 45 = 16% | ↓ (was 18%) | still just #127,#129,#135,#153,#186,#239,#240 — no new rejections this run |
| Issue-rejection rate | 5 / 43 = 12% | ↑ (was 11%) | of 43 *decided* `agent:ready` issues, 5 ever closed without a merged PR (#124,#125,#133,#148,#224) — this run's 7 newly-merged issues (#229,#244,#245,#246,#248,#250,#251) added 0 new rejections, and #224 (already analyzed last run as a rejection via PR #240) is now counted as decided since the human closed the issue itself this run |
| Median PR size | 126 lines | ↑ (was 106) | all 38 merged agent PRs to date (additions+deletions), sorted low→high; middle two of 38 are 117 and 135 (avg = 126) — a fifth straight run of increase (46→71→80→106→126). Clean-merge and edit rate are still 100%/0%, so still not promoting a size cap, but five consecutive increases with no counter-example is now past the "trend across runs" bar in `AGENT_ANALYSIS.md`'s promotion criteria — watch closely next run; a sixth increase or a first edit on a large PR should trigger tightening the "one issue → one small PR" guidance in `AGENT_BUILD.md` |
| Time-to-decision | ~3h8m median this run's window | ↑ (was ~2h40m) | this run's 8 newly-decided issues ran creation → decision in: 6 issues from the #244–#251 batch at a tight ~3h5m–3h9m each (issue open ~14:39–14:40 → merge ~17:45–17:49, all same day), plus two outliers pulling the mean but not the median much: #224 (~12h20m, issue open 02:47 → human closed it directly at 15:07) and #229 (~21h22m, issue open 02:47 → its PR #261 wasn't opened until 17:10, the same batch-merge window as the others, but didn't itself merge until the next day at 00:09 — a ~7h PR-open-to-merge gap with no review comment explaining it, unlike its six siblings which merged within ~40–120 minutes of opening) |
| Ready backlog | 4 | ↑ (was 1) | #252, #253, #263, #264 — open, not yet `agent:building`, no open PR; fresh Stage A proposals Stage B hasn't picked up yet, not stuck items |
| Stuck-building count | 1 confirmed (#205) + 2 in-progress (#247, #249) | → (was 2, see correction) | #205 (PR #239 closed unmerged) is still open, still labelled `agent:building`, not yet reclaimed despite `AGENT_BUILD.md`'s queue-finding step being promoted last run to do exactly this — no evidence yet either way on whether the new rule works, since Stage B hasn't been observed acting on it. **Correction to last run's snapshot:** #224 was *not* reclaimed by the new Stage B rule as previously assumed — `closed_by` on the issue shows the human closed it directly, and its `closed_at` (15:07 on 2026-07-16) predates last run's own stated timestamp (22:00 the same day), so last run's claim that "#205 and #224 ... both still open" was already stale by the time it was written; treat it as corrected, not as a rule having fired. #247 and #249 are freshly claimed same-day builds with no PR yet — not confirmed stuck, but worth checking next run if they're still `agent:building` with no PR by then |
| Duplicate-rejection count | 2 | → (was 2) | #129, #135 — no new duplicate rejections this run |
| Open questions | 0 | → (was 0) | none asked yet |
| Question-answer rate | n/a | → (was n/a) | no questions asked yet — first data point once Stage C opens one |
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
