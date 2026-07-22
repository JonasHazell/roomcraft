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
| **AI proposal latency** | `durationMs` in `[proposals]` server logs; median/p95 in [`AI_RUNTIME_METRICS.md`](AI_RUNTIME_METRICS.md) | Is the core AI wait getting worse? |
| **AI proposal cost** | `costUsd` in `[proposals]` server logs; total in [`AI_RUNTIME_METRICS.md`](AI_RUNTIME_METRICS.md) | Is a change making the backend expensive? |
| **AI calls per proposal** | `calls` in `[proposals]` server logs; average in [`AI_RUNTIME_METRICS.md`](AI_RUNTIME_METRICS.md) | Are repair/retry loops fanning out? |
| **AI failure/timeout rate** | error/timeout log lines; rate in [`AI_RUNTIME_METRICS.md`](AI_RUNTIME_METRICS.md) | Is the flow getting less reliable? |

Stage C won't always have production log access from a fresh session — but as of
#402 it doesn't need it for these four rows: every AI generation is persisted to the
`ai_generations` table (`server/db.ts`, written by `server/aiMetrics.ts`) and
aggregated into the checked-in, machine-generated
[`AI_RUNTIME_METRICS.md`](AI_RUNTIME_METRICS.md) by a scheduled workflow
(`.github/workflows/export-ai-metrics.yml`) — read it directly, the same way this
file itself is read. When that doc still shows its "no export has run yet" seed state
(no `DATABASE_URL`/`METRICS_DATABASE_URL` secret configured yet, or the workflow
hasn't run), or when a PR surfaces these numbers some other way, use those instead.
Only when neither is available should a row be marked **"not sampled this run"**
rather than guessing — a blank is honest, a fabricated number is not.

## The snapshot

Stage C **overwrites** this section every run with the current picture — it's a live
dashboard, not an append-only log. Keep it compact: the current value, the direction
since last run (↑ / ↓ / →), and the window it was computed over. Cite issue/PR numbers
only where a single item dominates a metric.

<!-- STAGE C: overwrite everything between the markers below each run. -->
<!-- METRICS-SNAPSHOT:START -->

**Thirteenth snapshot** (this run, 2026-07-21). **Empty run for outcomes, fifth
consecutive** — zero agent PRs merged/closed, zero issues rejected, zero human
PRs merged since the twelfth snapshot; confirmed directly, still no PR merged to
`main` since #397 on 2026-07-19T14:25 and no fresh CI run on the default branch
since. The escalation this run isn't a new outcome, it's a mechanism failure the
prior four runs' own fixes couldn't have caught: **the twelfth snapshot's own
promoted fix — the backlog/CI-aware proposal throttle added to
`AGENT_PROPOSALS.md` — has had zero effect**, because it only exists on this
still-unmerged `agent/learnings-update` branch. Stage A reads instruction docs
from the default branch on every fresh run, so it has been proposing at full,
unthrottled volume the entire time, oblivious to its own supposed fix. Direct
proof: issue #435 was opened at 2026-07-21T03:00:27Z — nearly two hours *after*
the throttle commit (01:12) — with no throttling comment anywhere, and the
combined backlog grew from 53 to **62** in the ~19 hours since. See
`AGENT_LEARNINGS.md`'s new Pipeline reliability entry ("a promoted fix is inert
until its PR merges"). The required-check outage itself is now **~2.5 days**
unresolved (5th consecutive flag), and this meta-PR has now sat unreviewed,
with no human comment, across **five** runs. Δ is versus the twelfth snapshot.

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 83 / 90 = 92% | → (unchanged) | no new decisions this run |
| Clean-merge rate | 79 / 83 = 95% | → (unchanged) | no new decisions this run |
| Edit rate | 4 / 83 = 5% | → (unchanged) | no new decisions this run |
| PR-rejection rate | 7 / 90 = 8% | → (unchanged) | no new decisions this run |
| Issue-rejection rate | 5 / 88 = 6% | → (unchanged) | no new decisions this run |
| Median PR size | 641 lines (n=1) | → (unchanged) | still last run's single data point; no new merges to add to it |
| Time-to-decision | ≈1422 min (23.7h) median | → (unchanged) | no new decisions this run |
| Ready backlog | 30 | ↑↑ (was 20) | issues `agent:ready` **without** `agent:building` (30, incl. #435); a fresh Stage A batch landed even after the (unmerged, thus inert) throttle was written — direct evidence the promotion hasn't taken effect, see above |
| Stuck-building count | 0 | → (unchanged) | all 16 `agent:building` issues have their own open PR (#389–#395, #398, #400, #410–#416); none abandoned |
| Duplicate-rejection count | 2 | → (unchanged) | #129, #135 — no new duplicate rejections this run |
| Open questions | 0 | → (unchanged) | none asked yet |
| Question-answer rate | n/a | → (unchanged) | no questions asked yet |
| **Required-check integrity** | **still failing, unresolved (~2.5 days, 5th consecutive flag)** | **→ (unchanged, still bad)** | `main`'s latest CI run (head `0f047fa`, after #397) is still the most recent — no fresher run to re-check since nothing has merged. Combined backlog (ready-without-building + building + open built PRs) is now **62** (30 + 16 + 16), up from 53 last run. Still needs the human's Settings → Branches check (repo-admin action only a human can take), a merge/review of this meta-PR itself so the throttle actually takes effect, and separately a fix for `door-leaf-fade.spec.ts`'s orbit-drag timeout — see `AGENT_LEARNINGS.md` |
| AI proposal latency | not sampled this run | — | 13th consecutive run with no reachable server/runtime logs from this GitHub-only Stage C session |
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
