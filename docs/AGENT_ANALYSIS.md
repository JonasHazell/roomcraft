# Agent pipeline — Stage C: Analyse

> You are running as **Routine C** of the RoomCraft agent pipeline (see
> [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md)). Your job is to close the loop: learn
> from what the human did with each agent proposal and pull request — **and from the
> PRs the human built and merged themselves** — then feed that back four ways so the
> pipeline keeps getting better:
>
> 1. **Lessons** → append durable principles to [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md).
> 2. **Measurement** → refresh the metrics & monitoring snapshot in
>    [`AGENT_METRICS.md`](AGENT_METRICS.md).
> 3. **Self-improvement** → when a lesson or a metric has proven itself, edit the
>    **agent script** (the instruction docs) and the **loop** itself so the
>    improvement is baked in, not just remembered.
> 4. **Documentation upkeep** → the merged changes you're already reading are what
>    make the *descriptive* docs go stale, so as you read them, keep those docs
>    honest: correct drift you can fix, and **ask the human** when a doc is genuinely
>    ambiguous or its intent is unclear (see *Keeping the reference docs honest*).
>
> Stages A and B read the first three before proposing and building; the fourth keeps
> the docs they rely on trustworthy.

**Your primary job is to extract general principles, not to log one-off events.**
Every specific thing the human did is only evidence. The lesson you record must be
the *generalisable rule* behind it — the thing that will still apply to a different
feature, file, or screen next month. If the human made a change so that "button X no
longer hides button Y," the lesson is **"controls must not hide other controls,"**
not the one-off note about buttons X and Y. Always ask: *what is the underlying
principle here, and how would I state it so a future agent avoids the whole class of
mistake?*

Repository: `JonasHazell/roomcraft`.

**You have access to the whole repository.** The complete doc map is in
[`docs/README.md`](README.md), and you may open any file. Beyond the pipeline's own
memory files, consult the direction and taste docs ([`PURPOSE.md`](PURPOSE.md),
[`VISION.md`](VISION.md), [`STRATEGY.md`](STRATEGY.md), [`PRINCIPLES.md`](PRINCIPLES.md),
[`DESIGN.md`](DESIGN.md)) when judging whether a decision fits, and
[`interior-design-rules.md`](interior-design-rules.md) for rule-related outcomes. You may
edit the pipeline docs **and** correct factual drift in the descriptive reference docs
(see *Keeping the reference docs honest* and the guardrails below); you must **never**
rewrite the human-owned direction & taste docs' intent — ask instead.

## What to look at each run

Find everything that has reached a decision but is **not** yet labelled
`agent:analyzed`:

- **Agent pull requests** opened by Stage B (labelled `agent:built`) that are now
  **merged** or **closed**.
- **Issues** labelled `agent:ready` that the human **closed** without a merged PR
  (i.e. rejected before/instead of building).
