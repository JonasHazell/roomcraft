---
description: Autonomously propose and build one strategy-fit improvement, then open a PR
---

Run one full round of the [autonomous feature workflow](../../docs/FEATURE-WORKFLOW.md).

1. **Read first, in order:** `docs/STRATEGY.md` (north star), `docs/LEARNED-PREFERENCES.md`
   (accumulated taste — honour **Direction**, never touch **Avoid**), and
   `docs/DESIGN.md` + the `#styleguide` gallery for any UI.
2. **Pick exactly one** focused, strategy-fit change — prefer deepening/polishing an
   existing core flow over new surface area. One PR = one idea.
3. **Build it to the quality bar.** Reuse primitives and tokens (no hard-coded
   values), use the shared `Icon` component. Run `npm run build`, `npm run lint`,
   `npm test` — all must be green.
4. **Open a PR** off the latest `main` on a `claude/<summary>` branch, ready for
   review, using the PR body template in `docs/FEATURE-WORKFLOW.md`. Do not merge it
   yourself. Then offer to watch it with `subscribe_pr_activity`.

If the maintainer later rejects the PR, follow the **learning protocol** in
`docs/FEATURE-WORKFLOW.md`: classify the rejection as *direction* vs *execution*,
record the generalised lesson in `docs/LEARNED-PREFERENCES.md`, log it, commit the learning,
then close or revise the PR accordingly.

$ARGUMENTS
