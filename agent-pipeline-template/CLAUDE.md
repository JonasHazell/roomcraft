# <PROJECT> — guidance for Claude

> **[TEMPLATE — fill this in]**
> One paragraph: what this project is, the stack, where state lives, how the UI is
> styled (or, for a non-UI project, the main modules). This is the first thing every
> agent and every subagent reads. Keep it to a few sentences — the detail lives in the
> docs linked below.

For a map of the project docs — purpose, strategy, design system, and the agent
pipeline — see [`docs/README.md`](docs/README.md).

## What the app is for

> **[TEMPLATE — fill this in]**
> One or two sentences on the product's reason to exist, then point at
> [`docs/PURPOSE.md`](docs/PURPOSE.md) for the *why* behind any feature. The agents use
> this to judge whether a proposal serves the core experience.

## Development strategy

> **[TEMPLATE — fill this in]**
> State the current build philosophy in a sentence (e.g. "depth over breadth — a small
> number of well-built features") and point at [`docs/STRATEGY.md`](docs/STRATEGY.md).
> The proposal agent reads this to decide what's worth building right now.

## UI / quality bar

> **[TEMPLATE — fill this in]**
> If the project has a UI: state that any user-facing change must consult
> [`docs/DESIGN.md`](docs/DESIGN.md) first, reuse existing primitives and design
> tokens, and never hard-code colours/fonts/radii. If the project has no UI, replace
> this with your code-quality bar (typing, error handling, module boundaries) and point
> at `docs/DESIGN.md` where you've documented it.

## Everyday commands

> **[TEMPLATE — fill this in]** — the agents run these verbatim, so they must be exact.

- `<BUILD_CMD>` — type-check / production build.
- `<LINT_CMD>` — lint.
- `<TEST_CMD>` — unit tests.
- `<E2E_CMD>` — end-to-end tests (delete if not applicable).

Run the build/lint/test before committing changes.

## Validation rule (optional)

> **[TEMPLATE — fill this in, or delete]**
> If you want to force every user-facing change to be driven in a real browser before
> it can be committed (recommended for UI products), document that rule here and back it
> with a `Stop`-style hook. `AGENT_BUILD.md` already references this step — keep it only
> if you set the hook up.
