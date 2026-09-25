# Multi-arch: oven/bun publishes linux/amd64 and linux/arm64 variants, so this
# builds natively on Apple Silicon, x86 hosts and a Raspberry Pi 5 (64-bit OS).
# Pinned so a rebuild on a long-running host can't silently pick up a new Bun.
ARG BUN_VERSION=1.3.12

FROM oven/bun:${BUN_VERSION} AS build

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json bun.lock ./
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

# Install all dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY packages/api packages/api
COPY packages/web packages/web
COPY tsconfig.json .

# Build frontend
RUN cd packages/web && bun run build

# ── Runtime ──
FROM oven/bun:${BUN_VERSION}-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

RUN bun install --frozen-lockfile --production

COPY packages/api packages/api
COPY --from=build /app/packages/web/dist packages/web/dist

# The app never writes to disk, so drop root (the oven/bun image ships a `bun` user)
USER bun

EXPOSE 3100

# slim image has no curl/wget — use Bun's fetch for the probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["bun", "-e", "fetch('http://localhost:3100/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["bun", "run", "packages/api/src/index.ts"]
