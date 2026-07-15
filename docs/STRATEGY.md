# RoomCraft — development strategy

This document describes how we decide **what to build right now** and why. It's the
"north star" that sits above individual features and roadmap tickets. Read it before
proposing new work, so effort keeps pointing in the same direction.

## Where we are

RoomCraft is still building its **core experience**. The goal for this phase is
simple to state and hard to do well:

> Make the best possible room-planning experience with a **small number of
> well-built features** — not a long list of shallow ones.

Above everything else, the app must be **simple and clear to use, and
mobile-first**. A first-time user on a phone should be able to go from an empty
room to one they love with as little friction as possible. Every screen is
designed for the small, touch-first viewport first (see
[`MOBILE-FIRST.md`](MOBILE-FIRST.md)); wider screens are an enhancement, never the
starting point. When a change would make the app harder to understand or harder to
use on a phone, it is the wrong change — even if it adds capability.

We are deliberately **not** optimizing for a monetization model yet. No feature
should be shaped by "how will this make money" at this stage. That question is
parked on purpose (see [Monetization](#monetization-is-parked-for-now) below).

## What we optimize for

Every decision is weighed against one question: **does this make the core
experience better?** Concretely, we prioritise:

1. **Depth over breadth.** A feature we already have, made noticeably better,
   beats a new feature that's merely present. Prefer finishing and polishing
   what exists over starting something new.
2. **Craft and consistency.** New UI reuses the existing primitives and design
   tokens (`docs/DESIGN.md`, the `#styleguide` gallery). The app should read as
   one coherent product, never a pile of features.
3. **Reliability.** The basics — creating rooms, placing furniture, 2D/3D
   editing, saving — should feel fast, predictable, and hard to break. A solid
   foundation is a feature.
4. **Clarity and simplicity, mobile-first.** Fewer, more obvious paths through the
   app, and every one of them easy to use on a phone. When in doubt, remove a
   choice rather than add one. Simplicity is a feature — removing friction and
   clutter counts as much as adding capability.

## What we say no to (for now)

- **Feature sprawl.** New feature ideas are welcome, but the default answer is
  "not yet." A feature earns its place by making the core experience clearly
  better, not by expanding the surface area.
- **Monetization-driven features.** Paywalls, tiers, upsell hooks, affiliate
  wiring — none of it is built during this phase, even where it would be easy.
- **Speculative infrastructure.** We don't build for scale, teams, or platforms
  we don't yet need. Build for the experience in front of us.

None of these are permanent bans — they're just not what this phase is about.

## How to decide if something is "in scope"

Before building, ask:

- Does this make an existing, core flow **better** — faster, clearer, more
  reliable, more delightful?
- Can it be built to the **quality bar** (design consistency, tests, no rough
  edges) within a reasonable scope?
- If it's a *new* feature rather than a *deepening* of an existing one, is it
  genuinely core to planning and furnishing a room — or is it a nice-to-have we
  can defer?

If the honest answer to the first two is "yes" and the feature is clearly core,
it's a good candidate. Otherwise, write it down for later and move on.

## Monetization is parked — for now

We are intentionally **not** committing to a monetization model yet. Chasing a
pricing or revenue strategy before the core experience is strong would distort
the product and waste effort on features we might not keep.

The plan is sequential:

1. **Now:** build the best core room-planning experience (this document).
2. **Later:** once the foundation is genuinely good, evaluate which monetization
   model to pursue.

We already keep a running list of monetization ideas in
[`MONETIZATION.md`](MONETIZATION.md). Treat it as a **future idea bank**, not a
current mandate — nothing there should drive what we build today. When the core
experience is in place, we revisit that document and choose a direction
deliberately.

## The hardest problems to get right

Building the core experience well means solving a few genuinely hard technical
problems: a GUI that stays simple yet exposes every important feature, validation
rules that are both general and relevant, and an AI recommendation engine that
gives high-quality suggestions. These are called out in
[`TECHNICAL-CHALLENGES.md`](TECHNICAL-CHALLENGES.md) — read it to understand where
the real difficulty lives.

## In short

> Build fewer things, build them well, get the core experience right — and only
> then decide how RoomCraft makes money.