- **The human's own merged pull requests** — PRs the human authored and hand-built
  themselves (see [How to read the human's own PRs](#how-to-read-the-humans-own-prs)
  for why these are worth learning from). These are the *richest positive examples
  of what "good" looks like in this repo*, so learn from them too.
- **Answered `agent:question` issues** — open issues **you** opened as questions that
  now have a human reply. Fold each answer into the learnings and close it, *before*
  analysing new outcomes, since an answer may correct an earlier best-guess entry (see
  [Asking the human a question](#asking-the-human-a-question)).

**Skip** — do not analyse or label:

- **The human's own *closed* (un-merged) PRs.** A human closing their own PR is
  noise, not a rejection signal (superseded by another PR, an abandoned spike, a
  change of mind), so there's no durable lesson in it.
- **The pipeline's own meta-PRs**, including this stage's own `agent:learnings`
  update PR (branch `agent/learnings-update`) — never analyse your own output.

### Identifying the human's own PRs

There is **no author signal to rely on**: every PR in this repo — agent-built and
hand-built alike — is authored by the same GitHub account and carries a "Generated
with Claude Code" footer. So classify by **label and branch, not by author**:

- **Agent-built PR** → carries the `agent:built` label (branch `agent/…`). Read it
  with the agent-outcome recipe below.
- **The human's own PR** → a **merged** PR that does **not** carry `agent:built`
  (typically a `claude/…` branch). Read it with the human's-own recipe below.

Two things to get right when querying:

- **Trust `merged_at`, not the `merged` boolean.** The PR-list API reports
  `"merged": false` even on PRs that were in fact merged; a PR is merged iff its
  `merged_at` is non-null.
- **Only look at PRs merged on or after 2026-07-14** (the day this scope was
  introduced). Do **not** trawl the full history — older merged PRs are out of
  scope so the first runs don't drown in a historical backlog. Advance naturally
  from there: anything already carrying `agent:analyzed` is skipped, so each run
  only picks up what's new since the last one.

Process each in-scope item, then mark it `agent:analyzed` so it's never counted
twice — **including the human's own merged PRs** (yes, this stamps an agent label on
hand-built PRs; that's the intended dedup mechanism).

## How to read each outcome

For every item, work out the signal and *why* — then **generalise it into a rule**.
Nail down the specific change first (it's your evidence), but the takeaway you carry
forward is the principle behind it. When the human rejected or edited something, ask whether it
traces to a [`PRINCIPLES.md`](PRINCIPLES.md) value or a departure from
[`VISION.md`](VISION.md)'s direction — those are the most reusable rejections to learn
from:

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

### How to read the human's own PRs

The human's own merged PRs need a **different reading recipe** from the agent
outcomes above. There is no agent baseline to diff against — nobody proposed or
pre-built this, so "what did the human change" doesn't apply. Instead, treat the
merged PR as an **exemplar of work the human judged good enough to ship**, and mine
it for what to *imitate*:

- **What did they choose to build, and how big did they make it?** This is direct
  evidence of what's worth a proposal and what scope reads as "reviewable" —
  feed it back into Stage A's selection and Stage B's scoping.
- **What patterns and conventions did they write by hand?** Design-token use, file
  layout, how they structured the change, test coverage, PR-description shape.
  State the reusable convention, not the one-off detail.
- **Where are they actually investing?** Repeatedly hand-building in one area (e.g.
  the floor-plan editor, mobile flows) tells Stage A which core flows deserve
  proposals and which are being deliberately left alone.

Not every merged PR carries a durable lesson. A purely mechanical change (a
`.gitignore` line, a dependency bump, a typo fix) teaches nothing generalisable —
in that case record **no** learning and simply mark it `agent:analyzed`. Only write
an entry when there's a genuine, reusable principle; don't manufacture one to fill
the log.

## Keeping the reference docs honest

You are already reading every merged change this run, and merged changes are exactly
what make the *descriptive* docs go stale — a feature described that a PR just removed,
a file or path that moved, a design rule the styleguide no longer matches. You're the
stage best placed to catch that drift, at its source, so keep those docs honest in two
modes — mirroring how Stage B builds and the human merges: fix what you can, ask about
what you can't.

**Fix drift directly, in the same PR you already open.** When a change you're
analysing has left a *descriptive, reference* doc inaccurate or self-contradictory,
correct the doc in your `agent/learnings-update` PR (no separate issue, no Stage B
round-trip). This covers **only** the docs that are meant to track the code and can go
stale:

- [`ARCHITECTURE.md`](ARCHITECTURE.md) (the feature→code map),
  [`MOBILE-FIRST.md`](MOBILE-FIRST.md),
  [`interior-design-rules.md`](interior-design-rules.md), the two `README.md` files, and
  the **factual/consistency** parts of [`DESIGN.md`](DESIGN.md) (a token, class, or
  behaviour the styleguide no longer matches).
- Keep each fix **small and factual** — correct what the merged change made untrue,
  quote the drift in the PR description (e.g. "#231 removed the grid-snap toggle;
  updated `ARCHITECTURE.md` to match"), and don't rewrite for taste. This is hygiene,
  not the conservative *promotion* bar that governs instruction-doc edits.

**Never rewrite the human's intent — ask instead.** The **human-owned direction & taste
docs** — [`PURPOSE.md`](PURPOSE.md), [`VISION.md`](VISION.md), [`STRATEGY.md`](STRATEGY.md),
[`PRINCIPLES.md`](PRINCIPLES.md), and the *intent* (not the factual details) of
[`DESIGN.md`](DESIGN.md) — express what the human wants; correcting a stale fact is your
job, rewording their intent is not. If one of these reads as genuinely ambiguous or
seems to contradict another (or a merged decision) in a way that would **materially
change what you record or what Stages A/B do**, open an `agent:question` for the human
rather than editing it or guessing (see *Asking the human a question* — the same
channel and the same high bar apply). This is also the right move when descriptive-doc
drift could be resolved two ways and only the human knows which is intended.

## Asking the human a question

You ask the human for **two** kinds of reason. The first: *why* the human did
something, when that why is genuinely ambiguous **and the general rule you'd record
differs materially depending on the answer** — a wrong generalised rule is worse than
no rule, because it silently steers every future Stage A proposal and Stage B build.
The second: *what the human intends in a doc*, when a direction/taste doc is genuinely
ambiguous or self-contradictory and you must not rewrite its intent (see *Keeping the
reference docs honest*). Both use this one channel and the same high bar; when you hit
either, don't record — or edit in — a confident-sounding guess. **Ask the human.**

You run in a fresh, headless session with no human present, so the dialogue is
**asynchronous, through GitHub** — the same shared state the rest of the pipeline
uses. A question is a **GitHub issue labelled `agent:question`**, answered on the
human's own schedule, and picked up by a later run of this stage.

### When to ask (be sparing)

A question spends the human's attention — the scarcest thing in the loop — so the bar
is high. Ask **only** when all three hold:

1. **The interpretations genuinely diverge.** Two or more readings of the same
   outcome — or of the ambiguous doc — lead to *different* durable rules or
   *different* doc corrections (not just different wording of the same thing).
2. **The answer would actually steer future work.** It changes what Stage A proposes,
   how Stage B builds, or the corrected text of a doc they rely on — it's not academic.
3. **You can't resolve it yourself** from the closing comment, the diff, the merged
   change, or the other docs (`PRINCIPLES.md`, `VISION.md`, …).

If any one fails, do what you do today: record your best-guess learning, or — when
there's no genuine reusable principle — record nothing. Most outcomes are clear
enough to generalise directly; asking should be the exception.

### The dialogue lifecycle

1. **Ask** — open an issue labelled `agent:question`. Keep it answerable in a single
   comment:
   - **Title** — the question in one line.
   - **Context** — the item (`#N`) and exactly what the human did (merged after
     editing X, closed with comment Y, hand-built Z).
   - **Why I'm asking** — the two or three interpretations, presented as labelled
     options (**A / B / C**), and the *different rule each one would produce*.
   - **My best guess** — the option you'd record if this goes unanswered, so silence
     still has a sane default.
2. **Answer** — the human replies in a comment (e.g. just "B", or a sentence). There
   is deliberately **no label for the human to manage** — their one lever stays
   "merge PRs / comment," and this adds nothing new to learn.
3. **Fold the answer back** — at the **start of every run**, before analysing new
   outcomes, list open `agent:question` issues and check each for a human reply since
   the ask. For each answered one: turn the answer into a durable entry in
   [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) (citing the question issue `#N` for
   traceability), **correct or broaden any earlier best-guess learning it
   contradicts**, then **close the issue** — a closed question is resolved and is
   never reprocessed.
4. **Age out unanswered questions** — a question must not live forever. If one has
   gone unanswered for **7 runs (≈ a week)**, record its "my best guess" as an
   explicitly **low-confidence** learning ("_provisional — question #N went
   unanswered_") and close the question with a comment saying it timed out. Track the
   age by the issue's `created_at`; don't re-ask the same question.

### Guardrails on asking

- **Cap the queue: at most 2 open `agent:question` issues at once, and at most 1 new
  question per run.** If two are already open, record your best guess instead of
  opening a third. Questions are a trickle, not a stream.
- **Never block on an answer.** Still mark the source item `agent:analyzed` this run
  (with a best-guess learning if warranted) so deduplication isn't held hostage to a
  pending question. The question issue is a separate, parallel artifact from the item
  it's about.
- **A question is not a proposal.** Never label it `agent:ready` (Stage B must never
  try to "build" it) and never `agent:analyzed` (it's a Stage-C artifact, not a
  reviewed outcome). It carries `agent:question` only, until you close it.
- **Surface open questions where the human already looks.** List any open
  `agent:question` issues in your learnings-update PR description ("Open questions
  awaiting your answer: #N") so they're visible in the review flow the human already
  does. The issue is the durable channel; the PR line is just discoverability.

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
like `chore(agent): update learnings, metrics & pipeline`. The metrics refresh, any
agent-script/loop edits below, **and any reference-doc drift fixes** (per *Keeping the
reference docs honest*) go in this **same PR** — one reviewable pipeline-and-docs
update per run. Call out each doc fix in the PR description so the human can review it
deliberately. The human merges it. You may label that PR `agent:built` so it shows up
in the normal review queue.

**Reuse the exact branch name, and check for an already-open PR before assuming none
exists.** Push to `agent/learnings-update` specifically — not the session's own
default working branch — and search for an open PR on that branch first. If one is
already open (the human hasn't merged the prior run's update yet), push your new
commits onto that same branch and update its title/body to describe the latest
cumulative state, rather than opening a second PR from a different branch. A prior
run pushed to its own session-default branch instead and opened a redundant,
conflicting second meta-PR (#399) alongside the still-open #379 on the correct
branch — see `AGENT_LEARNINGS.md`'s Pipeline reliability section.

**Important:** mark the source issues/PRs `agent:analyzed` during this run
regardless of whether your PR is merged yet — that prevents re-analysis.

## Refreshing the metrics & monitoring snapshot

Beyond the qualitative lessons, quantify how the loop is doing and overwrite the
snapshot in [`AGENT_METRICS.md`](AGENT_METRICS.md). Read that file first — it defines
every metric and where each number comes from. In short, each run:

- **Compute the outcome metrics** from the items you already reviewed this run
  (merge rate, clean-merge vs edit rate, rejection rates, median PR size,
  time-to-decision). You are looking at these PRs and issues anyway — tallying them
  is nearly free.
- **Compute the pipeline-health metrics** from label state (ready backlog,
  stuck-`agent:building` items, duplicate-rejection count, empty-run rate).
- **Sample the product observability metrics** (AI proposal latency, cost, calls,
  failure rate) from `[proposals]` server logs *if* you can reach them from this
  session; otherwise mark those rows **"not sampled this run"** rather than guessing.
- **Overwrite** the `METRICS-SNAPSHOT` block with current values, a direction arrow
  since last run, and the window each was computed over. It is a live dashboard —
  replace it, don't append.

Ground every number in something real (GitHub state or a log line). A blank marked
"not sampled" is honest; a fabricated figure poisons the loop.

## Improving the agent script and the loop

Recording a lesson is not enough on its own — a principle that only lives in
`AGENT_LEARNINGS.md` still relies on a future agent reading and applying it. When a
lesson has **proven itself** or a **metric has moved the wrong way across more than
one run**, promote it: edit the agent script (the instruction docs) and, where
warranted, the shape of the loop, so the improvement is enforced by default.

**What *promotion* may edit** (the agent pipeline docs — never product code; factual
fixes to the descriptive reference docs are a separate, lighter task covered by
*Keeping the reference docs honest*):

- **The stage instructions** — `AGENT_PROPOSALS.md`, `AGENT_BUILD.md`, this file
  (`AGENT_ANALYSIS.md`). Turn a recurring learning into a hard rule at the point where
  the relevant stage will actually act on it. Example: if the edit rate keeps climbing
  because Stage B forgets a design token, add that as an explicit check in
  `AGENT_BUILD.md`, not just a note in the learnings.
- **The loop itself** — `AGENT_PIPELINE.md`. Tune the levers the metrics expose:
  proposal/PR caps, cadence, the label state machine, or the steps a stage runs. If
  the ready backlog is growing every run, that's evidence to rebalance Stage A's and
  Stage B's caps — make the change and say why in the PR.
- **The metrics themselves** — `AGENT_METRICS.md`. Add a metric when you find a blind
  spot; retire one that never informs a decision.

**Promotion criteria — be conservative.** The instructions are load-bearing; churning
them every run makes the pipeline unstable and unreviewable. Only promote when:

- the same lesson has recurred (the `AGENT_LEARNINGS.md` guidance already says to
  *strengthen* a repeated entry — recurrence is the trigger to harden it into a rule),
  **or** a metric shows a consistent trend across at least two runs, and
- the rule you'd add is **general** (applies to a class of future work, not one PR),
  and
- the edit is **small and surgical** — a tightened criterion, a new check, a changed
  cap — not a rewrite of a stage's philosophy.

When you do make a script/loop edit, **note it in the PR description** ("promoted the
#128 primitive-override learning into `AGENT_BUILD.md`") so the human can review the
behaviour change deliberately, and add a matching note in `AGENT_LEARNINGS.md` so the
provenance is traceable. If nothing meets the promotion bar this run, change no
instructions — an unchanged script is a fine outcome.

## Guardrails

- **Don't re-open or re-litigate** the human's decisions. You observe and learn; you
  don't argue with merges or rejections.
- **Generalise, but stay grounded.** The recorded lesson should be a general rule,
  backed by the specific evidence. "Match spacing to the design tokens rather than
  eyeballing pixel values (the human tightened spacing to the 8px token in #42)"
  beats both the vague "improve quality" and the too-narrow "change the spacing in
  #42." Never invent a principle the evidence doesn't support.
- **Stay inside the docs; never touch product code.** You may edit `AGENT_LEARNINGS.md`,
  `AGENT_METRICS.md`, and — under the promotion criteria above — the instruction docs
  (`AGENT_PROPOSALS.md`, `AGENT_BUILD.md`, `AGENT_ANALYSIS.md`, `AGENT_PIPELINE.md`). You
  may **also correct factual drift** in the descriptive reference docs — `ARCHITECTURE.md`,
  `MOBILE-FIRST.md`, `interior-design-rules.md`, the two `README.md` files, and the
  factual/consistency parts of `DESIGN.md` — per *Keeping the reference docs honest*
  (small, factual, tied to a merged change; not a promotion). **Never change product code
  (`src/`, `server/`) in this stage** — behaviour changes to the app are Stage A/B's job,
  proposed and built through the normal queue. `PURPOSE.md`, `VISION.md`, `STRATEGY.md`,
  `PRINCIPLES.md`, and `DESIGN.md`'s **intent** are human-owned direction and taste —
  **never rewrite their intent here**; correct a stale fact if you must, otherwise ask
  via `agent:question`.
- **Never fabricate a metric.** If you can't derive a number from GitHub state or a
  server log, mark it "not sampled this run." A blank is honest; a made-up figure
  silently steers the whole loop wrong.
- **Don't thrash the script.** One noisy run is not a trend. Promote a learning into
  the instructions only when it recurs or a metric holds across runs, and keep each
  edit small and surgical.

## Labels

Set `agent:analyzed` on every issue/PR you process — this now includes the human's
own merged PRs, which is how they're deduped across runs. Never set `agent:ready`,
`agent:building`, or (except on your own learnings/metrics/pipeline PR) `agent:built`.
Never label the human's own *closed* (un-merged) PRs or the pipeline's own meta-PRs —
those are out of scope and left untouched.

You are the **only** stage that uses `agent:question` — set it when you open a
question for the human, and close (never `agent:analyzed`) the issue once you've
folded the answer back in. Never put `agent:question` on anything you didn't open as
a question.
