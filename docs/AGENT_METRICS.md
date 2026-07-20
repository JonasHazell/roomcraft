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

**Tenth snapshot** (this run, 2026-07-20). Only one freshly-decided agent PR this
run — #397 (issue #368, "Room summary"), merged clean, 0 edits — plus one hand-built
human PR, #396 ("Fade door leaves in lock-step with their host wall"), also merged
clean. No open `agent:question` issues to fold back. **Headline: the required-check
gap flagged last run (#379, still open/unmerged) has not been resolved, and it's now
compounded by a second, new E2E failure** — `e2e/door-leaf-fade.spec.ts` (added by
#396) times out in every CI run since it merged, on top of the 4 already-known mobile
flakes. `main`'s own latest CI run is `failure`. The built-but-unmerged backlog grew
from 7 to 15 PRs in the same window, none able to cleanly pass the required E2E check.
Also found and closed a stray duplicate meta-PR (#399, wrong branch) — see
`AGENT_LEARNINGS.md`'s new Pipeline reliability entries for all three findings. Δ is
versus the ninth snapshot.

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 83 / 90 = 92% | → (was 92%) | +1 newly-decided agent PR this run (#397), merged, 0 rejected |
| Clean-merge rate | 79 / 83 = 95% | → (was 95%) | split: human-reviewed 72/76 = 95% (this run's #397 was human-reviewed-and-merged, not auto-merged, so it joins this bucket clean); auto-merged still 7/7 = 100% by construction, unchanged this run (no new auto-merges — see Required-check integrity row) |
| Edit rate | 4 / 83 = 5% | → (was 5%) | no new edits this run |
| PR-rejection rate | 7 / 90 = 8% | → (was 8%) | numerator unchanged; denominator +1 |
| Issue-rejection rate | 5 / 88 = 6% | → (was 6%) | numerator unchanged; denominator +1 (issue #368) |
| Median PR size | 641 lines (n=1) | ↑ (was 65) | this run's only freshly-merged agent PR, #397, is a single large data point (636 additions + 5 deletions) — one of the run's *larger steps toward the vision* per `AGENT_PIPELINE.md`'s 3/3/3 mix, not evidence of scope creep on the usual small-fix PRs; treat as low-confidence with n=1 |
| Time-to-decision | ≈1422 min (23.7h) median, true definition (issue-open → merge) | → (was ≈1294 min / 21.6h) | single data point (#368 created 2026-07-18T14:43 → #397 merged 2026-07-19T14:25), broadly consistent with last run's true-definition figure |
| Ready backlog | 11 | ↑ (was 10) | issues `agent:ready` **without** `agent:building` (claimed-but-unbuilt issues don't count as backlog): #401–#409 (a fresh 9-issue batch, created 2026-07-19T14:56) plus #387/#388 (unclaimed stragglers from the 2026-07-19T02:48 batch) |
| Stuck-building count | 1 (#386) | ↑ (was 0) | of 16 open `agent:building` issues, 15 have an open PR; #386 ("furniture part's colour swatch below 44px touch target," claimed 2026-07-19T02:49) has none — see `AGENT_LEARNINGS.md`'s new entry. Left for Stage B's reclaim step |
| Duplicate-rejection count | 2 | → (unchanged) | #129, #135 — no new duplicate rejections this run |
| Open questions | 0 | → (unchanged) | none asked yet |
| Question-answer rate | n/a | → (unchanged) | no questions asked yet |
| **Required-check integrity** | **still failing, unresolved** | **↓ (worse)** | No new auto-merges this run to test whether branch protection was fixed — `main`'s own required `E2E (desktop + mobile)` check is still red (reconfirmed on the push right after #397), now failing for *two* independent reasons (the pre-existing 4-spec mobile flake **and** the new `door-leaf-fade.spec.ts` CI-only timeout from #396). The built-but-unmerged backlog roughly doubled (7→15) in the same window. Still needs a human check of Settings → Branches, and now also a fix for the new spec/regression — see `AGENT_LEARNINGS.md` |
| AI proposal latency | not sampled this run | — | 10th consecutive run with no reachable server/runtime logs from this GitHub-only Stage C session |
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
