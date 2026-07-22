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

## First principle: minimal and self-evident

Above every rule below sits one goal: **the UI is as minimal and as clear as it
can possibly be, and it explains itself without words.** A user should always
understand what a surface is and what to do next just by looking at it — never by
reading a paragraph that teaches them how to use it.

Hold every screen, panel, dialog, and control to this bar:

- **Show, don't tell.** The layout, the icons, and the shapes carry the meaning.
  If a control needs a sentence of prose to be understood, redesign the control —
  don't add the sentence. Copy earns its place only when it _is_ the content
  (a name, a value, a result), never as a manual for the interface.
- **Less on the screen.** Prefer the fewest elements that do the job. Cut anything
  that isn't essential to the current task; hide advanced or rare options until
  they're needed rather than crowding the default view. Every element on screen
  should be pulling its weight.
- **Make the next step obvious.** The primary action should read as primary at a
  glance (see `.btn-accent`), and the path through a flow should be clear without
  instructions. Affordances look interactive; static things don't.
- **Rely on the shared vocabulary.** Familiar primitives, consistent icons, and
  predictable placement mean a user recognises a control instead of re-learning
  it. Consistency _is_ clarity — reuse before you invent.
- **Text is the last resort, not the first.** A `.hint` or a tooltip is a fallback
  for a genuine edge case, not the way a surface communicates its purpose. If you
  reach for explanatory copy, first ask whether the design itself could make the
  copy unnecessary.

