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
  floor — in the floor-plan editor select a wall and use **Add door** / **Add
  window**, then fine-tune each opening; they appear in the 3D view too
- 3D view with an orbit camera — the outer walls closest to the camera are
  hidden automatically
- Furniture (bed, sofa, table, chair, desk, nightstand, TV, mirror, plant,
  wardrobe, bookshelf, rug, custom box) with their own measurements, color and
  rotation; dragged around the floor and kept inside the outer walls
- Per-type customization for each piece — e.g. the number of mattresses and
  pillows on a bed, whether a desk has monitors and a drawer unit, how many
  shelves a bookshelf has and whether it has doors, a wardrobe's door count and
  legs, a rug's pattern, and more. Edit them in the "Add furniture" dialog or via
  **More** on a selected piece; the 3D model updates live and the choices are
  saved with the piece (and to the furniture library)
- Colors for floor, walls and each piece of furniture — the floor and wall
  colours are part of each furnishing proposal, so different proposals of the
  same room can have their own palette
- AI furnishing suggestions: describe your needs and the backend asks Claude to
  propose a furniture layout for the room, each with its own floor/wall palette.
  When the server has a database configured, this feature is gated behind a
  simple email + password sign-in (see **Accounts** below)
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
It calls the Anthropic Messages API, so it needs an API key in the environment:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run server
```

Get a key from the [Anthropic Console](https://console.anthropic.com/). Without
`ANTHROPIC_API_KEY` (or `ANTHROPIC_AUTH_TOKEN`) the server still serves the app,
but `POST /api/proposals` returns a 503.

This listens on port 8787 (override with the `PORT` env var). You only need it
running if you want to use the AI suggestion feature; the rest of the app works
with just the frontend.

#### Accounts (sign-in)

Sign-in is **opt-in via a database**. When `DATABASE_URL` is set, the backend:

- creates two tables on boot (`users`, `sessions`) — no migration step to run;
- serves `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
  and `GET /api/auth/me`;
- gates `POST /api/proposals` behind a valid session, so only signed-in users can
  spend AI calls.

Passwords are hashed with Node's built-in scrypt (no native dependency). Sessions
are opaque random tokens stored in the database and sent as a `HttpOnly`,
`SameSite=Lax` cookie (`Secure` is added automatically over HTTPS), so there is no
signing secret to configure. Cross-origin POSTs are rejected as a CSRF guard.

With **no** `DATABASE_URL`, sign-in is disabled and the AI feature stays open —
the app is unchanged for frontend-only/local development.

To try accounts locally, point `DATABASE_URL` at any Postgres, e.g.:

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/roomcraft npm run server
```

Optional environment variables:

- `PORT` — backend port (default `8787`)
- `ANTHROPIC_API_KEY` — Anthropic API key. **Required** for AI furnishing; the
  SDK also accepts `ANTHROPIC_AUTH_TOKEN`.
- `AI_MODEL` — model ID to use (default `claude-sonnet-5`, chosen for speed and
  cost). Set `claude-opus-4-8` if you want the most capable model instead.
- `DATABASE_URL` — Postgres connection string. **Setting this enables sign-in**
  (accounts + sessions) and gates the AI feature behind it. Leave it unset to run
  without a database — sign-in is then disabled and the AI feature is open, which
  is convenient for local, single-user development. See **Accounts** below.
- `DATABASE_POOL_MAX` — max Postgres connections in the pool (default `5`)
- `AI_MAX_CONCURRENT` — how many AI proposals may run at once (default `2`)
- `AI_MAX_QUEUE` — how many extra requests may wait for a slot before the server
  sheds load with a 503 (default `8`)
- `AI_RATE_LIMIT_MAX` / `AI_RATE_LIMIT_WINDOW_MS` — per-IP request cap and window
  for `/api/proposals` (default `20` requests per `60000` ms)

The server also exposes `GET /api/health` for platform health checks and sends
baseline security headers (a strict CSP, `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`) on every response.

## Deployment (Railway)

In production the whole app runs as a **single always-on container**: the Node
server serves the built frontend (`dist/`) and the `/api/proposals` endpoint
from the same port, so there is no separate static host to configure. The AI
suggestions are powered by the Anthropic Messages API.

The repo includes a `Dockerfile` and `railway.json`; Railway builds from the
Dockerfile automatically.

1. **Create the project** — on [railway.app](https://railway.app), *New Project
   → Deploy from GitHub repo* and pick this repo. Railway detects the
   `Dockerfile` and builds it.
2. **Add a Postgres database** (needed for sign-in) — in the project, *New →
   Database → Add PostgreSQL*. Railway provisions it and exposes its connection
   string. Then, in the **app service's** *Variables* tab, add a reference
   variable so the app reads the database URL:

   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`

   Use the reference (the `${{ … }}` form) rather than pasting the raw URL, so it
   stays correct if Railway rotates credentials. Prefer the private URL Railway
   provides (`*.railway.internal`) — the server connects without SSL over the
   private network and with SSL otherwise. The tables are created automatically
   on the first boot; there is no migration command to run. Skip this step if you
   want to run without accounts (the AI feature is then open to anyone with the
   URL).
3. **Add your Anthropic API key** — get one from the
   [Anthropic Console](https://console.anthropic.com/). In the Railway service's
   *Variables* tab, add:

   - `ANTHROPIC_API_KEY` — the key from the Console (**required**)
   - `AI_MODEL` — optional, e.g. `claude-sonnet-5` (default) or `claude-opus-4-8`

   Do **not** set `PORT` — Railway injects it and the server reads it.
4. **Expose it** — in *Settings → Networking*, click *Generate Domain*. That URL
   serves the app; the API (auth + AI) works out of the box because it lives on
   the same origin.

Redeploys happen automatically on every push to the deployed branch.

Notes:

- The three proposals are generated in parallel (one model call per design
  direction), with the shared room/catalog context sent as a cached prompt
  prefix, so a full set comes back in roughly the time a single proposal takes.
  A call can still run for tens of seconds, which is why the backend needs an
  always-on container rather than a serverless/edge function — those time out
  well before the model responds. The server streams the response so the request
  doesn't hit an HTTP timeout.
- Every AI call bills the account behind `ANTHROPIC_API_KEY`, regardless of which
  user made it. Requiring sign-in (via `DATABASE_URL`) limits *who* can trigger
  calls; to meter spend per user you'd track usage yourself and, if needed, issue
  a separate key per tenant.

## Development

- `npm test` — run the test suite (vitest)
- `npm run lint` — lint with oxlint
- `npm run build` — type-check and build for production

Built with React, TypeScript, Vite, three.js (@react-three/fiber + drei),
zustand and zod.
