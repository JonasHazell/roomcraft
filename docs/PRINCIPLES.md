# RoomCraft — principles & non-goals

This document is the **operating contract** for every change to RoomCraft: the
principles we hold to, and the things we deliberately don't do. Where
[`PURPOSE.md`](PURPOSE.md) is the *why* and [`STRATEGY.md`](STRATEGY.md) is *what we
build right now*, this is the ***how we behave*** — the standing rules a change is
judged against, whoever (or whatever) makes it.

It matters most for the agent pipeline: Stage A checks a proposal against these
principles and non-goals before proposing it, Stage B keeps a build faithful to them,
and — in a more autonomous setup — an automated reviewer would score work against this
exact list. Goals tell an agent what to aim for; principles tell it where the edges are.

Nothing here is new: it consolidates rules already stated across `PURPOSE.md`,
`STRATEGY.md`, `DESIGN.md`, and `TECHNICAL-CHALLENGES.md` into one place so they can be
applied consistently.

## The litmus test

Before anything else, every change answers the question from [`PURPOSE.md`](PURPOSE.md):

> **Does this make it easier for someone to find the best interior design for their
> room?**

If yes, and it can be built to the quality bar, it may belong. If it adds steps,
choices, or complexity without making that outcome easier or better, it doesn't — no
matter how clever it is.

## Principles

1. **Depth over breadth.** A feature we already have, made noticeably better, beats a
   new feature that's merely present. Prefer finishing and polishing what exists over
   starting something new. (`STRATEGY.md`)
2. **Simplicity is a feature.** Removing friction and clutter counts as much as adding
   capability. When in doubt, **remove a choice rather than add one**. (`STRATEGY.md`,
   `TECHNICAL-CHALLENGES.md`)
3. **Mobile-first, always.** Judge every idea on a small, touch-first screen first;
   wider screens are an enhancement, never the starting point. (`STRATEGY.md`,
   `MOBILE-FIRST.md`)
4. **Craft and consistency.** Reuse existing primitives and design tokens; the app must
   read as one coherent product, never a pile of features. (`STRATEGY.md`, `DESIGN.md`)
5. **Reliability is a feature.** The basics — creating rooms, placing furniture, 2D/3D
   editing, saving — must feel fast, predictable, and hard to break. A solid foundation
   is a feature. (`STRATEGY.md`)
6. **Never a blank page.** The user should never stare at an empty room wondering where
   to begin — proposing a good starting point is the heart of the promise. (`PURPOSE.md`)
7. **Experimenting is risk-free.** Undo/redo on everything, so trying things out never
   costs the user anything. (`PURPOSE.md`, `DESIGN.md`)
8. **Simple is a feeling, not a feature list.** Keep the interface calm and coherent;
   protecting that calm *is* part of the product, not a nicety. (`PURPOSE.md`)

## Non-goals (for now)

These are out of scope for the current phase. A proposal that depends on one of them is
rejected regardless of quality. None are permanent bans — they're just not what this
phase is about. (`STRATEGY.md`)

- **Feature sprawl.** The default answer to a new feature is "not yet." A feature earns
  its place by making the core experience clearly better, not by expanding surface area.
- **Monetization-driven features.** Paywalls, tiers, upsell hooks, affiliate wiring —
  none of it is built during this phase, even where it would be easy. (See
  [`MONETIZATION.md`](MONETIZATION.md), a parked idea bank.)
- **Speculative infrastructure.** No building for scale, teams, or platforms we don't
  yet need. Build for the experience in front of us.

## When principles conflict

If two principles pull in different directions, **clarity and the core promise win over
added capability**. `STRATEGY.md` states it plainly: when a change would make the app
harder to understand or harder to use on a phone, it is the wrong change — *even if it
adds capability*. Simplicity and the litmus test are the tie-breakers.
