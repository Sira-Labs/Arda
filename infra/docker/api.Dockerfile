# syntax=docker/dockerfile:1.7
# arda-api image (apps/api): migrates the database on start, then serves /healthz and /api/*
# on port 8000. Build context is the repository root (npm workspaces, one lockfile).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/tajweed/package.json packages/tajweed/
COPY packages/quran/package.json packages/quran/
COPY tools/package.json tools/
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
# The build bundles the workspace packages (TypeScript source) into dist/main.js.
COPY packages packages
COPY apps/api apps/api
RUN npm run build -w @arda/api

# Production dependencies of the api workspace only.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/tajweed/package.json packages/tajweed/
COPY packages/quran/package.json packages/quran/
COPY tools/package.json tools/
# npm nests packages it cannot hoist (e.g. better-auth) under the workspace; keep that
# directory even when it is empty so the runtime stage can always copy it.
# --omit=optional keeps test tooling out of the image: better-auth names vitest as an optional
# peer, so --omit=dev alone would still install it (and vite, esbuild, rollup).
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --omit=optional --workspace @arda/api --include-workspace-root=false \
      --no-audit --no-fund \
    && mkdir -p apps/api/node_modules

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY apps/api/package.json ./
COPY apps/api/migrations ./migrations
ARG ARDA_VERSION=dev
ENV ARDA_VERSION=$ARDA_VERSION
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/main.js"]
