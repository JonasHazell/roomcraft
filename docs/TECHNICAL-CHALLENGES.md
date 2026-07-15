# RoomCraft — the biggest technical challenges

This document names the **hardest problems** RoomCraft has to solve well. They're
not features or tickets — they're the underlying challenges that the core
experience (see [`PURPOSE.md`](PURPOSE.md) and [`STRATEGY.md`](STRATEGY.md)) lives
or dies by. Each one is easy to do *adequately* and genuinely hard to do *well*,
which is exactly why they're worth calling out.

## 1. A GUI that is simple to use, yet exposes every important feature

The central tension of the whole product: the app must stay **stupidly simple**
to use — mobile-first, uncluttered, obvious — while still making **all the
important features reachable**. Sketching walls, doors and windows, placing and
customising furniture, editing in 2D and 3D, palettes, AI suggestions and
auto-arrange are a lot of capability to put behind a phone-sized, touch-first
interface without turning it into a wall of controls.

The challenge is holding both at once: adding depth without adding friction. Every
new control competes for the same small screen and the same first-time user's
attention, so the hard part is deciding what stays one tap away, what folds into a
panel, and what gets removed entirely. When in doubt we remove a choice rather
than add one — simplicity is treated as a feature, not a constraint.

See [`DESIGN.md`](DESIGN.md) for the component vocabulary and behaviour
conventions, and [`MOBILE-FIRST.md`](MOBILE-FIRST.md) for the phone-first rules
that keep this in check.

## 2. Validation rules that are both general and relevant

RoomCraft judges a layout and gives feedback, which means it needs **validation
rules** — clearance in front of furniture, escape windows, daylight, zoning, rugs
under seating groups, furniture that walls off part of the room, and so on. The
difficulty is that these rules have to be **general** — they must hold across
wildly different rooms, shapes and furniture combinations — while staying
**relevant**, so they fire on real problems and don't nag about things that are
actually fine.

The trap at both extremes: rules that are too strict flag good layouts and
undermine trust; rules that are too loose let bad layouts pass and make the
feedback worthless. Getting the thresholds, severities and interactions right —
so guidance reflects genuine interior-design quality rather than arbitrary
numbers — is an ongoing, hard-to-tune problem.

The rules themselves are documented in
[`interior-design-rules.md`](interior-design-rules.md).

## 3. An AI recommendation engine that gives high-quality suggestions

The heart of the promise is that you **never stare at an empty room** — RoomCraft
proposes full furniture layouts for your specific room. Making that work is hard:
the engine has to produce suggestions that are **genuinely good** — layouts that
fit the room's real dimensions, doors and windows; that are practical and
pleasant to live in; and that clear the app's own validation rules — not just
*any* arrangement of furniture.

That means turning a room's geometry and a user's rough description into concrete,
valid, high-quality placements, reliably and quickly enough to feel effortless on
a phone. Quality, validity, variety and speed all pull against each other, and the
bar is the **best** automatic suggestions for a given room, not merely plausible
ones — which keeps this the deepest technical challenge of the three.

This is the core promise described in [`PURPOSE.md`](PURPOSE.md); the suggestions
are held to the same validation rules as challenge 2.
