# RoomCraft design reference

The single source of truth for how RoomCraft's UI looks and behaves. It exists so
every screen — existing or new — reads as one coherent product.

Two halves, kept in sync:

1. **The living gallery** — `src/components/styleguide/StyleGuide.tsx`, viewable at
   **`#styleguide`** (run `npm run dev`, then open
   `http://localhost:5173/#styleguide`). It renders every shared primitive from the
   _real_ `src/index.css` classes and the shared `Icon` component, so it can never
   drift from the app. Design tokens on the page are read live from `:root`.
2. **This document** — the tokens and the rules for using the primitives.

## How to use this (for humans and for Claude)

**Before building or changing any UI surface:**

1. Open `#styleguide` and skim the relevant section — reuse an existing primitive
   rather than inventing one.
2. Style with the CSS classes and tokens below. **Never hard-code a colour, font,
   radius or shadow** — reference a `var(--token)`.
3. Use the shared `Icon` component for icons (`src/components/ui/Icon.tsx`), not
   raw Unicode glyphs.
4. If you add a genuinely new primitive, **add it to the gallery too** and note its
   rule here — the reference must stay complete.

For how these primitives behave across screen sizes — the mobile-first approach and
the one-component-set rule — see [`MOBILE-FIRST.md`](MOBILE-FIRST.md).

## Design tokens

All defined in `:root` at the top of `src/index.css`. These are the values; the
gallery shows them live.

### Colour

| Token             | Role                                             |
| ----------------- | ------------------------------------------------ |
| `--paper`         | Primary surface (sidebar, modals)                |
| `--paper-2`       | App background, slightly deeper                  |
| `--card`          | Raised cards, chips, floating controls           |
| `--ink`           | Primary text; borders on strong controls         |
| `--muted`         | Secondary text, labels, hints                    |
| `--line`          | Hairline borders and dividers                    |
| `--accent`        | Primary action, focus, active accents (terracotta) |
| `--accent-dark`   | Accent hover/pressed                             |
| `--select`        | Selection blue (3D/plan selection only)          |
| `--danger`        | Destructive actions and errors                   |
| `--danger-dark`   | Danger hover/pressed                             |

Keep the palette **clean and neutral** — white surfaces (`--paper`/`--card`),
a light grey app background (`--paper-2`), neutral grey text (`--muted`) and
hairlines (`--line`). The single accent is a warm terracotta — the one spot of
colour against the neutral chrome. The only blue is `--select`, reserved for
canvas selection — never introduce a stray blue into chrome. Score/severity
bands use their own fixed greens/ambers/reds (see `.score-*`, `.severity-*`).

Accent tints (hover washes, active rows, error backgrounds) are derived with
`color-mix(in srgb, var(--accent|--danger|--select) …%, transparent)` so they
always track their token — never hard-code a tint.

### Typography

- `--display` — Fraunces (serif). Headings, brand, and numerals (scores, counts).
- `--body` — Karla (sans). Everything else. Base is 15px / 1.45.

### Floating-surface chrome

`--popup-radius`, `--popup-border`, `--popup-shadow` — shared by every floating
surface (modal, side panel, dropdown menu) so they read as one family. Reuse them
for any new floating surface.

### Icons

`--icon` (20px) / `--icon-sm` (16px). Icons render at `1em`, so set the container's
`font-size` once and the glyph follows.

## Component vocabulary

Reach for these classes (all in `src/index.css`); see them live in the gallery.

- **Buttons** — `.btn` (neutral outline), `.btn-accent` (primary), `.btn-danger`
  (destructive confirm), `.btn-done` (leave / ink-filled primary), `.btn-lg`
  (large), `.btn-icon` (bare icon button), `.btn-zoom`. Group with `.button-row`.
- **Fields** — wrap inputs in `.field-input` (consistent focus ring + `.field-suffix`).
  Label with `.field` + `.field-label`; two-up with `.field-grid`; stack with
  `.stack`. Also `.check-field`, `.count-field` (stepper), `.color-field`,
  `.source-toggle` (segmented), and bare `select`.
- **Surfaces** — `.card` + `.card-head` for repeated records; `.chip` (`.door` /
  `.window`) to tag kind; `.section` (`<details>`) for collapsible groups; `.modal`
  (+ `.modal-sm`, `.modal-head`, `.modal-body`, `.modal-foot`, `.modal-message`)
  for dialogs; `.side-panel` for the right-hand panel.
- **Docked controls** — the floating rounded pill bar is `.selection-bar` filled
  with `.sel-action` pills (each an optional `.sel-icon` + `.sel-label`); variants
  `.sel-active` (ink-filled current mode), `.sel-danger`, `.sel-history` (icon-only
  undo/redo), `.sel-color` (a round `.sel-color-input` swatch), and `.sel-select`
  (a compact dropdown, `.sel-select-input`, for an in-dock choice such as the
  floor/wall material), split by `.sel-divider`. Three bars sit in a
  `.selection-bar-wrap` three-slot grid — add left · contextual centre · undo/redo
  right — and the plan editor reuses the same family inside its `.plan-dock`.
- **Floating plan chrome** — the floor-plan editor floats these over the canvas:
  `.plan-hint-pill` (guidance) and `.plan-error-pill` (failure) top-centre,
  `.plan-length-input` for typing an exact edge length, the `.plan-room-panel`
  ceiling-height chip, and the `.plan-wall-panel` card for the selected wall (built
  from `.hint` + `.field-grid`).
- **Feedback** — one `.hint` for guidance, one `.error` for failures (reuse them —
  don't roll new ones). `.score-badge` with `.score-good/-mid/-bad`; `.severity`
  with `.severity-1`…`-5` (5 = worst).
- **Palette** — `.palette` grid of `.palette-btn`, each with a colour `.swatch`.

## Behaviour conventions

- **Esc** closes the topmost overlay (dialog › panel › selection). One thing reacts
  at a time — see the handlers in `App.tsx` and `SidePanel.tsx`.
- **Undo/redo** — `Ctrl/Cmd+Z`, `Shift` to redo (or `Ctrl/Cmd+Y`). Always available
  inside a room.
- **Selection shortcuts** (furniture): `R` / `Shift+R` rotate in 90° steps,
  `Ctrl/Cmd+D` duplicate, `Delete`/`Backspace` remove. Suppressed while a text
  input is focused. A selected piece also shows a **rotation handle** in the 3D
  view (a floor ring + front knob) for free-angle rotation; hold `Shift` while
  dragging it to snap to 15°.
- **Touch** — interactive controls keep a ≥44px hit area on coarse pointers.
- **Disabled actions** — wrap in `.btn-tooltip-wrap` with a `title` so the reason
  shows on hover.

## Keeping the reference honest

The gallery importing the real classes is what stops it drifting — but that only
covers _appearance_. When you add or rename a primitive, update the gallery and
this doc in the same change, so both stay a true reflection of the app.
