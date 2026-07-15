# Agent pipeline — Stage B: Build

> You are running as **Routine B** of the RoomCraft agent pipeline (see
> [`AGENT_PIPELINE.md`](AGENT_PIPELINE.md)). Your job is to turn issues labelled
> `agent:ready` into pull requests the human can review. You do **not** merge
> anything — the human decides that.

Repository: `JonasHazell/roomcraft`.

## Before you build — read these

1. [`AGENT_LEARNINGS.md`](AGENT_LEARNINGS.md) — how past PRs were received; apply
   the patterns that got merged cleanly and avoid the ones that got edited/rejected.
   [`AGENT_METRICS.md`](AGENT_METRICS.md) — the current health snapshot. A high edit
   rate or creeping PR size is a direct signal to tighten your own diffs: build the
   smallest faithful change and reuse existing primitives so the human merges it as-is.
2. [`DESIGN.md`](DESIGN.md) + the `#styleguide` gallery — for any UI change, reuse
   existing primitives and design tokens. Never hard-code a colour/font/radius/shadow.
3. [`STRATEGY.md`](STRATEGY.md) / [`PURPOSE.md`](PURPOSE.md) — keep the change true
   to the issue's intent and the core experience.
4. [`ARCHITECTURE.md`](ARCHITECTURE.md) — the feature→code map. Use it to find
   the files that own the feature you're changing, and to reuse the existing
   store slice / lib module instead of building a parallel one.
5. [`CLAUDE.md`](../CLAUDE.md) — project conventions and commands.

## Algorithm for each run

1. **Find the queue.** List open issues labelled `agent:ready` that are **not**
   labelled `agent:building` and have **no** open PR linked to them.
2. **Respect the cap.** Take up to **10 issues per run** (oldest first). Leave any
   beyond that for the next run.
3. For **each** selected issue:
   1. **Claim it** — add the `agent:building` label so a later run won't double-build
      it. If an issue has had `agent:building` for a long time with no PR (a crashed
      earlier run), you may reclaim it.
   2. **Implement** the change on a new branch named `agent/issue-<N>-<slug>`, off
      the default branch. Keep the change small and faithful to the issue.
      **Delegate the implementation to a fresh subagent** — spawn a new subagent
      (via the `Agent` tool) for *each* issue and have it carry out that one
      change end to end, so every change is built in its own clean context.
      Give the subagent the issue's intent and the reading list above, and have
      it return a summary of what it changed and how it verified it. Do not
      implement multiple issues in a single subagent.
   3. **Verify:** run `npm run build`, `npm run lint`, and `npm test`. Fix what your
      change broke. For UI, follow the `DESIGN.md` behaviour conventions.
      **If the change touches any user-facing surface, also add or extend an
      `e2e/` spec and run `npm run test:e2e`** (desktop + mobile) per
      `CLAUDE.md`'s validation rule — a `Stop` hook blocks the session from
      finishing while `src/` has changes that haven't been validated this way,
      so a change that skips this step can leave the build stuck. Purely
      internal changes (docs, dead-code removal with no reachable UI effect)
      don't need a new spec, but still shouldn't trip the hook — verify it
      passes before opening the PR either way.
   4. **Open a pull request** with `Closes #<N>` in the body, targeting the default
      branch. Fill in what changed, why, and how you verified it, following the PR
      template. Label the PR `agent:built`. **Do not enable auto-merge.**
      **For any GUI change, attach media the reviewer can actually open.**
      You open PRs through the API, so you can't attach media the way a human can:
      drag-and-drop upload isn't available, and the posting layer strips both
      inline image embeds (`![](…)`) and any link whose URL ends in an image
      extension — all of which leave an unclickable dead link. What survives is a
      link with no image extension (a folder/tree view), so:
      - During the `npm run test:e2e` run, capture a desktop **and** a mobile
        screenshot (or a short `.gif`) of the changed flow — e.g. add a
        `page.screenshot({ path: '…' })` to the spec that drives it. Show both
        viewports whenever the change is visible in both.
      - Run `node scripts/pr-media.mjs <files…>`. It copies the media into
        `.github/pr-media/<branch>/` and prints one clickable **link to that
        folder** (a form that survives the filter).
      - **Commit the copied files on the same branch** and paste the printed link
        into the PR body. The committed screenshots also render in the PR's "Files
        changed" tab. (True inline rendering is only possible when a human drags
        the file into the web editor.)
      - Don't worry about the committed images cluttering `main`: when the PR
        merges, `.github/workflows/pr-media-cleanup.yml` removes that PR's
        `.github/pr-media/<branch>/` folder from the base branch. The screenshots
        stay viewable in the merged PR's "Files changed" tab.
4. If a selected issue turns out to be too large, ambiguous, or antithetical to
   `STRATEGY.md`, **do not force it.** Leave a brief comment on the issue explaining
   why, remove `agent:building`, and move on. (Optionally note it for Stage C.)

## Rules

- **One issue → one PR.** Never bundle multiple issues into one PR.
- **Small, reviewable diffs.** If the honest implementation would be a large
  refactor, stop and comment on the issue instead of opening a sprawling PR.
- **Never merge.** Every PR waits for the human. Nothing auto-merges.
- **Quality bar:** the PR must build, lint, and pass tests, and match the design
  system. A red PR wastes the human's review time.
- **Faithful to intent.** Implement what the issue asked for. If you discover the
  issue is wrong, comment — don't silently build something different.

## Labels

- Set `agent:building` when you claim an issue.
- Set `agent:built` on the PR you open.
- Never touch `agent:analyzed` (that's Stage C) and never remove `agent:ready` from
  issues you didn't build.
