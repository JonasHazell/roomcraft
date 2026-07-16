# Agent pipeline — metrics & monitoring

This file is the **measurable memory of the agent pipeline**. Where
[`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) captures *qualitative* lessons ("controls must
not hide other controls"), this file captures the *quantitative* health of the loop — how
often proposals get merged, how often they need editing, how big the PRs are, and how the
runtime behaves — so the pipeline can be steered by evidence, not vibes.

Stage C (see [`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md)) refreshes the snapshot below each
run. Stages A and B read it before proposing and building. A metric that keeps moving the
wrong way is a signal to change the **instructions** (the agent script) or the **loop**
itself — see [Acting on the metrics](#acting-on-the-metrics).

## What we measure

Three families of signal. Keep every number **grounded in something actually
observable** — GitHub state for the pipeline metrics, runtime logs for the product
observability metrics. Never invent a figure you can't derive.

### 1. Outcome metrics — is the loop producing work the human keeps?

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

| Metric | Definition | What it tells us |
| ------ | ---------- | ---------------- |
| **Ready backlog** | open issues labelled `agent:ready` not yet built | Is Stage B keeping up with Stage A? |
| **Stuck-building count** | issues `agent:building` with no PR for a long time | Crashed Stage B runs to reclaim |
| **Duplicate-rejection count** | rejections whose reason was "already did this myself" | Is Stage A's dedup check failing? |
| **Empty-run rate** | runs that produced nothing ÷ runs | Are the stages starved or over-cautious? |

### 3. Product observability — what the running app tells us

> **[TEMPLATE — fill in your sources]** The point of the loop is a better app, so the
> app's own runtime telemetry is a first-class **input**. List the metrics your product
> emits (latency, cost, error/timeout rate, calls per operation…) and exactly where each
> comes from (which log line, which file). This is often the *only* human-independent
> quality signal, so it is worth wiring up. If a fresh Stage C session can't reach the
> logs, that's fine — mark the rows "not sampled".

| Metric | Source | What it tells us |
| ------ | ------ | ---------------- |
| _e.g. request latency_ | _log line / file_ | Is the core wait getting worse? |
| _e.g. cost per operation_ | _log line / file_ | Is a change making it expensive? |
| _e.g. failure/timeout rate_ | _log line / file_ | Is the flow getting less reliable? |

Stage C won't always have runtime log access from a fresh session. When it does, record
the trend. When it doesn't, mark the row **"not sampled this run"** rather than
guessing — a blank is honest, a fabricated number is not.

## The snapshot

Stage C **overwrites** this section every run with the current picture — it's a live
dashboard, not an append-only log. Keep it compact: the current value, the direction
since last run (↑ / ↓ / →), and the window it was computed over.

<!-- STAGE C: overwrite everything between the markers below each run. -->
<!-- METRICS-SNAPSHOT:START -->

**No runs yet.** This is a fresh pipeline. Stage C will replace this block with the first
snapshot after its first analysis run. Until then there is nothing to report — do not
fabricate baseline numbers.

<!-- METRICS-SNAPSHOT:END -->

## Acting on the metrics

Numbers are only useful if they change behaviour. When a metric is out of line, the fix
is usually a change to the **agent script** (an instruction doc) or the **loop** (caps,
cadence, steps), which Stage C is allowed to make — see
[`AGENT_ANALYSIS.md`](AGENT_ANALYSIS.md) → *Improving the agent script and the loop*.
Some standing rules of thumb:

- **Edit rate climbing** → Stage B keeps missing something. Find the recurring edit, write
  the rule into `AGENT_BUILD.md` (and `AGENT_LEARNINGS.md`).
- **Issue-rejection rate climbing** → Stage A is proposing the wrong things. Tighten the
  selection criteria in `AGENT_PROPOSALS.md`.
- **Duplicate rejections recurring** → Stage A's dedup is too weak. Strengthen the "avoid
  duplicates" step.
- **Ready backlog growing** → Stage A is out-running Stage B. Lower Stage A's cap or raise
  Stage B's.
- **Median PR size creeping up** → scope discipline is slipping. Reinforce the "one issue
  → one small PR" rule.
- **Cost or latency trending up** → propose a performance/cost issue for that flow (a
  legitimate Stage A candidate).

**Don't over-steer.** A metric has to move consistently across **more than one run**
before it justifies changing an instruction — one noisy data point is not a trend. Record
the observation, and act when the pattern holds.
