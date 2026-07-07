# Roomcraft

A tool for furnishing rooms: sketch each room with measurements, doors and
windows, then furnish it in a 3D view. A project can hold several rooms, each
with its own floor plan and its own furnishing options.

## Features

- Multiple rooms per project — switch between them, create new ones and rename
  or delete them from the sidebar; each room keeps its own floor plan and its
  own furnishing proposals
- 2D floor plan where the room shape is drawn freely: outer walls as a closed
  outline (L-shape, T-shape, etc.) and optional interior walls — 90° angles with
  snapping to 0.1 m. Enter the floor-plan editor for a room with **Edit floor
  plan** in the sidebar; **Done** returns to the 3D view
- Doors and windows per wall with position, width, height and height above the
  floor — select a wall in the 3D view or floor plan and add one
- 3D view with an orbit camera — the outer walls closest to the camera are
  hidden automatically
- Furniture (bed, sofa, table, chair, wardrobe, bookshelf, rug, custom box) with
  their own measurements, color and rotation; dragged around the floor and kept
  inside the outer walls
- Colors for floor, walls and each piece of furniture — the floor and wall
  colours are part of each furnishing proposal, so different proposals of the
  same room can have their own palette
- AI furnishing suggestions: describe your needs and the backend asks Claude to
  propose a furniture layout for the room, each with its own floor/wall palette
- Undo/redo for every editing step — moving and editing furniture, walls, doors,
  windows, colours and more. Use the ↶/↷ buttons in the bottom-right corner (they
  work on mobile too) or the keyboard shortcuts below; a whole drag counts as a
  single step
- Autosave and named project saves (localStorage) — older saves (schema v1–v3,
  including single-room designs) are migrated to the current multi-room format
  automatically

## Keyboard shortcuts

- **R** — rotate the selected furniture 90°
- **Delete/Backspace** — delete the selected furniture or interior wall
- **Esc** — deselect / cancel an in-progress drawing
- **Enter** — finish an interior-wall chain in the floor plan
- **Ctrl/Cmd+Z** — undo · **Ctrl/Cmd+Shift+Z** or **Ctrl/Cmd+Y** — redo

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

## Deployment (Railway)

In production the whole app runs as a **single always-on container**: the Node
server serves the built frontend (`dist/`) and the `/api/proposals` endpoint
from the same port, so there is no separate static host to configure. The
container ships the Claude Code CLI, which powers the AI suggestions.

The repo includes a `Dockerfile` and `railway.json`; Railway builds from the
Dockerfile automatically.

1. **Create the project** — on [railway.app](https://railway.app), *New Project
   → Deploy from GitHub repo* and pick this repo. Railway detects the
   `Dockerfile` and builds it.
2. **Authenticate the Claude Code CLI** — the server logs in non-interactively
   via an OAuth token. On your own machine run:

   ```bash
   claude setup-token
   ```

   Copy the token and, in the Railway service's *Variables* tab, add:

   - `CLAUDE_CODE_OAUTH_TOKEN` — the token from the step above (**required**)
   - `AI_MODEL` — optional, e.g. `sonnet` (default) or `opus`

   Do **not** set `PORT` — Railway injects it and the server reads it.
3. **Expose it** — in *Settings → Networking*, click *Generate Domain*. That URL
   serves the app; the AI feature works out of the box because the API lives on
   the same origin.

Redeploys happen automatically on every push to the deployed branch.

Notes:

- The AI calls are long-running (up to a few minutes), which is why the backend
  needs an always-on container rather than a serverless/edge function — those
  time out well before Claude responds.
- The OAuth token authenticates as **your** Claude account. That is fine for
  personal use or a demo; for a public multi-user service, switch the backend to
  the Anthropic API with an API key instead.

## Development

- `npm test` — run the test suite (vitest)
- `npm run lint` — lint with oxlint
- `npm run build` — type-check and build for production

Built with React, TypeScript, Vite, three.js (@react-three/fiber + drei),
zustand and zod.
