# RoomCraft — what this app is for

This document explains **why RoomCraft exists** and the single promise it's built
around. It sits alongside [`STRATEGY.md`](STRATEGY.md) (which decides *what we
build right now*) and is referenced from [`../CLAUDE.md`](../CLAUDE.md).

## The purpose, in one sentence

> Make it **stupidly simple** to get help finding the best interior design for
> your rooms.

Everything else — the 2D floor-plan editor, the 3D view, the furniture library,
the palettes — exists to serve that one promise. If a feature doesn't help
someone get to a room they love, faster and with less effort, it isn't pulling
its weight.

## Who it's for

People who want a room that works and looks good, but who are **not** interior
designers and don't want to become one. They shouldn't need to know design
theory, measure like an architect, or wrestle with complicated software. They
have a room and a rough idea; RoomCraft does the rest.

## The problem we're solving

Furnishing a room is harder than it should be:

- **It's hard to picture.** Floor plans are abstract; a flat drawing doesn't tell
  you whether the sofa will crowd the doorway or the bed will block the window.
- **It's hard to know what's "best."** What fits? What goes together? Where
  should things go? Most people guess, and only find out after buying and moving
  furniture around.
- **The tools are heavy.** Professional design software is powerful and
  intimidating. Most people don't need power — they need an answer.

RoomCraft removes all three: sketch the room, see it in 3D, and get concrete,
good suggestions for how to furnish it.

## How RoomCraft delivers on it

The whole experience is shaped so that getting a great result feels effortless:

1. **Sketch the room in minutes.** Draw the walls, drop in doors and windows,
   type real measurements. No CAD knowledge required.
2. **See it, don't imagine it.** The 3D view turns the plan into a room you can
   walk your eye through, so decisions are obvious instead of abstract.
3. **Get help, don't start from a blank page.** Describe what you need and
   RoomCraft proposes a full furniture layout — each with its own floor and wall
   palette — that you can accept, tweak, or use as a starting point. This is the
   heart of the promise: **you should never have to stare at an empty room
   wondering where to begin.**
4. **Make it yours, safely.** Move, rotate, recolour and customise every piece,
   with undo/redo on everything, so experimenting is free of risk.

The measure of success is simple: someone with no design background should be
able to go from an empty room to a furnished one they're happy with, quickly and
enjoyably.

## How this connects to the rest of the project

- **Strategy.** [`STRATEGY.md`](STRATEGY.md) turns this purpose into a way of
  working: build a **small number of well-built features** that make room
  planning genuinely easy, and deepen them rather than sprawl. This document is
  the *why*; the strategy is the *how we choose*.
- **Design.** Because "simple" is a feeling, not just a feature list, the UI has
  to stay calm and coherent. That's what [`DESIGN.md`](DESIGN.md) and the
  `#styleguide` gallery protect — one consistent product, never a pile of
  controls. Ease of use is a design property, so keeping the interface simple *is*
  part of the purpose.
- **Monetization.** How RoomCraft eventually makes money is
  [parked on purpose](STRATEGY.md#monetization-is-parked--for-now). We get the
  core "help me furnish my room" experience right first, then decide.

## The test for any new work

Before building anything, ask the question this document exists to answer:

> **Does this make it easier for someone to find the best interior design for
> their room?**

If yes, and it can be built to the quality bar, it belongs. If it adds steps,
choices, or complexity without making that outcome easier or better, it doesn't —
no matter how clever it is.
