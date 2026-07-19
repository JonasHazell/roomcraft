# Architecture — the feature→code map

This is an **orientation map**, not a spec. It answers one question fast: *for a
given feature, where does it live in the code?* It exists so an agent (or human)
starting from a cold context can jump to the right files without re-reading all
~18k lines of `src/` first.

It deliberately says **where**, not **how** — file paths drift slowly, described
behaviour drifts fast. For *what* each feature does for the user, see the
top-level [`../README.md`](../README.md); for *why*, [`PURPOSE.md`](PURPOSE.md);
for the *look and feel*, [`DESIGN.md`](DESIGN.md). This map is the glue between
those and the code.

> Keep it drift-resistant: when you add or move a feature, update the row's file
> paths — but resist writing prose that duplicates behaviour already visible in
> the code or the README. A stale "where" is cheap to spot; a stale "how" misleads.

## The shape of the app

RoomCraft is a single-page React app with **three top-level surfaces**, chosen by
`useUiStore.surface`:

- **`lobby`** — pick, create, rename or delete rooms. Entry: `src/components/lobby/Lobby.tsx`.
- **`plan`** — the 2D floor-plan editor for one room. Entry: `src/components/plan/PlanEditor.tsx`.
- **`furnish`** — the 3D furnishing view for one room. Entry: `src/App.tsx` (`FurnishView`) → `src/components/scene/Scene.tsx` (lazy-loaded; three.js is the bulk of the bundle).

`src/App.tsx` is the root switchboard: it reads the surface + dialog state and
mounts the right surface plus the always-present bars and dialog hosts. There is
also a `#styleguide` route (`src/components/styleguide/StyleGuide.tsx`) — the
living design gallery.

## State (Zustand)

All persistent document state lives in one composed store; UI/session concerns
are separate stores so they don't get saved.

