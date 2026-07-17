# RoomCraft — guidance for Claude

RoomCraft is a React 19 + TypeScript + Vite app for planning and furnishing rooms
in 3D (react-three-fiber), with a 2D floor-plan editor and a warm, print-inspired
visual style. State is Zustand; the whole UI is styled from a single stylesheet,
`src/index.css`, using CSS custom-property design tokens.

For a map of the project docs — purpose, vision, strategy, principles, design system,
rule catalog and the agent pipeline — see [`docs/README.md`](docs/README.md).

## What the app is for

RoomCraft's purpose is to make it **stupidly simple to get help finding the best
interior design for your rooms** — see [`docs/PURPOSE.md`](docs/PURPOSE.md). Read
it when you need the *why* behind a feature: any work should make it easier for
someone to go from an empty room to one they love.

## Development strategy: build toward the vision

Before proposing or building new work, read [`docs/STRATEGY.md`](docs/STRATEGY.md).
It's the north star for **what we build now**: build toward the vision in
[`docs/VISION.md`](docs/VISION.md) — deepen the core *and* expand the surface toward
the destination (more rooms, whole homes, collaboration, real/buyable furniture, and
the revenue models that make it a business). New features, new surface area, and
monetization are all in scope. Craft, consistency, reliability, and a phone-friendly
feel remain values we build with — but as guidance, not gates that block ambitious
work.

## Principles & direction

Two docs sit beside the strategy and are worth reading before you shape work:

- [`docs/PRINCIPLES.md`](docs/PRINCIPLES.md) — the operating values every change is
  weighed against (ambition toward the vision, simplicity worth protecting,
  phone-friendly by default, reliability, craft). Guidance for good, ambitious work —
  not a rejection checklist.
- [`docs/VISION.md`](docs/VISION.md) — where RoomCraft is heading and what we're building
  toward now, so work points in one direction instead of optimising locally.

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
- `npm run test:e2e` — Playwright end-to-end validation in desktop **and** mobile.

Run the build/lint/test before committing UI changes.

## Validate every UI/feature change with Playwright (desktop + mobile)

Any change to a user-facing surface must be **validated by driving the real app**
in both a desktop and a mobile viewport — not just unit-tested. This is a hard
rule, enforced by a `Stop` hook: while there are unvalidated changes under `src/`,
the session cannot finish.

The workflow for any feature you build or change:

1. Make the change.
2. **Add or extend an e2e spec** in `e2e/` that clicks through the new/changed
   flow. One spec runs in both viewports automatically — see
   [`playwright.config.ts`](playwright.config.ts) (the `desktop` and `mobile`
   projects) and the baseline [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts).
3. Run `npm run test:e2e`. It exercises the app in desktop and mobile; a passing
   run stamps the current source state as validated. Fix any failures and re-run
   until green.

Prefer role/label/text selectors (`getByRole`, `getByLabel`, `getByText`) over
brittle CSS so specs stay readable and resilient. The pre-installed Chromium is
used automatically — never run `playwright install`.

## Monetization

Monetization is **in play now** — building the business is part of building the
product (see [`docs/STRATEGY.md`](docs/STRATEGY.md#monetization-is-in-play)). The
candidate models (freemium/subscription, furniture-catalogue affiliate links, a
"Buy this room" flow, credits, B2B licensing, etc.) are in the
*How it makes money* section of [`docs/VISION.md`](docs/VISION.md#how-it-makes-money) —
now directions to design and build toward, not a parked idea bank.
