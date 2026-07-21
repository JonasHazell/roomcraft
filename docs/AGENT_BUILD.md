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
   [`PRINCIPLES.md`](PRINCIPLES.md) — keep the change true to the issue's intent and
   the direction (building toward the vision, with care and taste). New surface area
   and monetization work are in scope; build them well.
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
      template. Label the PR `agent:built`. Then decide auto-merge per
      [When to auto-merge](#when-to-auto-merge) below — most PRs still wait for the
      human; only clearly small, low-risk bug fixes and minor GUI improvements
      auto-merge, and only once every required check is green.
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

## When to auto-merge

Most agent PRs still wait for the human — that's the default and the safe choice.
But a narrow class of change is so consistently merged unchanged (see the
clean-merge rate in [`AGENT_METRICS.md`](AGENT_METRICS.md)) that queuing it for a
manual click only adds latency: **small, low-risk bug fixes and minor GUI
improvements.** For those, enable GitHub auto-merge so the PR lands by itself once
**every required check is green** — never before.

**The checks are the gate, not your judgement of "it looks fine."** Auto-merge only
completes when CI is green, and CI now includes the **e2e run in desktop *and*
mobile** (the same Playwright validation the `Stop` hook enforces locally, promoted
into a required check for exactly this reason). A red or pending check holds the
merge. So still run `npm run build`, `npm run lint`, `npm test`, and
`npm run test:e2e` yourself before opening the PR — auto-merge is a convenience on
top of a green PR, not a way to skip validation.

**Verify the E2E check's own conclusion yourself before enabling auto-merge — don't
trust the platform gate alone.** On 2026-07-18/19, 7 PRs were labelled
`agent:auto-merge` and merged even though their own `E2E (desktop + mobile)` check
run reported `conclusion: failure` at the exact head commit that merged (see
`AGENT_LEARNINGS.md`'s Pipeline reliability entry) — most likely because the
repo's branch-protection required-status-checks list doesn't actually include that
context, so GitHub waited only on `Lint, test & build`. Until a human confirms
that's fixed, treat the platform-level gate as unverified: before requesting
auto-merge, pull the PR's own check runs (`get_check_runs` or equivalent) and
confirm `E2E (desktop + mobile)` shows `success` for the current head commit
yourself. If it's red, pending, or you can't confirm it, don't enable auto-merge —
leave the PR for the human same as any other.

**Enable auto-merge only when ALL of these hold:**

- The issue is a **bug fix** or a **small, self-contained GUI/visual improvement**
  (a label, spacing, an icon, a copy tweak, a wired-up existing control) — *not* a
  new feature, a new surface, or a larger step toward the long-term goal.
- The diff is **small and low-risk**: it reuses existing primitives and design
  tokens, adds no dependency, and changes no data model, API/server, AI/planning
  code (`server/`), security-sensitive path, or the agent pipeline itself
  (`docs/AGENT_*.md`, `.github/`, `scripts/`).
- You are **faithful and confident** — the implementation matches the issue's intent
  with no judgement calls a reviewer would want to weigh in on. Any ambiguity,
  novelty, or "the human should see this first" instinct → **don't** auto-merge.
- The PR still carries the **before/after media** (per step 4 above) for any GUI
  change, so the merged record is inspectable and easy to roll back.

**When it qualifies:** add the `agent:auto-merge` label to the PR (in addition to
`agent:built`) and enable auto-merge via the API (`enable_pr_auto_merge`, squash).
**When in doubt, leave it for the human** — a PR that waits costs a click; a wrong
auto-merge costs a revert. This lever only ever *adds* an automatic merge to a green
PR; it never merges anything the human would otherwise have blocked, because the same
checks still have to pass.

## Rules

- **One issue → one PR.** Never bundle multiple issues into one PR.
- **Flag same-file overlap with other in-flight work.** Before opening the PR,
  check whether another issue built this run (or still open, unmerged) touches the
  same file you just changed. If so, say so explicitly in the PR body — which
  region/lines you touched — so a human resolving a later merge conflict has the
  context already in hand instead of discovering it cold. This doesn't prevent the
  conflict (a same-file collision can still happen depending on merge order), but it
  costs nothing and makes it a five-second resolve instead of a cold read (see
  `AGENT_LEARNINGS.md`'s Scoping section for why this keeps happening — same-batch
  PRs go stale waiting for review while siblings merge ahead of them).
- **Coherent, reviewable diffs.** Diffs no longer have to be *small* — a larger,
  ambitious build toward the vision is fine. Keep the PR coherent and reviewable; if
  the honest implementation is genuinely huge, say so on the issue and, where it helps,
  land it in coherent stages rather than one unreadable PR.
- **Never merge by hand, and auto-merge only the narrow class above.** You never
  click merge yourself. The default is still that every PR waits for the human; the
  sole exception is a small, low-risk bug fix or minor GUI improvement that meets
  every bar in [When to auto-merge](#when-to-auto-merge), where you enable GitHub
  auto-merge so the green PR lands on its own. Everything else waits.
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
- Set `agent:auto-merge` on the PR **and** enable GitHub auto-merge only when the PR
  meets every bar in [When to auto-merge](#when-to-auto-merge); otherwise leave it for
  the human. It's an addition to `agent:built`, never a replacement.
- Clear `agent:building` when reclaiming a stuck issue (step 1 above) — including
  closing the issue if the linked PR's rejection was a plain "don't want this."
- Never touch `agent:analyzed` or `agent:question` (both are Stage C's) and never
  remove `agent:ready` from issues you didn't build. An `agent:question` issue is a
  question for the human, not a build request — it never carries `agent:ready`, so
  your queue step already skips it; never add `agent:ready` to one.
