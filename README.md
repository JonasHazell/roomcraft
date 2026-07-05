# Roomcraft

A tool for furnishing a room: sketch the room with measurements, doors and
windows, then furnish it in a 3D view.

## Features

- 2D floor plan where the room shape is drawn freely: outer walls as a closed
  outline (L-shape, T-shape, etc.) and optional interior walls — 90° angles with
  snapping to 0.1 m
- Doors and windows per wall with position, width, height and height above the
  floor — select a wall in the 3D view or floor plan and add one
- 3D view with an orbit camera — the outer walls closest to the camera are
  hidden automatically
- Furniture (bed, sofa, table, chair, wardrobe, bookshelf, rug, custom box) with
  their own measurements, color and rotation; dragged around the floor and kept
  inside the outer walls
- Colors for floor, walls and each piece of furniture
- AI furnishing suggestions: describe your needs and the backend asks Claude to
  propose a furniture layout for the room
- Autosave, named saves (localStorage) and export/import as a JSON file — older
  saves (schema v1) are migrated automatically

## Keyboard shortcuts

- **R** — rotate the selected furniture 90°
- **Delete/Backspace** — delete the selected furniture or interior wall
- **Esc** — deselect / cancel an in-progress drawing
- **Enter** — finish an interior-wall chain in the floor plan

## Getting started

Install dependencies once:

```bash
npm install
```

### Frontend (FE)

Start the Vite dev server:

```bash
npm run dev
```

This serves the app at http://localhost:5173. Requests to `/api` are proxied to
the backend on port 8787.

### Backend (BE)

The backend is a small local server that powers the AI furnishing suggestions.
It runs Claude Code in headless mode and uses your local Claude Code login, so
no API key is required.

```bash
npm run server
```

This listens on port 8787 (override with the `PORT` env var). You only need it
running if you want to use the AI suggestion feature; the rest of the app works
with just the frontend.

Optional environment variables:

- `PORT` — backend port (default `8787`)
- `AI_MODEL` — Claude model to use (default `sonnet`)

## Development

- `npm test` — run the test suite (vitest)
- `npm run lint` — lint with oxlint
- `npm run build` — type-check and build for production

Built with React, TypeScript, Vite, three.js (@react-three/fiber + drei),
zustand and zod.
