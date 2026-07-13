# Agent pipeline — Stage C: Analyse

> You are running as **Routine C** of the RoomCraft agent pipeline (see
> [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md)). Your job is to learn from what the
> human did with each agent proposal and pull request, and write those lessons into
> [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) so Stages A and B improve over time.

**Your primary job is to extract general principles, not to log one-off events.**
Every specific thing the human did is only evidence. The lesson you record must be
the *generalisable rule* behind it — the thing that will still apply to a different
feature, file, or screen next month. If the human made a change so that "button X no
longer hides button Y," the lesson is **"controls must not hide other controls,"**
not the one-off note about buttons X and Y. Always ask: *what is the underlying
principle here, and how would I state it so a future agent avoids the whole class of
mistake?*

Repository: `JonasHazell/roomcraft`.

## What to look at each run

Find everything from the pipeline that has reached a decision but is **not** yet
labelled `agent:analyzed`:

- **Pull requests** opened by Stage B (labelled `agent:built`) that are now
  **merged** or **closed**.
- **Issues** labelled `agent:ready` that the human **closed** without a merged PR
  (i.e. rejected before/instead of building).

Process each one, then mark it `agent:analyzed` so it's never counted twice.

## How to read each outcome

For every item, work out the signal and *why* — then **generalise it into a rule**.
Nail down the specific change first (it's your evidence), but the takeaway you carry
forward is the principle behind it:

- **PR merged with no changes to the agent's commits** → the proposal *and* the
  implementation hit the mark. What general habit made it good? Record that.
- **PR merged after the human edited it** → **this is the richest signal.** Compare
  the agent's original commits against the final merged state (diff them). Identify
  exactly what the human changed — wrong approach, missed a design token, over-scoped,
  wrong file, style mismatch, missing test — then ask what *class* of mistake it
  represents and state the rule that would prevent all of them.
- **PR closed without merging** → rejected. Read any closing comment. Was the idea
  wrong, the scope too big, the timing off, or the execution poor? Generalise into
  what kinds of proposals or approaches to avoid.
- **Issue closed without a PR** → the proposal itself was rejected. Why wasn't it
  worth building? Turn it into a general rule for Stage A's proposal selection.

## Writing the learnings

Append concise, actionable entries to [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md).
Each entry should be a **general principle** a future Stage A or Stage B agent can
*act on* across many situations, not a diary entry about one PR:

- **Lead with the principle.** State the durable, reusable rule as the lesson —
  e.g. "controls must not hide other controls" — and cite the specific case only as
  a brief example and for traceability. If a lesson could only ever apply to the one
  PR it came from, it's too narrow; find the wider rule behind it.
- Group by theme when possible (proposal selection, scoping, design/UI, testing,
  code style, areas to avoid).
- Reference the issue/PR number so the principle is traceable to its evidence.
- If a lesson repeats, strengthen and broaden the existing entry rather than
  duplicating it — recurrence is a sign the principle should be stated more firmly.

Because this runs in a fresh session, land your changes as a **pull request**
(branch `agent/learnings-update`, targeting the default branch) titled something
like `chore(agent): update learnings`. The human merges it. You may label that PR
`agent:built` so it shows up in the normal review queue.

**Important:** mark the source issues/PRs `agent:analyzed` during this run
regardless of whether your learnings PR is merged yet — that prevents re-analysis.

## Guardrails

- **Don't re-open or re-litigate** the human's decisions. You observe and learn; you
  don't argue with merges or rejections.
- **Generalise, but stay grounded.** The recorded lesson should be a general rule,
  backed by the specific evidence. "Match spacing to the design tokens rather than
  eyeballing pixel values (the human tightened spacing to the 8px token in #42)"
  beats both the vague "improve quality" and the too-narrow "change the spacing in
  #42." Never invent a principle the evidence doesn't support.
- Only edit `AGENT_LEARNINGS.md`. Don't change product code in this stage.

## Labels

Set `agent:analyzed` on every issue/PR you process. Never set `agent:ready`,
`agent:building`, or (except on your own learnings PR) `agent:built`.
