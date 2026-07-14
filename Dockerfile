# Roomcraft — single container that builds the frontend and serves it together
# with the AI proposal API. Node 24 runs the TypeScript server directly via
# native type stripping, and the Anthropic API powers the AI suggestions.
FROM node:24-slim

# CA certs for outbound HTTPS to the Anthropic API.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

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