When a choice is between adding an explanation and making the interface
self-evident, always choose the second.

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
  `.stack`. For a continuous, bounded value where trying different amounts
  matters more than typing an exact one, use `.field.range` — a themed
  `input[type="range"]` with the label and a live `.range-value` sitting in a
  `.range-head` row (the accent fills the thumb; e.g. the patio planner's deck
  size). Also `.check-field`, `.count-field` (stepper), `.color-field`,
  `.source-toggle` (segmented), and bare `select`. A `.field-suffix` (e.g. "cm")
  is visual only — mark it `aria-hidden="true"` and give the `<input>` an
  explicit `aria-label` matching the visible label, so the accessible name
  stays just the label instead of mashing the label and suffix together (see
  `NumberField` in `src/components/panel/fields.tsx`). For a computed value that
  can't be edited, keep `.field` + `.field-label` but swap `.field-input` for
  `.field-static` — same box, plain text instead of a control (e.g. the plan
  room panel's floor area next to its editable ceiling height). A `.color-field`
  for a secondary part that cascades from a primary colour (furniture parts —
  see `FurnitureFields.tsx`) takes an optional `onReset` — a `.btn-icon` with
  the `undo-2` glyph, pushed to the row's end via `.color-field-reset` — shown
  only once that part has its own override, so the override can be cleared back
  to following the primary colour instead of staying detached permanently.
- **Surfaces** — `.card` + `.card-head` for repeated records; `.chip` (`.door` /
  `.window`) to tag kind (a static tag, not a button); `.section` (`<details>`)
  for collapsible groups; `.modal`
  (+ `.modal-sm`, `.modal-head`, `.modal-body`, `.modal-foot`, `.modal-message`)
  for dialogs; `.side-panel` for the right-hand panel. `.modal-just-placed` is a
  scoped modifier for the furniture create→edit hand-off only: on mobile
  (`max-width: 768px`) it shortens the modal and anchors it to the bottom as a
  sheet so the just-placed piece stays visible above it; desktop and every other
  modal are unaffected (see `FurnitureDialog.tsx`). `.shortcut-list` (a
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
  the top-left bar (`.plan-topbar`) holding the circular `.room-back` button, the
  editable room name `.plan-name` (a card-filled pill with a muted `.plan-name-icon`
  pencil over a borderless `.plan-name-input` — the value reads as a plain title
  until focused, when the pill lifts to an accent focus ring; it flexes and
  truncates so it never crowds the bar, and `.plan-furnish-btn` drops to icon-only
  below 560px) and the `.plan-furnish-btn` forward action; `.plan-hint-pill`
  (guidance) and `.plan-error-pill` (failure) top-centre; `.plan-length-input` for
  typing an exact edge length; the `.plan-room-panel` ceiling-height chip; and the
  `.plan-wall-panel` — the selected wall's editing sheet, a `.plan-wall-title`
  header over a `.plan-wall-scroll` body of `.field-grid` + the doors/windows
  editor. The sheet is height-capped and its body scrolls, and the editor lifts the
  drawing clear of it (an auto-fit bottom inset in `useViewport`) so a floating
  panel never hides the wall being edited. An undrawn room's empty state is the
  `.plan-chooser` shape sheet (reusing the `.template-*` cards) floated over the
  canvas until the room has walls.
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
  is the dashed "draw it yourself" variant. Used by the plan editor's shape chooser
  (`.plan-chooser`), the empty state of an undrawn room.
- **Room creation** — there is no separate wizard: both creating a new room and
  editing an existing one happen on the single `PlanEditor` surface (reached from the
  lobby's "New room" and "Edit plan"). A new room opens straight in that editor with
  the shape chooser as its empty state; the room's name is editable inline in the top
  bar (`.plan-name`), and "Furnish this room" (`.plan-furnish-btn`) carries it into
  the 3D view. The provisional room is discarded if left before an outline is drawn.
- **Shared room viewer** — the first collaboration step (#353): "Share" in the
  proposal switcher's menu posts a point-in-time snapshot and opens a dialog
  (reusing `.modal`/`.field-input`) with the resulting `#share/:id` link to copy.
  That link opens `ShareView.tsx`, a read-only 3D view with no dock, no side panel,
  and no selection — just the room plus `.share-badge` (a plain `.card`, only its
  row layout and top-left position over the canvas are new), which always names it
  as a shared snapshot so a visitor never lands on an unexplained bare view.
- **Home switcher** — the lobby's "My homes" section (`Lobby.tsx`), a compact
  sibling of the `.room-grid`/`.room-card` below it: a `.home-list` row of
  `.home-card` tiles (icon + name + room count, `.home-card-active` marking the
  current one) with rename/delete `.btn-icon`s, plus a dashed `.home-card-new`
  "New home" tile. Each home keeps its own independent rooms, furniture and
  proposals — switching never merges or leaks state between them (#382).
- **Room summary (print/export)** — a printable, static snapshot of the active
  room (`RoomSummary.tsx`), opened from the printer icon in the room top bar
  (next to the keyboard-shortcuts icon). Built on the shared `.modal` chrome,
  widened via `.room-summary-modal`: a `.room-summary-sheet` holding a
  `.room-summary-plan-svg` (the exterior outline plus every piece's real
  footprint, reusing `lib/polygon.ts`'s `floorPolygon`/`rectCorners` — not the
  live `PlanEditor`), the validation score (reusing `ValidationPanel`'s own
  `.validation-summary` markup), and a `.room-summary-list` of
  `.room-summary-row` furniture entries (a `.swatch` + kind/size). "Print /
  save PDF" calls `window.print()`; a scoped `@media print` block hides the
  rest of the app (via `.app-printing`, set on the app root only while the
  summary is open) and drops the modal chrome so only the sheet prints.

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
- **Multi-selecting furniture** — shift/ctrl/cmd-click a piece to add it to (or
  remove it from) the current selection; on a coarse pointer, tap the selection
  bar's **"Select multiple"** toggle (`.sel-action`, `layers` icon) first, then
  tap pieces to add/remove them without needing a modifier key. Once 2+ pieces
  are selected, `SelectionBar`'s Duplicate and Delete act on the whole group, drag
  moves every selected piece together, and `Ctrl/Cmd+D` / `Delete`/`Backspace`
  extend the same way. Rotation, colour and "More" stay single-piece-only and are
  hidden for a multi-selection — deliberately out of scope for the group actions.
  A plain (non-additive) click or `Esc` always replaces the selection and drops
  out of multi-select mode.
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
