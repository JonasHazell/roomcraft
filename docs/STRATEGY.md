# RoomCraft — development strategy

This document describes how we decide **what to build right now** and why. It's the
"north star" that sits above individual features and roadmap tickets. Read it before
proposing new work, so effort keeps pointing in the same direction.

## Where we are

RoomCraft has a solid core, and we are now **building toward the vision** — the
destination in [`VISION.md`](VISION.md): the best interior-design planner for one or
more people, planning a room, several rooms, or a whole home together, with every
suggestion connected to real furniture that's easy to buy, and a two-sided
marketplace where people and retailers meet.

That destination is **in scope today**, not "later." We deepen the core *and* expand
toward the destination in the same phase — multi-room and multi-home planning,
collaboration between people, real/buyable furniture, and the revenue models that
make it a business are all fair game now.

Quality still matters — simple, clear, and good on a phone is how RoomCraft wins — but
those are **values we optimize for, not gates that block ambitious work**. A change
that adds real capability toward the vision is welcome even when it's larger, broader,
or reaches into new surface area, as long as we build it with care.

## What we optimize for

Every decision is weighed against one question: **does this move RoomCraft toward
the vision — a room, a home, and eventually a marketplace people love?** Concretely,
we value:

1. **Ambition toward the destination.** Both deepening what exists *and* opening new
   surface toward the vision count — multi-room, collaboration, real/buyable
   furniture, revenue. Breadth is no longer discouraged; a genuinely new capability
   that advances the vision is welcome.
2. **Craft and consistency.** New UI should reuse the existing primitives and design
   tokens (`docs/DESIGN.md`, the `#styleguide` gallery) where it can, so the app
   reads as one coherent product. A preference, not a hard gate.
3. **Reliability.** The basics — creating rooms, placing furniture, 2D/3D
   editing, saving — should feel fast, predictable, and hard to break. A solid
   foundation is a feature.
4. **Clarity and simplicity, phone-friendly.** Fewer, more obvious paths through the
   app, easy to use on a phone, remain the goal we aim for — but no longer a veto on
   work that adds capability.

## What we're now taking on

Everything that was parked "for later" is on the table:

- **New features and surface area** toward the vision — expanding what RoomCraft
  does, not just polishing what it has.
- **Monetization.** Paywalls, tiers, credits, affiliate/partner links, a
  "Buy this room" flow, B2B licensing — all fair game to design and build now (see
  [`VISION.md`](VISION.md#how-it-makes-money)).
- **Infrastructure for where we're going** — multi-room/multi-home data models,
  collaboration, accounts, a real-furniture catalogue, and the plumbing the
  destination needs.

Build with care and taste; that's the only remaining bar. Our operating principles
are in [`PRINCIPLES.md`](PRINCIPLES.md).

## How to decide if something is "in scope"

Before building, ask:

- Does this move RoomCraft toward the **vision** — a better room, a better home, a
  path to real furniture, collaboration, or the marketplace?
- Or does it make an existing flow **better** — faster, clearer, more reliable, more
  delightful?
- Can we build it with care?

If yes, it's a good candidate — whether it deepens what exists or opens something
new. There's no longer a "defer new features" default: pursue the highest-value work
toward the vision, new surface area included.

## Monetization is in play

Monetization is **no longer parked**. Building the business is part of building the
product now — the candidate revenue models are described in
[`VISION.md`](VISION.md#how-it-makes-money): freemium/subscription around the AI,
validation and export features, affiliate/partner links and a "Buy this room" flow on
the furniture catalogue, credits/one-off purchases, and B2B licensing. Design and
build toward them deliberately; they no longer wait on a "core is done" gate.

## The hardest problems to get right

Even as we expand toward the vision, a few genuinely hard problems stay central — the
ones the whole experience lives or dies by. Each is easy to do *adequately* and
genuinely hard to do *well*, which is exactly why they're worth calling out. They keep
mattering alongside the new surface area, not instead of it.

### 1. A GUI that is simple to use, yet exposes every important feature

The central tension of the whole product: the app must stay **stupidly simple** to use
— mobile-first, uncluttered, obvious — while still making **all the important features
reachable**. Sketching walls, doors and windows, placing and customising furniture,
editing in 2D and 3D, palettes, AI suggestions and auto-arrange are a lot of capability
to put behind a phone-sized, touch-first interface without turning it into a wall of
controls.

The challenge is holding both at once: adding depth without adding friction. Every new
control competes for the same small screen and the same first-time user's attention, so
the hard part is deciding what stays one tap away, what folds into a panel, and what gets
removed entirely. When in doubt we remove a choice rather than add one — simplicity is
treated as a feature, not a constraint. See [`DESIGN.md`](DESIGN.md) and
[`MOBILE-FIRST.md`](MOBILE-FIRST.md) for the conventions that keep this in check.

### 2. Validation rules that are both general and relevant

RoomCraft judges a layout and gives feedback, which means it needs **validation rules** —
clearance in front of furniture, escape windows, daylight, zoning, rugs under seating
groups, furniture that walls off part of the room, and so on. The difficulty is that these
rules have to be **general** — they must hold across wildly different rooms, shapes and
furniture combinations — while staying **relevant**, so they fire on real problems and
don't nag about things that are actually fine.

The trap at both extremes: rules that are too strict flag good layouts and undermine
trust; rules that are too loose let bad layouts pass and make the feedback worthless.
Getting the thresholds, severities and interactions right — so guidance reflects genuine
interior-design quality rather than arbitrary numbers — is an ongoing, hard-to-tune
problem. The rules themselves are documented in
[`interior-design-rules.md`](interior-design-rules.md).

### 3. An AI recommendation engine that gives high-quality suggestions

The heart of the promise is that you **never stare at an empty room** — RoomCraft proposes
full furniture layouts for your specific room. Making that work is hard: the engine has to
produce suggestions that are **genuinely good** — layouts that fit the room's real
dimensions, doors and windows; that are practical and pleasant to live in; and that clear
the app's own validation rules — not just *any* arrangement of furniture.

That means turning a room's geometry and a user's rough description into concrete, valid,
high-quality placements, reliably and quickly enough to feel effortless on a phone.
Quality, validity, variety and speed all pull against each other, and the bar is the
**best** automatic suggestions for a given room, not merely plausible ones — which keeps
this the deepest challenge of the three. This is the core promise described in
[`PURPOSE.md`](PURPOSE.md); the suggestions are held to the same validation rules as
challenge 2.

## In short

> Build toward the vision now — deepen the core, expand the surface, connect to real
> furniture, and build the business — with care and taste as the bar.
