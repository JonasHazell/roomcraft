# RoomCraft — mobile-first, one component set

RoomCraft is built **mobile-first**, and there is **one set of components** that
serves every screen size. A phone, a tablet and a desktop browser all render the
_same_ React components and the _same_ `src/index.css` classes — they adapt, they
are never duplicated.

This document sits alongside [`DESIGN.md`](DESIGN.md): DESIGN.md is _what the
primitives are_, this is _how they behave across viewports_. Read both before
building or changing a UI surface.

## The two principles

### 1. Mobile-first

Design and build for the smallest, most constrained screen first, then let the
layout _progressively enhance_ as space allows. In practice:

- **Base styles target mobile.** The default rules in `src/index.css` — outside of
  any `@media` block — are the phone layout. Wider screens are opened up with
  **`min-width`**-flavoured enhancements, not the other way around. (Where a rule
  reads more naturally as "shrink for small screens", a `max-width` query is fine —
  the point is that the _base_ experience is the mobile one, never a desktop layout
  bolted onto a phone.)
- **Touch is the primary input.** Assume a finger, not a cursor. Hover is an
  enhancement, never a requirement — every action reachable by hover must also be
  reachable by tap.
- **Vertical space is scarce.** Prefer stacking (`.stack`, `.field-grid`
  collapsing to one column) and collapsible `.section` groups over wide, dense
  rows.
- **Respect the notch.** Anything docked to a screen edge uses the
  `env(safe-area-inset-*)` values (e.g. `.room-topbar`, `.plan-topbar`,
  `.selection-bar-wrap`) so it clears rounded corners and camera cutouts.

### 2. One component set for mobile and web

We do **not** ship a "mobile version" and a "desktop version". There is one
component tree. A component adapts to its environment in one of two ways, in this
order of preference:

1. **CSS, via the shared classes and breakpoints.** Most adaptation is layout, and
   layout belongs in `src/index.css`. The component renders the same markup; the
   stylesheet reflows it. This is always the first choice — it keeps behaviour in
   one place and needs no JavaScript.
2. **A media-query hook, only when markup or behaviour must genuinely differ.**
   When a component needs to render _different elements_ or wire up _different
   interaction_ (not just restyle), use the shared
   [`useMediaQuery`](../src/lib/useMediaQuery.ts) hook. Never branch on
   `window.innerWidth` directly, and never keep a separate `Mobile*` /
   `Desktop*` component.

> If you find yourself about to create `FooMobile` and `FooDesktop`, stop. Make
> `Foo` responsive instead — with CSS first, and `useMediaQuery` only for the part
> that truly can't be expressed in CSS.

## Breakpoints

The breakpoints are shared between CSS and JS so the two never disagree. The JS
constants live in [`src/lib/useMediaQuery.ts`](../src/lib/useMediaQuery.ts) and are
kept in lock-step with the `@media` queries in `src/index.css`.

| Query                          | Constant        | Meaning                                                  |
| ------------------------------ | --------------- | ------------------------------------------------------- |
| `(pointer: coarse)`            | `COARSE_POINTER`| Touch-first device — enlarge hit areas, tune hints.     |
| `(max-width: 768px)`           | `MOBILE_WIDTH`  | Mobile width — the sidebar becomes a drawer.            |

`src/index.css` refines the layout further at narrower widths (≈656px, ≈430px,
≈400px) for the docked control bars and dense panels. Reuse an existing breakpoint
before introducing a new one — a proliferation of one-off widths is how a layout
starts to drift.

Two axes, kept separate on purpose:

- **`pointer: coarse`** is about _input_ (finger vs. cursor), not size. It drives
  hit-area and hint decisions. A large tablet is still coarse; a small desktop
  window is still fine.
- **`max-width`** is about _space_. It drives layout reflow (drawer, column
  collapse).

Decide with the axis that matches the reason: if it's "this is hard to tap", use
`coarse`; if it's "this doesn't fit", use a width query.

## How components adapt

### Layout — the side panel is a mobile sheet first, a sidebar on wide screens

The `.side-panel` is mobile-first: the base rule renders it as a near-edge-to-edge
floating **sheet**, and the `@media (min-width: 769px)` enhancement drops the left
anchor and caps it to a fixed **400px right-hand sidebar**. Same panel, same contents —
only its presentation changes, entirely in CSS; it is simply shown or hidden, with no
separate drawer widget.

### Input — touch targets grow to ≥44px

Under `@media (pointer: coarse)`, interactive primitives (`.btn`, `.btn-icon`,
`.sel-action`, `select`, `.palette-btn`, `.section summary`, …) grow to a **≥44px**
hit area. This is a hard rule from DESIGN.md's behaviour conventions — every new
interactive control must satisfy it on coarse pointers.

### Behaviour — hints and hit areas via `useMediaQuery`

Where touch changes _behaviour_, components read the pointer type through the hook
rather than duplicating themselves. Existing examples to follow:

- `PlanEditor` / `PlanCorners` — a coarse pointer gets a **larger grab radius** on
  plan corners, and the plan toolbar swaps in touch-oriented hints
  (`PlanToolbar`).
- `PropertiesPanel` — hides a mouse-only affordance when the pointer is coarse.
- `SelectionBar` — reveals the in-dock material `select` only when there's width
  for it (`min-width: 620px`), so the pill bar never overflows a phone.

These are the model: **one component, environment-aware**, not two components.

### Motion — respect the user's setting

`@media (prefers-reduced-motion: reduce)` is honoured globally. Animations and
transitions are enhancements; nothing should depend on them to be usable or
understood.

## Checklist for new UI

Before you consider a surface done:

- [ ] It was styled **mobile-first** — the base layout is the phone layout, and it
      reads well on a narrow screen without horizontal scrolling.
- [ ] It is **one component** for all sizes — no `Mobile*`/`Desktop*` split, no
      `window.innerWidth` branching.
- [ ] Adaptation is **CSS-first**; `useMediaQuery` is used only where markup or
      behaviour genuinely differs.
- [ ] Every interactive control has a **≥44px** hit area on coarse pointers.
- [ ] Every hover-only affordance has a **tap-reachable** equivalent.
- [ ] Edge-docked chrome respects **`env(safe-area-inset-*)`**.
- [ ] Any new breakpoint is justified — an existing one wasn't enough.
- [ ] It behaves correctly with **reduced motion**.

## In short

> One mobile-first component set that adapts with CSS and, only where it must, with
> `useMediaQuery` — never a separate mobile build.
