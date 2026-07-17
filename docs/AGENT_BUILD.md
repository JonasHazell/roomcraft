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
3. [`STRATEGY.md`](STRATEGY.md) / [`PURPOSE.md`](PURPOSE.md) /
   [`PRINCIPLES.md`](PRINCIPLES.md) — keep the change true to the issue's intent, the
   core experience, and the project's non-goals (don't let a faithful build smuggle in
   scope the principles rule out).
4. [`ARCHITECTURE.md`](ARCHITECTURE.md) — the feature→code map. Use it to find
   the files that own the feature you're changing, and to reuse the existing
   store slice / lib module instead of building a parallel one.
5. [`CLAUDE.md`](../CLAUDE.md) — project conventions and commands.

**You have access to the whole repository.** The list above is what to read *first*; the
complete doc map is in [`docs/README.md`](README.md), and you may open any file in the
repo. For any change, also consult the docs that bear on it —
[`interior-design-rules.md`](interior-design-rules.md) for validation/AI work,
[`MOBILE-FIRST.md`](MOBILE-FIRST.md) for anything touching layout on a phone, and
[`VISION.md`](VISION.md) when the issue's intent depends on where the product is heading.

## Algorithm for each run

1. **Find the queue.** List open issues labelled `agent:ready` that are **not**
   labelled `agent:building` and have **no** open PR linked to them.
   **Reclaim stuck issues first:** for any open issue still labelled
   `agent:building`, check its linked PR. If there is none (a crashed run) or the
   PR was **closed without merging**, clear `agent:building` — otherwise the issue
   is invisible to this step forever and the pipeline silently drops it. If the
   PR's closing comment stated the feature/approach itself isn't wanted (a plain
   rejection, not a request for a different approach), close the issue too
   (mirroring the PR's stated reason) instead of leaving it to loop. If the PR
   closed with no comment or an ambiguous one, just clear the label and leave
   `agent:ready` in place so a future run can retry it with fresh judgement. This
   closes a gap seen twice in one run (#205, #224 — see `AGENT_LEARNINGS.md`).
   A single crashed run can strand a whole **batch** at once — several issues left
   `agent:building` with no PR — so reclaim *every* such issue you find here, not
   just the first one.
2. **Respect the cap.** Take up to **10 issues per run** (oldest first); leave any
   beyond that for the next run. The cap comfortably drains a full Stage A batch (9
   proposals per run) in a single run, while keeping each run — every issue built,
   validated with `npm run test:e2e` in desktop *and* mobile, and turned into a PR —
   within one session's time budget. Because issues are now claimed one at a time
   (below), this cap is a **throughput** knob, not a safety one: raising it can grow
   the backlog but can never *strand* work. If a run can't finish all 10 in its time
   budget, ship the PRs you completed and leave the rest `agent:ready` for the next
   run (see "Ship what you finish" below).
3. **Process the selected issues one at a time, and claim each just before you build
   it.** Run the full claim → implement → verify → open-PR cycle for one issue, *then*
   move to the next. **Never label the whole batch `agent:building` up front:** a run
   that claims all its issues and then crashes mid-build strands *every* one of them
   with no PR to show for it (exactly the failure that left 10 issues stuck at once).
   Claiming just-in-time bounds a crash to the single in-flight issue and keeps every
   finished build as a real PR. For the current issue:
   1. **Claim it — just this one.** Add the `agent:building` label to the issue you
      are about to build, not to the rest of the batch, so a later run won't
      double-build it. If an issue has had `agent:building` for a long time with no PR
      (a crashed earlier run), you may reclaim it.
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
- **Ship what you finish; stop cleanly when time is short.** Because issues are
  claimed and built one at a time, a run can end at any point with every completed PR
  already open and only the untouched queue behind it. If a run is dragging or a
  single build is taking too long, finish and push the PR you're on, then stop —
  three solid PRs with the rest left `agent:ready` for the next run beats running out
  of time mid-build and leaving issues stranded. Don't claim an issue you can't
  plausibly finish this run.
- **Quality bar:** the PR must build, lint, and pass tests, and match the design
  system. A red PR wastes the human's review time.
- **Faithful to intent.** Implement what the issue asked for. If you discover the
  issue is wrong, comment — don't silently build something different.

## Labels

- Set `agent:building` when you claim an issue.
- Set `agent:built` on the PR you open.
- Clear `agent:building` when reclaiming a stuck issue (step 1 above) — including
  closing the issue if the linked PR's rejection was a plain "don't want this."
- Never touch `agent:analyzed` or `agent:question` (both are Stage C's) and never
  remove `agent:ready` from issues you didn't build. An `agent:question` issue is a
  question for the human, not a build request — it never carries `agent:ready`, so
  your queue step already skips it; never add `agent:ready` to one.
