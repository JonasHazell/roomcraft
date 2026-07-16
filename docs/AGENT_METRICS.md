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

**Fourth snapshot** (this run, 2026-07-16 22:00 UTC). Cumulative counts computed from
every agent issue/PR to date (#124–#240; meta-PRs #131/#144/#169/#195/#219 excluded,
as always). This run's new decisions: agent PRs #230–#237 (8 decided, **8 merged
clean, 0 rejected** — #232 landed via a same-day human conflict-resolution branch,
#238, see below), agent PRs #239/#240 (2 decided, **0 merged, 2 rejected**), issues
#220,#221,#222,#223,#225,#226,#227,#228 (8 decided, all via a merged PR — 0
rejected). Also reviewed the human's own merged PRs #238 (conflict-resolved rebase
of #232 — see `AGENT_LEARNINGS.md`'s same-file-conflict entry) and #242 (pipeline
tooling, matches the established "not a product signal" pattern; no new lesson). Δ
is versus the third snapshot (from PR #219).

| Metric | Value | Δ | Window / note |
| ------ | ----- | - | ------------- |
| Merge rate | 31 / 38 = 82% | → (was 82%) | all 38 decided agent PRs to date; this run added 8 merges (#230–#237) and 2 rejections (#239, #240) |
| Clean-merge rate | 31 / 31 = 100% | → (was 100%) | every merged agent PR to date, including this run's 8 (each a single commit by the agent, no human-added commits), landed with zero changes to the agent's commits — 27 clean merges in a row across the last three runs |
| Edit rate | 0 / 31 = 0% | → (was 0%) | still no merged agent PR has ever needed a human edit |
| PR-rejection rate | 7 / 38 = 18% | → (was 18%) | now #127,#129,#135,#153,#186,#239,#240 — 2 new this run, both from the same batch (see Stuck-building below) |
| Issue-rejection rate | 4 / 35 = 11% | ↓ (was 15%) | of 35 *decided* `agent:ready` issues, still only 4 ever closed without a merged PR (#124,#125,#133,#148) — this run's 8 newly-decided issues (#220–#228, excluding the still-open #224) all landed a merged PR, 0 new issue-level rejections (#205 and #224 are *stuck*, not rejected — see below, they stay open) |
| Median PR size | 106 lines | ↑ (was 80) | all 31 merged agent PRs to date (additions+deletions), sorted low→high, 16th of 31: 4,5,10,20,26,30,41,49,50,55,71,77,80,85,99,**106**,116,117,135,138,140,151,151,159,195,224,235,245,275,282,444 — a fourth straight run of increase (46→71→80→106). Still zero cost so far (clean-merge and edit rate both unchanged at 100%/0%), and this run's biggest outlier (#234, 444 lines) is a genuinely new feature (a keyboard-shortcuts modal) whose size is mostly its own e2e spec + docs, not scope creep — not promoting a size cap yet, but a fourth consecutive increase with no counter-example is close to the "trend across runs" bar; watch whether a future large PR *does* need an edit before treating this as free |
| Time-to-decision | ~2h40m this run's window | ↑ (was ~1.2h) | this run's 8 newly-decided issues (#220–#228 minus stuck #224) ran creation (~02:47) → decision in ~2h29m–2h45m each (median ~2h40m). Unlike last run, the spread here is mostly *build* latency, not review latency: all 8 merges landed in a tight 05:15–05:32 human-review burst, so the wait was Stage B working through a 10-issue batch serially (each subagent taking 15–45 min per several PR bodies' own notes about heavy concurrent host load), not the human sitting on a decision |
| Ready backlog | 1 | → (was 1) | #229 (name a duplicated room after its source) — open, not yet `agent:building`, no open PR; a fresh Stage A proposal Stage B hasn't picked up yet, not a stuck item |
| Stuck-building count | 2 | ↑ (was 0) | #205 and #224 — both still open, still labelled `agent:building`, both PRs (#239, #240) closed without merging. This is the *second* occurrence of the gap flagged last run ("watch for a second rejection leaving an issue stuck... before promoting a label-clearing rule") — landing twice in the same run clears that bar. **Promoted this run:** `AGENT_BUILD.md`'s queue-finding step now reclaims stuck `agent:building` issues whose PR closed unmerged (clearing the label, and closing the issue too when the PR's rejection was a plain "don't want this"). #205 and #224 themselves are left as-is here — Stage C cannot touch `agent:building` — for Stage B's next run to reclaim under the new rule |
| Duplicate-rejection count | 2 | → (was 2) | #129, #135 — #239/#240's rejections weren't "already did this myself" duplicates, so this count is unaffected |
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
