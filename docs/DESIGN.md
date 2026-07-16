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
| `--ink-2`         | Secondary ink — `.btn-done` hover, exterior wall stroke |
| `--wall-line`     | Interior wall stroke (plan editor)               |
| `--window-line`   | Window opening stroke (plan editor; doors reuse `--accent`) |
| `--step-bg`       | `.count-step` resting background                 |
| `--step-bg-hover` | `.count-step` hover background                   |

Keep the palette **clean and neutral** — white surfaces (`--paper`/`--card`),
a light grey app background (`--paper-2`), neutral grey text (`--muted`) and
hairlines (`--line`). The single accent is a warm terracotta — the one spot of
colour against the neutral chrome. The only blue is `--select`, reserved for
canvas selection — never introduce a stray blue into chrome. Score/severity
bands use their own fixed greens/ambers/reds, held in the `--score-good`/
`--score-mid` tokens (bad reuses `--danger`) and referenced by `.score-*`,
`.severity-*` and the `.validation-categories` row cues below. The 1-5
`.severity-*` scale has its own five-step ramp, `--severity-1`…`--severity-5`
(worst → mildest is `5`→`1`); `--severity-5` reuses `--danger` since the hex
already matches exactly, and `--severity-1`…`--severity-4` are their own fixed
tokens since none of those steps line up with an existing colour.

Accent tints (hover washes, active rows, error backgrounds) are derived with
`color-mix(in srgb, var(--accent|--danger|--select) …%, transparent)` so they
always track their token — never hard-code a tint. The same convention applies
to fixed score-band tints, e.g. `color-mix(in srgb, var(--score-good) 10%, transparent)`.

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
  `.source-toggle` (segmented), and bare `select`. For a computed value that
  can't be edited, keep `.field` + `.field-label` but swap `.field-input` for
  `.field-static` — same box, plain text instead of a control (e.g. the plan
  room panel's floor area next to its editable ceiling height).
- **Surfaces** — `.card` + `.card-head` for repeated records; `.chip` (`.door` /
  `.window`) to tag kind (a static tag, not a button); `.section` (`<details>`)
  for collapsible groups; `.modal`
  (+ `.modal-sm`, `.modal-head`, `.modal-body`, `.modal-foot`, `.modal-message`)
  for dialogs; `.side-panel` for the right-hand panel. `.shortcut-list` (a
  `.shortcut-row` per binding, action left / `.key` keycap chips right, `+`/`or`
  joiners) lists a static reference inside a `.modal-sm` — currently the keyboard-
  shortcuts reference (`ShortcutsReference.tsx`, opened from the room top bar).
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
  ceiling-height chip, and the `.plan-wall-panel` — the selected wall's editing
  sheet, a `.plan-wall-title` header over a `.plan-wall-scroll` body of
  `.field-grid` + the doors/windows editor. The sheet is height-capped and its
  body scrolls, and the editor lifts the drawing clear of it (an auto-fit bottom
  inset in `useViewport`) so a floating panel never hides the wall being edited.
- **Prompt & AI** — `.prompt-chips` is a wrap row of `.prompt-chip` buttons:
  tap-to-fill pills that seed a text field (interactive, unlike the tag-only
  `.chip`). `.ai-progress` is the in-flight readout for a long AI run — a rotating
  `.ai-progress-step` label and a live `.ai-elapsed` clock over an indeterminate
  `.ai-progress-track` bar (the server streams no percentage, so the bar is
  deliberately indeterminate and the elapsed time is the honest signal).
- **Feedback** — one `.hint` for guidance, one `.error` for failures (reuse them —
  don't roll new ones). `.score-badge` with `.score-good/-mid/-bad`; `.severity`
  with `.severity-1`…`-5` (5 = worst). Each `.validation-categories li` also
  takes a `.score-good/-mid/-bad` class, giving the row a left border + a
  `color-mix` background tint in the same band as its score number — so a
  category's severity reads at a glance, not only from the small coloured
  digit (see the "Validation: category row cues" gallery entry).
- **Palette** — `.palette` grid of `.palette-btn`, each with a colour `.swatch`.
  In the "Add furniture" picker the catalog and library are grouped by room type:
  a `.palette-groups` column of `.palette-group` blocks, each a `.palette-heading`
  (uppercase muted label) over its `.palette` grid or `.save-list`.
- **Room templates** — the `.template-grid` of `.template-card` buttons (each an SVG
  `.template-preview` + `.template-name` + `.template-meta`); `.template-card-blank`
  is the dashed "draw it yourself" variant. Used by the wizard's shape chooser.
- **New-room wizard** — the guided create-a-room flow (`.wizard`): a `.wizard-head`
  holding the `.wizard-steps` stepper (`.wizard-step` items flip `is-active` /
  `is-done` / `is-upcoming`, an earlier step is tap-to-revisit) plus a `.wizard-close`;
  a `.wizard-body` that swaps per step — the `.wizard-name` naming card, or the real
  plan editor for the walls/openings steps; and a `.wizard-foot` that owns Back/Next
  (the step's task shows in `.wizard-foot-title`). Its walls step floats the
  `.plan-chooser` sheet (reusing the `.template-*` cards) over the canvas until the
  room has walls. Navigation lives only in the frame, so the embedded plan editor
  drops its own back button and centre mode-switcher (`PlanEditor`'s `wizardStep`
  prop). Prefer this flow for room creation; the standalone plan editor is for
  editing an existing plan.

## Behaviour conventions

- **Esc** closes the topmost overlay (dialog › panel › selection). One thing reacts
  at a time — see `lib/globalKeydown.ts` (wired up in `App.tsx`) and
  `SidePanel.tsx`. Unlike the other selection shortcuts below, Esc still fires
  even while a field inside the closing overlay has focus (e.g. the plan
  editor's wall panel Length field) — it blurs the field first.
- **Undo/redo** — `Ctrl/Cmd+Z`, `Shift` to redo (or `Ctrl/Cmd+Y`). Always available
  inside a room.
- **Selection shortcuts** (furniture): `R` / `Shift+R` rotate in 90° steps,
  `Ctrl/Cmd+D` duplicate, `Delete`/`Backspace` remove. Suppressed while a text
  input is focused. A selected piece also shows a **rotation handle** in the 3D
  view (a floor ring + front knob) for free-angle rotation. It magnetises to the
  nearest right angle (0/90/180/270°) as you pass it, so pieces square up to the
  walls with no key; hold `Shift` while dragging for a finer 15° snap.
- **Touch** — interactive controls keep a ≥44px hit area on coarse pointers.
- **Disabled actions** — wrap in `.btn-tooltip-wrap` with a `title` so the reason
  shows on hover.
- **Keyboard-shortcuts reference** — the keyboard icon in the furnish view's
  room top bar (`App.tsx`, next to the back button) opens
  `ShortcutsReference.tsx`, a `.modal-sm` listing every binding above (including
  undo/redo). It's reachable regardless of pointer type or selection state,
  unlike the old single hint line that only showed once a piece was selected and
  was hidden on touch (#227). It lives in the top bar rather than the bottom
  dock's `ActionBar` because that dock has no spare width at narrow viewports
  (see `ActionBar.tsx`).

## Keeping the reference honest

The gallery importing the real classes is what stops it drifting — but that only
covers _appearance_. When you add or rename a primitive, update the gallery and
this doc in the same change, so both stay a true reflection of the app.
