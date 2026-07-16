# Agent pipeline — Stage B: Build

> You are running as **Routine B** of the agent pipeline (see
> [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md)). Your job is to turn issues labelled
> `agent:ready` into pull requests the human can review. You do **not** merge anything —
> the human decides that.

Repository: `<OWNER/REPO>`.

## Before you build — read these

1. [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) — how past PRs were received; apply the
   patterns that got merged cleanly and avoid the ones that got edited/rejected.
   [`AGENT_METRICS.md`](AGENT_METRICS.md) — the current health snapshot. A high edit rate
   or creeping PR size is a direct signal to tighten your own diffs: build the smallest
   faithful change and reuse existing primitives so the human merges it as-is.
2. [`DESIGN.md`](DESIGN.md) — for any UI change, reuse existing primitives and design
   tokens. Never hard-code a colour/font/radius/shadow.
3. [`STRATEGY.md`](STRATEGY.md) / [`PURPOSE.md`](PURPOSE.md) /
   [`PRINCIPLES.md`](PRINCIPLES.md) — keep the change true to the issue's intent, the
   core experience, and the project's non-goals (don't let a faithful build smuggle in
   scope the principles rule out).
4. [`ARCHITECTURE.md`](ARCHITECTURE.md) — the feature→code map. Use it to find the files
   that own the feature you're changing, and to reuse the existing store slice / module
   instead of building a parallel one.
5. [`CLAUDE.md`](../CLAUDE.md) — project conventions and the exact build/lint/test
   commands.

## Algorithm for each run

1. **Find the queue.** List open issues labelled `agent:ready` that are **not** labelled
   `agent:building` and have **no** open PR linked to them.
   **Reclaim stuck issues first:** for any open issue still labelled `agent:building`,
   check its linked PR. If there is none (a crashed run) or the PR was **closed without
   merging**, clear `agent:building` — otherwise the issue is invisible to this step
   forever and the pipeline silently drops it. If the PR's closing comment stated the
   feature/approach itself isn't wanted (a plain rejection, not a request for a different
   approach), close the issue too, mirroring the PR's stated reason, instead of leaving
   it to loop. If the PR closed with no comment or an ambiguous one, just clear the label
   and leave `agent:ready` in place so a future run can retry it with fresh judgement.
2. **Respect the cap.** Take up to a fixed number of issues per run (oldest first). Leave
   any beyond that for the next run.
3. For **each** selected issue:
   1. **Claim it** — add the `agent:building` label so a later run won't double-build it.
   2. **Implement** the change on a new branch named `agent/issue-<N>-<slug>`, off the
      default branch. Keep the change small and faithful to the issue.
      **Delegate the implementation to a fresh subagent** — spawn a new subagent for
      *each* issue and have it carry out that one change end to end, so every change is
      built in its own clean context. Give the subagent the issue's intent and the
      reading list above, and have it return a summary of what it changed and how it
      verified it. Do not implement multiple issues in a single subagent.
   3. **Verify:** run `<BUILD_CMD>`, `<LINT_CMD>`, and `<TEST_CMD>` (see `CLAUDE.md`).
      Fix what your change broke. For UI, follow the `DESIGN.md` behaviour conventions.
      > **[TEMPLATE — keep only if applicable]** If the change touches a user-facing
      > surface and your project has an end-to-end/browser harness, add or extend a spec
      > that drives the new/changed flow and run it (across every viewport/platform you
      > support) before opening the PR. If you enforce this with a `Stop`-style hook,
      > a change that skips validation can leave the session stuck — so verify it passes
      > either way. Purely internal changes (docs, dead-code removal with no reachable
      > effect) don't need a new spec.
   4. **Open a pull request** with `Closes #<N>` in the body, targeting the default
      branch. Fill in what changed, why, and how you verified it, following any PR
      template in the repo. Label the PR `agent:built`. **Do not enable auto-merge.**
      > **[TEMPLATE — keep only if applicable]** For a visual change, attach media the
      > reviewer can actually open. If you open PRs through an API, be aware the posting
      > layer may strip inline image embeds and image-extension links — commit the
      > screenshots on the branch and link the folder, or use whatever
      > media-attaching helper your project provides. Show every viewport the change is
      > visible in.
4. If a selected issue turns out to be too large, ambiguous, or antithetical to
   `STRATEGY.md`, **do not force it.** Leave a brief comment on the issue explaining why,
   remove `agent:building`, and move on. (Optionally note it for Stage C.)

## Rules

- **One issue → one PR.** Never bundle multiple issues into one PR.
- **Small, reviewable diffs.** If the honest implementation would be a large refactor,
  stop and comment on the issue instead of opening a sprawling PR.
- **Never merge.** Every PR waits for the human. Nothing auto-merges.
- **Quality bar:** the PR must build, lint, and pass tests, and match the design system.
  A red PR wastes the human's review time.
- **Faithful to intent.** Implement what the issue asked for. If you discover the issue
  is wrong, comment — don't silently build something different.

## Labels

- Set `agent:building` when you claim an issue.
- Set `agent:built` on the PR you open.
- Clear `agent:building` when reclaiming a stuck issue (step 1 above) — including closing
  the issue if the linked PR's rejection was a plain "don't want this."
- Never touch `agent:analyzed` (that's Stage C) and never remove `agent:ready` from
  issues you didn't build.