| Store | File | Owns |
| --- | --- | --- |
| Design (composed) | `src/store/useDesignStore.ts` | The whole document: project + live room. Persisted to `localStorage`. Built from the slices below. |
| — room slice | `src/store/slices/roomSlice.ts` | Multiple rooms per project: create / switch / rename / delete. |
| — plan slice | `src/store/slices/planSlice.ts` | Walls, doors, windows — the room shape. |
| — furniture slice | `src/store/slices/furnitureSlice.ts` | Adding / moving / rotating / editing furniture pieces. |
| — proposal slice | `src/store/slices/proposalSlice.ts` | Furnishing proposals per room (each with its own palette). |
| — document slice | `src/store/slices/documentSlice.ts` | New / reset project, save-slot plumbing. |
| UI / surface | `src/store/useUiStore.ts` | `surface` (lobby/plan/furnish), which panel/dialog is open, selection. |
| History | `src/store/useHistoryStore.ts` | Undo/redo snapshots of project+design. |
| Dialogs | `src/store/useDialogStore.ts` | The generic confirm/prompt dialog queue. |
| Validation | `src/store/useValidationStore.ts` | The current validation report + the highlighted finding (a row's furniture/zone highlight). |
| Library | `src/store/useLibraryStore.ts` | The saved-furniture library. |
| Auth | `src/store/useAuthStore.ts` | Whether sign-in is enabled + the current session. |
| AI | `src/store/useAiStore.ts` | An in-flight AI generation (status, timeout). |

Shared types for all of the above: `src/types.ts` (`Project`, `Design`, `Room`,
`Wall`, `WallOpening`, `FurnitureItem`, `Proposal`, …).

The composed store's **state shape, action interfaces, and room/project factory
helpers** (`DesignData`, `RoomActions`, `FurnitureSpec`, `createDefaultRoom`,
`cloneRoom`, …) live in `src/store/designModel.ts`; cross-store selectors such as
`useSelectedFurniture` live in `src/store/selectors.ts`.

## Feature → code map

| Feature (see README for behaviour) | UI | State | Logic / lib |
| --- | --- | --- | --- |
| **Rooms** — multiple per project, switch/create/rename/delete | `lobby/Lobby.tsx`, `plan/PlanEditor.tsx` (new rooms open straight here), `panel/SwitcherList.tsx` | `slices/roomSlice.ts` | `lib/roomTemplates.ts`, `lib/nav.ts` |
| **2D floor plan** — free room outline + interior walls, snapping | `plan/PlanEditor.tsx` and siblings (`PlanWalls`, `PlanCorners`, `PlanDraft`, `PlanGrid`, `PlanToolbar`, `PlanRoomPanel`, `PlanStartChooser`, `usePlanDraft.ts`, `useViewport.ts`) | `slices/planSlice.ts` | `lib/polygon.ts`, `lib/geometry.ts` |
| **Doors & windows** — per wall, position/size/height | `plan/PlanWallPanel.tsx`, `plan/PlanLengthInput.tsx`, `panel/WallBar.tsx` | `slices/planSlice.ts` (openings on `Wall`) | `lib/geometry.ts` |
| **3D view** — orbit camera, near walls auto-hidden | `scene/Scene.tsx`, `scene/Walls.tsx`, `scene/Floor.tsx` | `useUiStore` (`furnish` surface) | `lib/materials.ts`, `scene/materialTextures.ts` |
| **Furniture** — place, drag, rotate, keep inside walls | `scene/FurnitureLayer.tsx`, `scene/FurnitureMesh.tsx`, `panel/FurniturePicker.tsx`, `panel/FurnitureDialog.tsx` | `slices/furnitureSlice.ts` | `lib/collision.ts`, `lib/furnitureCatalog.ts` |
| **Per-type customization** — mattresses, shelves, doors, etc. | `panel/FurnitureFields.tsx`, `panel/fields.tsx`, `panel/furnitureDraft.ts` | `slices/furnitureSlice.ts` (`FurnitureOptions`) | `lib/furnitureOptions.ts`, `lib/furnitureParts.ts` |
| **3D furniture models** — one component per kind | `scene/furniture/*.tsx` (Bed, Sofa, Desk, Bookshelf, …) | — | `lib/furnitureParts.ts`, `lib/materials.ts` |
| **Colors** — floor, walls, per-piece; palette per proposal | `panel/PropertiesPanel.tsx`, `panel/FloorBar.tsx` | `slices/furnitureSlice.ts` / `proposalSlice.ts` | `lib/materials.ts` |
| **AI furnishing suggestions** — Claude proposes layouts | `panel/AiProposalsPanel.tsx`, `panel/ProposalSwitcher.tsx` | `useAiStore`, `slices/proposalSlice.ts` | `lib/aiProposals.ts` (client) → `server/` (see below) |
| **Auto-arrange** — local, no-AI reshuffle to raise score | `panel/ProposalSwitcher.tsx` (the "Auto-arrange" menu action) | `slices/furnitureSlice.ts` | `lib/autoArrange.ts` |
| **Proposals** — switch between furnishing options per room | `panel/ProposalSwitcher.tsx`, `panel/SwitcherList.tsx` | `slices/proposalSlice.ts` | — |
| **Design validation / score** — rule findings + score | `panel/ValidationPanel.tsx`, `panel/ValidationScore.tsx`, `scene/ValidationOverlay.tsx` | `useValidationStore` | `lib/validation/*` (see below) |
| **Undo / redo** — every editing step, one drag = one step | `panel/HistoryBar.tsx` | `useHistoryStore` | `lib/globalKeydown.ts` (shortcuts) |
| **Autosave & named saves** — localStorage, schema migration | `panel/DialogHost.tsx` (save/load prompts) | `useDesignStore` persist middleware | `lib/persistence.ts` (v1→current migrations) |
| **Accounts / sign-in** — gates server AI when DB configured; syncs a signed-in user's whole project to their account (free-tier room cap, `RoomCapDialog` upgrade prompt) | `auth/AuthDialog.tsx`, `auth/AccountControl.tsx`, `auth/RoomCapDialog.tsx` | `useAuthStore` | `lib/authApi.ts`, `lib/projectSync.ts` → `server/auth.ts`, `server/projects.ts`, `server/db.ts` |
| **Keyboard shortcuts** — R, Delete, Esc, Enter, undo/redo | (global) | various | `lib/globalKeydown.ts`, `lib/useEscape.ts` |

## Shared building blocks

- **Design primitives & tokens** — every user-facing surface is styled from
  `src/index.css` (CSS custom-property tokens) using shared classes (`.btn`,
  `.field-input`, `.card`, `.modal`, `.chip`, …). The living catalog is
  `src/components/styleguide/StyleGuide.tsx` (`#styleguide`), documented in
  [`DESIGN.md`](DESIGN.md). Icons: `src/components/ui/Icon.tsx`.
- **Validation engine** — `src/lib/validation/`: `engine.ts` runs the catalog,
  `rules.ts` holds the ~42 implemented rules, with `ruleTypes.ts`, `ruleHelpers.ts`,
  `zones.ts`, `geo.ts` supporting them. The human-readable rule catalog is
  [`interior-design-rules.md`](interior-design-rules.md).
- **Server (AI backend)** — `server/`: `index.ts` (entry), `planning.ts` +
  `claude.ts` + `prompt.ts` (AI proposal generation), `judge.ts` / `validate.ts` /
  `ruleValidation.ts` / `autofix.ts` (server-side scoring & repair), `auth.ts` +
  `db.ts` (accounts). The client reaches it via `lib/aiProposals.ts` and
  `lib/authApi.ts`.
- **Furnish-view chrome / docks** — the 3D view's bars mount via
  `panel/SidePanel.tsx`, with `panel/ActionBar.tsx`, `panel/SelectionBar.tsx`, and the
  shared `panel/SelBar.tsx` primitive (used by WallBar / ActionBar / FloorBar / HistoryBar,
  and now also by the 2D plan editor's own dock, `plan/PlanToolbar.tsx`);
  `panel/ShortcutsReference.tsx` is the shortcuts overlay.
- **Geometry & collision** — `lib/geometry.ts` (wall transforms), `lib/polygon.ts`
  (room outline math), `lib/collision.ts` (footprints, keep-inside-walls).
- **Responsive behaviour** — one component set for every viewport; the rules live
  in [`MOBILE-FIRST.md`](MOBILE-FIRST.md), with `lib/useMediaQuery.ts` and
  `plan/useViewport.ts` as the runtime hooks.
- **Error handling** — `src/components/ui/ErrorBoundary.tsx`.

## Where this map fits in the docs

Read this **after** [`PURPOSE.md`](PURPOSE.md) / [`STRATEGY.md`](STRATEGY.md)
(the *why* and *what*) and alongside [`DESIGN.md`](DESIGN.md) (the *how it
looks*). For the full doc map, see [`README.md`](README.md).
