# syntax=docker/dockerfile:1.7
# arda-web: builds the offline-first PWA (apps/web) and serves it with Caddy, which also
# proxies /api to arda-api on the same origin (ADR-0004: no CORS, no third-party cookies).
# Build context is the repository root (npm workspaces, one lockfile).
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Manifests first for layer caching; every workspace manifest is needed for `npm ci`.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY apps/web apps/web
RUN npm run build -w @arda/web

FROM caddy:2-alpine AS web
# Reported by /healthz-web, so deploy checks can see which web image is live. Declared this
# late because it changes on every commit and would bust the npm ci cache.
ARG ARDA_VERSION="dev"
ENV ARDA_VERSION=$ARDA_VERSION
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz-web || exit 1
