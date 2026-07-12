# RoomCraft — maintainer preferences (living file)

The accumulated **taste** behind RoomCraft: what kind of work the maintainer wants
and how it should be built. It starts mostly empty and **grows every time a PR is
rejected**, so that Claude never makes the same miss twice.

- **Read this before picking or building anything** — it sits alongside
  [`STRATEGY.md`](STRATEGY.md) in the [autonomous workflow](FEATURE-WORKFLOW.md).
- **Update this after every rejection** (and optionally after praise). The workflow
  document describes exactly when and how.

`STRATEGY.md` is the fixed north star; this file is the empirical layer learned
from real decisions. If the two ever conflict, STRATEGY wins and this file should
be corrected.

## How to maintain this file

1. **Record rules, not incidents.** Generalise the feedback so it applies to the
   next feature, not just the one that was rejected. (See the workflow doc's
   "distil the lesson" step.)
2. **One place per rule.** Direction, Execution, or Avoid — pick the right section;
   don't duplicate across them.
3. **Dedupe and merge.** If new feedback sharpens an existing rule, edit that rule
   instead of adding a near-copy. Keep every section skimmable.
4. **Keep entries short** — a sentence or two, with a PR link for provenance.
5. **Prune stale rules.** If the maintainer reverses a preference, update or remove
   the rule and note it in the log.

---

## Direction — what to build

Positive signals about the *kind* of feature/work the maintainer wants. Lean into
these when picking.

_None recorded yet. As PRs are accepted with praise, or rejections reveal what
would have been wanted, add rules here._

<!-- Template:
- **<short rule>.** <one sentence of context.> (PR #NN)
-->

## Execution — how to build

Signals about *how* things should be built — design, UX, scope, code approach.
These apply on top of `DESIGN.md` and `CLAUDE.md`.

_None recorded yet._

<!-- Template:
- **<short rule>.** <one sentence of context.> (PR #NN)
-->

## Avoid — do not propose again

Ideas or directions that were rejected at the **idea level**. Never re-propose
anything here. If a related idea seems worth revisiting, ask first.

_None recorded yet._

<!-- Template:
- **<idea, in a few words>** — rejected because <reason>. (PR #NN)
-->

---

## Rejection log

Chronological record of every rejected PR and the rule it produced. This is the
audit trail that keeps the sections above honest.

| Date | PR | What was proposed | Why rejected | Kind | Rule recorded |
| --- | --- | --- | --- | --- | --- |
| _(example — remove once real rows exist)_ | #0 | Floating export button on the 3D canvas | Wrong placement; introduced a new colour | Execution | "Export lives in the top bar; only `--accent`, never new accent colours" |

<!-- Add newest at the bottom:
| YYYY-MM-DD | #NN | <proposal> | <reason, quoted/paraphrased> | Direction / Execution | <the rule you added above> |
-->
