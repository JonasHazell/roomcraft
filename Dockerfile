# Roomcraft — single container that builds the frontend and serves it together
# with the AI proposal API. Node 24 runs the TypeScript server directly via
# native type stripping, and the Claude Code CLI powers the AI suggestions.
FROM node:24-slim

# Tools the Claude Code CLI may shell out to (git) plus CA certs for HTTPS.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Claude Code CLI — the backend spawns `claude` in headless mode.
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the frontend (needs dev dependencies: vite, tsc).
COPY . .
RUN npm run build

# Railway injects PORT at runtime; the server reads it (defaults to 8787).
EXPOSE 8787
CMD ["node", "server/index.ts"]
