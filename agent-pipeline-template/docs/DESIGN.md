# Design system & quality bar

> **[TEMPLATE — fill this in]**
> This is the reference every user-facing change is held against. Stage B reads it to
> **reuse existing primitives and tokens instead of inventing new ones**, and Stage A
> cites it when a proposal points at an inconsistency. The single most valuable thing
> this doc does for the pipeline is make "matches the design" a checkable rule rather
> than a matter of taste.
>
> Write:
> - **Design tokens.** The canonical colours, type scale, spacing, radii, shadows —
>   and the rule that code references tokens, never hard-coded values.
> - **Component vocabulary.** The shared primitives (button, input, card, modal, chip,
>   hint, error, icon…) with their class/component names, so an agent reuses `.btn`
>   rather than styling a new one.
> - **Behaviour conventions.** Cross-cutting interaction rules: keyboard/Esc handling,
>   undo/redo, selection, focus, minimum touch-target size, responsive behaviour.
> - **A living gallery (recommended).** If you can, render every primitive from the
>   real stylesheet in one place and link it here, so the reference never drifts from
>   the app. Add a rule: *a genuinely new primitive must be added to the gallery and
>   documented here in the same change.*
> - **Non-UI projects:** replace the above with your code-quality conventions —
>   module boundaries, naming, error handling, public-API shape — since that is what
>   "matches the design" means for you.
>
> Delete this block once written.

## Design tokens

_The canonical values and the "reference the token, never the literal" rule._

## Component vocabulary

_The shared primitives and their names._

## Behaviour conventions

_Esc, undo/redo, selection, focus, touch targets, responsiveness._

## Keeping this reference honest

_How the doc stays in sync with the real code (the gallery rule)._
