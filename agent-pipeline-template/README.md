# Agent pipeline — portable template

This folder is a **portable copy of a three-stage, self-improving agent pipeline**:
agents **propose** changes as GitHub issues, **build** each one into a pull request,
and **analyse** what the human did so the next round gets better — including editing
their own instructions when a lesson proves itself.

Copy this whole tree into a new project's repository, fill in the project-specific
docs, and wire up the three scheduled Routines. The mechanism is project-agnostic;
only the *taste* (what "good" means for your product) is yours to write.

---

## The two kinds of file in here

**1. Product / taste docs — YOU fill these in.**
They are empty scaffolds with a `> **[TEMPLATE — fill this in]**` block at the top of
each section telling you exactly what to write and *why the agents need it*. These
carry your project's judgement; without them the agents have no idea what to build.

| File | What it must end up containing |
| ---- | ------------------------------ |
| `CLAUDE.md` | Working conventions + the exact build/lint/test commands. |
| `docs/PURPOSE.md` | The single promise your product is built around. |
| `docs/VISION.md` | Where the product is heading beyond the current phase — the direction proposals move toward. |
| `docs/STRATEGY.md` | What you build **right now** — depth over breadth, what's in scope, what's parked. |
| `docs/PRINCIPLES.md` | The operating principles and **non-goals** every change is judged against; the tie-breaker for conflicts. |
| `docs/DESIGN.md` | Your design system + quality bar (or, for a non-UI project, your code-quality bar). |
| `docs/ARCHITECTURE.md` | The feature→code map: where each feature lives. |

**2. Agent pipeline docs — COPY these almost as-is.**
They hold the loop's mechanism and only need light parameterization (replace
`<OWNER/REPO>` and the command placeholders). The two memory files ship **blank on
purpose** — that's a fresh project's starting state.

| File | Role | What to change |
| ---- | ---- | -------------- |
| `docs/AGENT_PIPELINE.md` | Overview: the loop, labels, guardrails. | `<OWNER/REPO>`, cadence/caps if you want. |
| `docs/AGENT_PROPOSALS.md` | Stage A — propose changes as issues. | `<OWNER/REPO>`, your "exercise the product" method. |
| `docs/AGENT_BUILD.md` | Stage B — turn issues into PRs. | `<OWNER/REPO>`, command placeholders, UI/e2e notes. |
| `docs/AGENT_ANALYSIS.md` | Stage C — learn from decisions, self-improve. | `<OWNER/REPO>`, the scope start date. |
| `docs/AGENT_LEARNINGS.md` | Qualitative memory. | Nothing — leave it blank; Stage C fills it. |
| `docs/AGENT_METRICS.md` | Quantitative memory. | Nothing — leave the empty snapshot; Stage C fills it. |
| `docs/README.md` | The docs map. | Trim any docs you didn't create. |

---

## How to stand it up in a new project

1. **Copy** `CLAUDE.md` and the `docs/` folder into your new repo's root.
2. **Fill in** every `> **[TEMPLATE — fill this in]**` block in the product docs and
   `CLAUDE.md`. Delete the template blocks once written. Be honest and concrete — this
   is the *only* taste the agents have.
3. **Parameterize** the agent docs: replace `<OWNER/REPO>` everywhere, set the real
   `<BUILD_CMD>` / `<LINT_CMD>` / `<TEST_CMD>` (or point them at `CLAUDE.md`), and set
   the analysis scope start date in `AGENT_ANALYSIS.md`.
4. **Create the labels** in the repo: `agent:ready`, `agent:building`, `agent:built`,
   `agent:analyzed`.
5. **Create the three Routines** (scheduled triggers). Each fires into a *fresh
   session* that clones the default branch and does one job. Keep the prompt thin —
   just point at the matching doc:
   - **Routine A — Propose** — daily (e.g. 06:00 UTC) → "Follow `docs/AGENT_PROPOSALS.md`."
   - **Routine B — Build** — every few hours → "Follow `docs/AGENT_BUILD.md`."
   - **Routine C — Analyse** — daily (e.g. 22:00 UTC) → "Follow `docs/AGENT_ANALYSIS.md`."
6. **Merge this to the default branch first.** The Routines clone the default branch,
   so the docs must be there before they can read them.

### Optional infrastructure the agent docs mention

The copied `AGENT_BUILD.md` refers to a few things that are only relevant if your
project has them. Set up what applies and delete the rest of the references:

- A **build/lint/test** toolchain (required — the PR quality gate depends on it).
- An **end-to-end / browser harness** and a `Stop`-style validation gate, if your
  product has a UI worth driving before merge.
- A **screenshot-attaching helper** for PRs, if changes are visual.
- **Runtime telemetry** (latency/cost/error logs) if you want the product-observability
  half of `AGENT_METRICS.md` to be more than "not sampled".

---

## The one decision to make deliberately: the merge gate

This pipeline is built around **the human as the merge decision** — nothing
auto-merges, and every self-modification of the agent instructions also lands as a PR
you approve. That human gate is the loop's quality signal: Stage C learns almost
entirely from *what you merged, edited, or rejected*.

If you remove the human to run fully autonomously, you remove that signal — so plan to
replace it (an automated judge stage that scores proposals/PRs against `PURPOSE`/
`STRATEGY`/`DESIGN`, plus real runtime telemetry) rather than simply deleting the gate.
Recommended default: **keep the human merge gate**, and make everything up to it
autonomous.
