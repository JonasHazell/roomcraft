# Agent pipeline — Stage C: Analyse

> You are running as **Routine C** of the agent pipeline (see
> [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md)). Your job is to close the loop: learn from
> what the human did with each agent proposal and pull request — **and from the PRs the
> human built and merged themselves** — then feed that back three ways so the pipeline
> keeps getting better:
>
> 1. **Lessons** → append durable principles to [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md).
> 2. **Measurement** → refresh the metrics & monitoring snapshot in
>    [`AGENT_METRICS.md`](AGENT_METRICS.md).
> 3. **Self-improvement** → when a lesson or a metric has proven itself, edit the
>    **agent script** (the instruction docs) and the **loop** itself so the improvement
>    is baked in, not just remembered.
>
> Stages A and B read all three before proposing and building.

**Your primary job is to extract general principles, not to log one-off events.** Every
specific thing the human did is only evidence. The lesson you record must be the
*generalisable rule* behind it — the thing that will still apply to a different feature,
file, or screen next month. If the human made a change so that "button X no longer hides
button Y," the lesson is **"controls must not hide other controls,"** not the one-off
note about buttons X and Y. Always ask: *what is the underlying principle here, and how
would I state it so a future agent avoids the whole class of mistake?*

Repository: `<OWNER/REPO>`.

## What to look at each run

Find everything that has reached a decision but is **not** yet labelled `agent:analyzed`:

- **Agent pull requests** opened by Stage B (labelled `agent:built`) that are now
  **merged** or **closed**.
- **Issues** labelled `agent:ready` that the human **closed** without a merged PR (i.e.
  rejected before/instead of building).
- **The human's own merged pull requests** — PRs the human authored and hand-built
  themselves. These are the *richest positive examples of what "good" looks like in this
  repo*, so learn from them too.

**Skip** — do not analyse or label:

- **The human's own *closed* (un-merged) PRs.** A human closing their own PR is noise,
  not a rejection signal (superseded, abandoned spike, change of mind).
- **The pipeline's own meta-PRs**, including this stage's own learnings-update PR (branch
  `agent/learnings-update`) — never analyse your own output.

### Identifying the human's own PRs

If every PR in the repo is authored by the same account, there is **no author signal to
rely on**. Classify by **label and branch, not by author**:

- **Agent-built PR** → carries the `agent:built` label (branch `agent/…`). Read it with
  the agent-outcome recipe below.
- **The human's own PR** → a **merged** PR that does **not** carry `agent:built`. Read it
  with the human's-own recipe below.

Two things to get right when querying:

- **Trust `merged_at`, not the `merged` boolean.** Some PR-list APIs report
  `"merged": false` even on merged PRs; a PR is merged iff its `merged_at` is non-null.
- **Only look at PRs merged on or after `<SCOPE_START_DATE>`** (the day you activate the
  pipeline). Do **not** trawl the full history — older merged PRs are out of scope so the
  first runs don't drown in a backlog. Anything already carrying `agent:analyzed` is
  skipped, so each run only picks up what's new since the last one.

Process each in-scope item, then mark it `agent:analyzed` so it's never counted twice —
**including the human's own merged PRs** (yes, this stamps an agent label on hand-built
PRs; that's the intended dedup mechanism).

## How to read each outcome

For every item, work out the signal and *why* — then **generalise it into a rule**:

- **PR merged with no changes to the agent's commits** → the proposal *and* the
  implementation hit the mark. What general habit made it good? Record that.
- **PR merged after the human edited it** → **this is the richest signal.** Diff the
  agent's original commits against the final merged state. Identify exactly what the
  human changed — wrong approach, missed a design token, over-scoped, wrong file, style
  mismatch, missing test — then ask what *class* of mistake it represents and state the
  rule that would prevent all of them.
- **PR closed without merging** → rejected. Read any closing comment. Was the idea wrong,
  the scope too big, the timing off, or the execution poor? Generalise into what kinds of
  proposals or approaches to avoid.
- **Issue closed without a PR** → the proposal itself was rejected. Why wasn't it worth
  building? Turn it into a general rule for Stage A's proposal selection.

### How to read the human's own PRs

There is no agent baseline to diff against — treat the merged PR as an **exemplar of
work the human judged good enough to ship**, and mine it for what to *imitate*:

- **What did they choose to build, and how big did they make it?** Direct evidence of
  what's worth a proposal and what scope reads as "reviewable."
- **What patterns and conventions did they write by hand?** Token use, file layout, test
  coverage, PR-description shape. State the reusable convention, not the one-off detail.
- **Where are they actually investing?** Repeatedly hand-building in one area tells Stage
  A which core flows deserve proposals and which are being deliberately left alone.

Not every merged PR carries a durable lesson. A purely mechanical change (a `.gitignore`
line, a dependency bump, a typo fix) teaches nothing generalisable — record **no**
learning and simply mark it `agent:analyzed`. Only write an entry when there's a genuine,
reusable principle; don't manufacture one to fill the log.

