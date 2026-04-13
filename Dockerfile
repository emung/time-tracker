FROM oven/bun:1 AS build

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
FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

RUN bun install --frozen-lockfile --production

COPY packages/api packages/api
COPY --from=build /app/packages/web/dist packages/web/dist

EXPOSE 3100

CMD ["bun", "run", "packages/api/src/index.ts"]
