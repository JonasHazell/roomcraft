# Architecture — the feature→code map

> **[TEMPLATE — fill this in]**
> This is an orientation map from a *feature* to the *files that implement it*. Both
> Stage A and Stage B lean on it heavily: Stage A skims it to see what the app
> **already does** (so it deepens an existing feature instead of proposing a duplicate),
> and Stage B uses it to find the files that own a feature and to **reuse the existing
> store slice / module instead of building a parallel one**. Keep it current — a stale
> map produces duplicate proposals and misplaced code.
>
> Write:
> - **The surfaces.** The main screens/panels/entry points and which files render them.
> - **State.** Where application state lives (stores/slices) and what each owns.
> - **The domain/core modules.** The non-UI logic (engine, services, API layer) and
>   what each is responsible for.
> - **A feature→files table.** For each core feature, the primary files/directories
>   that own it. This is the part the agents use most.
> - **Conventions for where new code goes.** So a new feature lands in the right place.
>
> Delete this block once written.

## Surfaces

_The main screens/panels and the files that render them._

## State

_Where state lives and what each store/slice owns._

## Core / domain modules

_The non-UI logic and each module's responsibility._

## Feature → files

| Feature | Owns it (files / directories) |
| ------- | ----------------------------- |
| _feature_ | _paths_ |

## Where new code goes

_Conventions so new features land in the right place._