## Writing the learnings

Append concise, actionable entries to [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md). Each
entry should be a **general principle** a future Stage A or Stage B agent can *act on*:

- **Lead with the principle.** State the durable, reusable rule as the lesson, and cite
  the specific case only as a brief example and for traceability. If a lesson could only
  ever apply to the one PR it came from, it's too narrow.
- Group by theme (proposal selection, scoping, design/UI, testing, code style, areas to
  avoid).
- Reference the issue/PR number so the principle is traceable to its evidence.
- If a lesson repeats, strengthen and broaden the existing entry rather than duplicating
  it — recurrence is a sign the principle should be stated more firmly.

Because this runs in a fresh session, land your changes as a **pull request** (branch
`agent/learnings-update`, targeting the default branch). The metrics refresh and any
agent-script/loop edits go in this **same PR** — one reviewable pipeline update per run.
The human merges it. You may label that PR `agent:built` so it shows up in the review
queue.

**Important:** mark the source issues/PRs `agent:analyzed` during this run regardless of
whether your PR is merged yet — that prevents re-analysis.

## Refreshing the metrics & monitoring snapshot

Beyond the qualitative lessons, quantify how the loop is doing and overwrite the snapshot
in [`AGENT_METRICS.md`](AGENT_METRICS.md). Read that file first — it defines every metric
and where each number comes from. In short, each run:

- **Compute the outcome metrics** from the items you already reviewed this run (merge
  rate, clean-merge vs edit rate, rejection rates, median PR size, time-to-decision).
- **Compute the pipeline-health metrics** from label state (ready backlog,
  stuck-`agent:building` items, duplicate-rejection count, empty-run rate).
- **Sample the product observability metrics** (latency, cost, calls, failure rate) from
  runtime logs *if* you can reach them from this session; otherwise mark those rows
  **"not sampled this run"** rather than guessing.
- **Overwrite** the snapshot block with current values, a direction arrow since last run,
  and the window each was computed over. It is a live dashboard — replace it, don't
  append.

Ground every number in something real (GitHub state or a log line). A blank marked "not
sampled" is honest; a fabricated figure poisons the loop.

## Improving the agent script and the loop

Recording a lesson is not enough — a principle that only lives in `AGENT_LEARNINGS.md`
still relies on a future agent reading and applying it. When a lesson has **proven
itself** or a **metric has moved the wrong way across more than one run**, promote it:
edit the agent script (the instruction docs) and, where warranted, the shape of the loop,
so the improvement is enforced by default.

**What you may edit in this stage** (agent pipeline docs only — never product code):

- **The stage instructions** — `AGENT_PROPOSALS.md`, `AGENT_BUILD.md`, this file. Turn a
  recurring learning into a hard rule at the point where the relevant stage will act on
  it.
- **The loop itself** — `AGENT_PIPELINE.md`. Tune the levers the metrics expose:
  proposal/PR caps, cadence, the label state machine, or the steps a stage runs.
- **The metrics themselves** — `AGENT_METRICS.md`. Add a metric when you find a blind
  spot; retire one that never informs a decision.

**Promotion criteria — be conservative.** The instructions are load-bearing; churning
them every run makes the pipeline unstable and unreviewable. Only promote when:

- the same lesson has recurred, **or** a metric shows a consistent trend across at least
  two runs, and
- the rule you'd add is **general** (applies to a class of future work, not one PR), and
- the edit is **small and surgical** — a tightened criterion, a new check, a changed cap
  — not a rewrite of a stage's philosophy.

When you do make a script/loop edit, **note it in the PR description** so the human can
review the behaviour change deliberately, and add a matching note in `AGENT_LEARNINGS.md`
so the provenance is traceable. If nothing meets the promotion bar this run, change no
instructions — an unchanged script is a fine outcome.

## Guardrails

- **Don't re-open or re-litigate** the human's decisions. You observe and learn.
- **Generalise, but stay grounded.** The recorded lesson should be a general rule, backed
  by the specific evidence. Never invent a principle the evidence doesn't support.
- **Stay inside the agent pipeline docs.** You may edit `AGENT_LEARNINGS.md`,
  `AGENT_METRICS.md`, and — under the promotion criteria above — the instruction docs.
  **Never change product code in this stage** — behaviour changes to the app are Stage
  A/B's job, proposed and built through the normal queue.
- **Never fabricate a metric.** If you can't derive a number from GitHub state or a log,
  mark it "not sampled this run."
- **Don't thrash the script.** One noisy run is not a trend.

## Labels

Set `agent:analyzed` on every issue/PR you process — this includes the human's own merged
PRs, which is how they're deduped across runs. Never set `agent:ready`, `agent:building`,
or (except on your own learnings/metrics/pipeline PR) `agent:built`. Never label the
human's own *closed* (un-merged) PRs or the pipeline's own meta-PRs.
