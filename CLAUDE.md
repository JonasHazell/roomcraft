# RoomCraft — guidance for Claude

RoomCraft is a React 19 + TypeScript + Vite app for planning and furnishing rooms
in 3D (react-three-fiber), with a 2D floor-plan editor and a warm, print-inspired
visual style. State is Zustand; the whole UI is styled from a single stylesheet,
`src/index.css`, using CSS custom-property design tokens.

## What the app is for

RoomCraft's purpose is to make it **stupidly simple to get help finding the best
interior design for your rooms** — see [`docs/PURPOSE.md`](docs/PURPOSE.md). Read
it when you need the *why* behind a feature: any work should make it easier for
someone to go from an empty room to one they love.

## Development strategy: build the core experience first

Before proposing or building new work, read [`docs/STRATEGY.md`](docs/STRATEGY.md).
It's the north star for **what we build right now**: the best possible
room-planning experience with a **small number of well-built features**, not a
long list of shallow ones. Prefer deepening and polishing existing core flows
over adding new surface area, and hold everything to the quality bar (design
consistency, reliability, no rough edges). Monetization is intentionally parked
during this phase — see below.

## UI work: always consult the design reference first

Before creating or updating **any** user-facing surface (a screen, panel, dialog,
control, field, or a visual tweak), consult the design reference so the whole app
stays visually and behaviourally consistent:

1. **Read `docs/DESIGN.md`** — the tokens, the component vocabulary, and the
   behaviour conventions.
2. **Look at the living gallery** — `src/components/styleguide/StyleGuide.tsx`,
   viewable at `#styleguide` (`npm run dev` → `http://localhost:5173/#styleguide`).
   It renders every shared primitive from the real `src/index.css` classes, so it
   shows exactly what the app looks like.

Then, when you build:

- **Reuse an existing primitive** (`.btn`, `.field-input`, `.card`, `.modal`,
  `.chip`, `.hint`, `.error`, …) instead of inventing a new one.
- **Never hard-code** a colour, font, radius, or shadow — reference a
  `var(--token)` from `:root`. Keep the palette warm; the only blue is `--select`
  for canvas selection.
- Use the shared **`Icon`** component (`src/components/ui/Icon.tsx`) for icons.
- Follow the behaviour conventions in `docs/DESIGN.md` (Esc handling, undo/redo,
  selection shortcuts, ≥44px touch targets).

**If you introduce a genuinely new primitive**, add it to the gallery
(`StyleGuide.tsx`) and note its rule in `docs/DESIGN.md` in the same change, so the
reference stays complete and never drifts from the app.

## Everyday commands

- `npm run dev` — Vite dev server (open `#styleguide` for the component gallery).
- `npm run build` — type-check (`tsc -b`) and production build.
- `npm run lint` — oxlint.
- `npm test` — Vitest.

Run the build/lint/test before committing UI changes.

## Monetization

Monetization is **parked for now** — we focus on the core experience first (see
[`docs/STRATEGY.md`](docs/STRATEGY.md)) and choose a model later. For the future
idea bank (freemium/subscription, furniture catalog affiliate links, credits,
B2B licensing, etc.), see [`docs/MONETIZATION.md`](docs/MONETIZATION.md) — treat
it as a reference, not a current mandate for what to build.
