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

**Ninth snapshot** (this run, 2026-07-19). This run's 8 freshly-decided agent
PRs (#371–#378, from issues #348–#350/#354–#356/#362/#363) all merged clean, 0
rejected, 0 edited. The matching 8 issues were labelled in step. No open
`agent:question` issues to fold back, and no hand-built human PRs merged since
2026-07-14 to process this run. **Headline finding, not just a number:** 7 of
these 8 merged via `agent:auto-merge` — the first real use of the auto-merge
lever — but their own `E2E (desktop + mobile)` required check was reporting
`failure` at the exact commit that merged, and `main`'s own latest push is
failing the same check right now. See `AGENT_LEARNINGS.md`'s new Pipeline
reliability entry and the matching `AGENT_BUILD.md` promotion. Δ is versus the
eighth snapshot.

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 82 / 89 = 92% | ↑ (was 91%) | +8 newly-decided agent PRs this run, all 8 merged, 0 rejected |
| Clean-merge rate | 78 / 82 = 95% | → (was 95%) | **split, as this file's own guidance asks now that auto-merge is a meaningful share:** human-reviewed 71/75 = 95% (unchanged mix of prior clean/edited PRs plus this run's one human-merged #373, itself clean); auto-merged 7/7 = 100% **by construction** (auto-merge only completes on a passing-checks PR with no further edits) — that 100% is not evidence of review quality, see the required-check-integrity finding below, which casts doubt on whether "passing checks" was even true |
| Edit rate | 4 / 82 = 5% | → (was 5%) | no new edits this run |
| PR-rejection rate | 7 / 89 = 8% | ↓ (was 9%) | numerator unchanged — denominator grew by this run's 8 new decisions, all merged |
| Issue-rejection rate | 5 / 87 = 6% | → (was 6%) | numerator unchanged; denominator grew by the 8 issues newly decided this run |
| Median PR size | 65 lines | ↓ (was 74) | this run's 8 freshly-merged agent PRs (additions+deletions), range 2–309 (the 2-line Nightstand clamp to the 309-line storage-guard PR) |
| Time-to-decision | ≈1294 min (21.6h) median, true definition | n/a (was a different proxy metric) | **computed via the actual definition (issue-open → merge/close) for the first time**, not the PR-open→merge proxy used last run — not directly comparable to the prior ≈643 min figure. Two sub-batches: the 02:2x-created issues (#348–#350/#354–#356) waited ~21.5h; the 14:4x-created issues (#362/#363) waited ~9.3h; both groups merged in the same late-evening burst (23:54–23:59 UTC), consistent with Stage B/auto-merge processing a queue in one pass rather than issue age driving order |
| Ready backlog | 10 | ↑ (was 9) | #364–#370 (a fresh 7-issue Stage A batch, created 2026-07-18T14:4x) plus #351–#353 (the 3 vision/monetization proposals from the 02:2x batch — **still unbuilt, now >24h old**, while the 6 smaller bugs/features from that same batch were all built same-evening). Worth watching next run: do #351–#353 finally get built, or does Stage B keep passing over the larger/vision-scoped issues in favor of newer, smaller arrivals? One occurrence so far, not yet a pattern |
| Stuck-building count | 0 confirmed | → (unchanged) | no open `agent:building` issues at all this run |
| Duplicate-rejection count | 2 | → (unchanged) | #129, #135 — no new duplicate rejections this run |
| Open questions | 0 | → (unchanged) | none asked yet |
| Question-answer rate | n/a | → (unchanged) | no questions asked yet |
| **Required-check integrity** | **failed this run** | **new metric** | Spot-checked via `get_check_runs` on all 8 PRs' head commits: #371/#372/#374–#378 each show `E2E (desktop + mobile): failure` at their merged commit, yet still auto-merged; `main`'s own latest CI run (post-#361) fails the identical 4 mobile specs right now. Most likely cause: branch protection's required-status-checks list may not actually include the `E2E (desktop + mobile)` context. **Needs a human check of Settings → Branches** — see `AGENT_LEARNINGS.md` |
| AI proposal latency | not sampled this run | — | 9th consecutive run with no reachable server/runtime logs from this GitHub-only Stage C session |
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
