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

**Third snapshot** (this run, 2026-07-16 22:00 UTC). Cumulative counts computed from
every agent issue/PR to date (#124–#215; meta-PRs #131/#144/#169/#195 excluded, as
always). This run's new decisions: agent PRs #206–#215 (10 decided, **10 merged
clean, 0 rejected**), issues #170,#196–#204 (10 decided, all via a merged PR — 0
rejected). Also reviewed the human's own merged PRs #216/#218 (pipeline tooling — a
PR template + its same-day media-attachment fix; no product lesson, see
`AGENT_LEARNINGS.md`). Δ is versus the second snapshot (from PR #195).

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 23 / 28 = 82% | ↑ (was 72%) | all 28 decided agent PRs to date; this run added 10 merges (#206–#215) and 0 rejections |
| Clean-merge rate | 23 / 23 = 100% | → (was 100%) | every merged agent PR to date, including this run's 10 (each a single commit by the agent, no human-added commits), landed with zero changes to the agent's commits — 19 clean merges in a row across the last two runs |
| Edit rate | 0 / 23 = 0% | → (was 0%) | still no merged agent PR has ever needed a human edit |
| PR-rejection rate | 5 / 28 = 18% | ↓ (was 28%) | still just #127,#129,#135,#153,#186 — no new rejections this run |
| Issue-rejection rate | 4 / 27 = 15% | ↓ (was 24%) | of 27 *decided* `agent:ready` issues, still only 4 closed without a merged PR (#124,#125,#133,#148) — this run's 10 newly-decided issues (#170,#196–#204) all landed a merged PR, 0 rejections |
| Median PR size | 80 lines | ↑ (was 71) | all 23 merged agent PRs to date (additions+deletions), sorted: 4,5,10,20,26,30,49,50,55,71,77,**80**,106,116,135,138,140,151,224,235,245,275,282 — this run's batch (4–282, median 98 on its own) pulled the running median up for a third straight run (46→71→80). No PR this run needed an edit or was flagged as too large, so this hasn't cost anything yet — but three consecutive increases is worth watching next run before treating it as a trend to act on |
| Time-to-decision | ~1.2 h this run's window | ↓ (was ~3.4h) | this run's 10 newly-decided issues (#196–#204) ran creation→decision in 0h53m–1h28m each (median ~1h14m); #170 is the outlier at 13h17m — created in the earlier #171–#179 batch, but only rebuilt (as #214) this run after sitting through last run's #186 rejection. Excluding #170, median drops to ~1h13m |
| Ready backlog | 1 | ↑ (was 0) | #205 (`HistoryBar` → shared `SelBar` primitives) — open, not yet `agent:building`, no open PR; a fresh Stage A proposal Stage B hasn't picked up yet, not a stuck item |
| Stuck-building count | 0 | ↓ (was 1) | resolved: #170 (last run's stuck instance, after #186's rejection) was rebuilt this run as #214 and merged. The label-state-machine gap flagged last run (who clears `agent:building` when a linked PR is rejected) didn't need a code fix — Stage A simply re-proposed the same issue with the human's named fix and Stage B built it — but the gap itself is still unaddressed; watch for a *second* rejection leaving an issue stuck with no re-proposal before promoting a label-clearing rule |
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
