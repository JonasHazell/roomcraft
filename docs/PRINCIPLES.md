# RoomCraft — principles

This document is the **operating guide** for every change to RoomCraft: the
principles we build with. Where [`PURPOSE.md`](PURPOSE.md) is the *why* and
[`STRATEGY.md`](STRATEGY.md) is *what we build now*, this is the ***how we behave*** —
the values a change is weighed against, whoever (or whatever) makes it.

It matters most for the agent pipeline: Stage A weighs a proposal against these
principles before proposing it, and Stage B keeps a build faithful to them. They are
guiding values, not a rejection checklist — the goal is good, ambitious work toward the
vision, built with care.

These consolidate the direction already stated across `PURPOSE.md`, `STRATEGY.md`, and
`VISION.md` into one place so it can be applied consistently.

## The litmus test

Before anything else, every change answers a question rooted in
[`PURPOSE.md`](PURPOSE.md) and now widened to the destination in
[`VISION.md`](VISION.md):

> **Does this help someone find, plan, and get the interior design they love — for a
> room, a home, together with others, and connected to real furniture?**

If yes, and we can build it with care, it belongs — whether it deepens an existing
flow or opens a new one toward the vision.

## Principles

These are the values we build with. They are **preferences that guide good work, not
gates that block ambitious work** — when one of them pulls against a genuinely valuable
step toward the vision, the step can still win.

1. **Ambition toward the vision.** Both deepening what exists and opening new surface
   toward the destination count. Breadth is welcome when it advances the vision.
   (`STRATEGY.md`, `VISION.md`)
2. **Simplicity is worth protecting.** Removing friction and clutter is valuable; keep
   the app as clear as the work allows — but not at the cost of capability the vision
   needs. (`STRATEGY.md`)
3. **Phone-friendly by default.** Design so it works well on a small, touch-first
   screen; wider screens build on that. A strong default, not an absolute veto.
   (`MOBILE-FIRST.md`)
4. **Craft and consistency.** Reuse existing primitives and design tokens where you can,
   so the app reads as one coherent product. (`DESIGN.md`)
5. **Reliability is a feature.** The basics — creating rooms, placing furniture, 2D/3D
   editing, saving — must feel fast, predictable, and hard to break. (`STRATEGY.md`)
6. **Never a blank page.** The user should never stare at an empty room wondering where
   to begin — proposing a good starting point is the heart of the promise. (`PURPOSE.md`)
7. **Experimenting is risk-free.** Undo/redo on everything, so trying things out never
   costs the user anything. (`PURPOSE.md`, `DESIGN.md`)

## What's in scope

Everything that moves RoomCraft toward the vision is in scope, including the things
that used to be parked:

- **New features and surface area** toward the destination — RoomCraft doing *more*,
  not only doing what it has *better*.
- **Monetization.** Paywalls, tiers, credits, affiliate/partner links, "Buy this room,"
  and B2B licensing are all buildable now (see [`VISION.md`](VISION.md#how-it-makes-money)).
- **Infrastructure for where we're going** — multi-room/multi-home models,
  collaboration, accounts, a real-furniture catalogue.

## When principles conflict

If two principles pull in different directions, weigh them with judgment and taste —
there is no automatic winner. Capability that advances the vision can outweigh keeping
a surface maximally simple; the litmus test is the guide, not a veto.
