# RoomCraft — autonomous feature workflow

How Claude proposes and builds work on RoomCraft on its own, opens a pull request
for it, and **learns from the maintainer's decisions** so each round is better
aimed than the last.

This document is the *process*. The accumulated *taste* — what to build and how —
lives in [`PREFERENCES.md`](PREFERENCES.md), which this workflow reads before
building and updates after every rejection.

## The loop

```
        ┌─────────────────────────────────────────────────────────┐
        │                                                          │
        ▼                                                          │
   1. PICK  ──►  2. BUILD  ──►  3. OPEN PR  ──►  4. REVIEW  ──►  decision
   (one focused      (to the        (self-contained,   (maintainer)     │
    change,          quality         reviewable)                        │
    strategy-fit)    bar)                                               │
                                                             ┌─────────┴─────────┐
                                                             │                   │
                                                          ACCEPT              REJECT
                                                        (merge, done)   5. LEARN → back to PICK
                                                                        (record the lesson in
                                                                         PREFERENCES.md so it
                                                                         is never repeated)
```

The whole point is step 5: a rejection is not a dead end, it's the signal that
teaches the next PICK.

## 1. Pick what to build

Before choosing anything, read, in this order:

1. [`STRATEGY.md`](STRATEGY.md) — the north star. Only propose work that makes the
   **core room-planning experience** better. Depth over breadth. Nothing shaped by
   monetization.
2. [`PREFERENCES.md`](PREFERENCES.md) — the maintainer's accumulated taste.
   - Honour everything under **Direction — what to build** (lean into these).
   - Never propose anything under **Avoid** — those were rejected at the idea
     level. Re-proposing a rejected idea is the one unforgivable mistake here.
3. [`DESIGN.md`](DESIGN.md) + the `#styleguide` gallery — so anything user-facing
   reuses existing primitives and tokens.

Then pick **exactly one** focused change. Good candidates:

- Deepen or polish an existing core flow (preferred — see STRATEGY).
- Fix a rough edge that makes the basics feel less solid.
- A genuinely core, small new capability — only if it clears the STRATEGY bar.

Keep the scope small enough to review in one sitting. One PR = one idea.

## 2. Build to the quality bar

- Follow [`CLAUDE.md`](../CLAUDE.md): reuse primitives, never hard-code a
  colour/font/radius/shadow, use the shared `Icon` component, follow the behaviour
  conventions in `DESIGN.md`.
- If you add a genuinely new primitive, add it to `StyleGuide.tsx` and note the
  rule in `DESIGN.md` in the same change.
- Run `npm run build`, `npm run lint`, and `npm test` before committing. Green is
  the baseline, not a bonus.

## 3. Open the pull request

- Branch: `claude/<short-kebab-summary>` off the latest `main`.
- One self-contained PR, opened **ready for review** (not a draft).
- Never merge your own PR — the maintainer decides.
- Body uses the template below so every proposal is reviewed the same way and the
  reject/learn loop has something concrete to react to.

```md
## What
One or two sentences: the change, in plain terms.

## Why it fits the strategy
Link the STRATEGY principle this serves (depth, craft, reliability, clarity) and
say which core flow it improves.

## Preference signals used
Which entries in PREFERENCES.md pointed toward this (or "none yet" for early PRs).

## How to review
The fastest path to see it working — a screen/route, a #styleguide section, or
steps to reproduce the before/after.

## Self-check
- [ ] build / lint / test green
- [ ] reuses existing primitives & tokens (no hard-coded values)
- [ ] scoped to one idea
```

After opening the PR, offer to watch it (`subscribe_pr_activity`) so review events
come back into the session automatically.

## 4 & 5. Review outcomes — and the learning protocol

When the maintainer responds, classify the outcome. The rejection comment is the
teaching signal; read it carefully (it may be in Swedish or English).

### Accepted / merged
Nothing to learn unless the approval comment asks for a follow-up. If it praises a
specific choice ("love that you reused the existing modal"), you may record that as
a positive **Direction** or **Execution** signal in `PREFERENCES.md`.

### Rejected — classify first
Every rejection is one of two kinds. Decide which before touching code:

| Kind | Meaning | What to do with the PR | What to record |
| --- | --- | --- | --- |
| **Direction** | Wrong feature / not what I want / out of scope. | **Close** the PR. Do not try to fix it. | Add the idea to **Avoid** and, if the comment reveals what *would* be wanted, add a **Direction** signal. |
| **Execution** | Right idea, wrong build (design, UX, approach, scope). | **Revise** the same PR to match the feedback. | Add an **Execution** signal so the mistake isn't repeated on the next feature. |

If it's genuinely ambiguous which kind it is, **ask** with `AskUserQuestion`
rather than guessing — include enough context that the maintainer can answer
without scrolling back.

### The learning step (do this on every rejection)

1. **Distil the lesson into a general rule**, not a restatement of this one PR.
   - ✗ "Don't add a teal export button to the 3D view."
   - ✓ "Export lives in the top bar, not floating on the canvas; never introduce
     new accent colours — use `--accent`."
2. **Update [`PREFERENCES.md`](PREFERENCES.md)**:
   - Put the rule under **Direction**, **Execution**, or **Avoid** (see its own
     maintenance rules — generalise, dedupe, keep it skimmable).
   - Append one row to the **Rejection log** linking the PR, the reason, and the
     rule you recorded.
3. **Commit the learning** (`docs: record preference from PR #NN feedback`). The
   learning commit is the deliverable even when the code is thrown away — it's
   what makes the next PICK smarter.
4. Then act on the PR per the table above (close, or revise).

## Running the workflow

- **On demand:** run `/propose-feature` (`.claude/commands/propose-feature.md`) to
  start one full loop — pick, build, open a PR.
- **Scheduled (optional):** the maintainer can set a Routine to fire
  `/propose-feature` on a cadence (e.g. weekly) so proposals arrive regularly.
  Keep it to **one open Claude PR at a time** so review stays manageable and each
  round can learn from the last before the next is built.

## Guardrails

- One open PR at a time; one idea per PR.
- Never merge your own PR.
- Never re-propose anything under **Avoid** in `PREFERENCES.md`.
- Always read `STRATEGY.md` + `PREFERENCES.md` before picking.
- A rejection is never "done" until the lesson is recorded in `PREFERENCES.md`.
