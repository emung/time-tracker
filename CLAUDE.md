# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A time-tracking web app with a Bun monorepo (workspaces). Two packages:

- **`packages/api`** — Hono REST API on Bun (port 3100), PostgreSQL via `postgres` (postgresjs), file-based SQL migrations
- **`packages/web`** — React 19 SPA with Vite, Tailwind CSS v4, React Router v7, TanStack React Query v5

## Commands

```bash
bun install                  # install all workspace deps
bun run dev                  # start both api + web concurrently
bun run dev:api              # api only (hot-reload via --hot)
bun run dev:web              # web only (Vite dev server on :5173)
bun run build                # build frontend (tsc + vite build)
docker compose up --build    # full stack with Postgres
```

The web dev server proxies `/api` requests to `http://localhost:3100` (see `packages/web/vite.config.ts`).

Local dev requires a running Postgres instance — set `DATABASE_URL` or it defaults to `postgres://postgres:postgres@localhost:5432/timetracker`.

## Architecture

### API (`packages/api`)

- **Entry point**: `src/index.ts` — creates Hono app, registers route modules, runs migrations on startup, serves the built frontend as static files in production
- **Routes**: Each file in `src/routes/` exports a Hono sub-app mounted at root. All endpoints are under `/api/`. Key routes: `projects`, `timer` (start/stop active timer), `entries` (CRUD), `reports`, `export`
- **Database**: `src/db/index.ts` exports a single `sql` tagged-template instance (postgresjs). Queries use tagged templates (`sql\`...\``) for parameterization; `sql.unsafe()` is used only for dynamic column updates
- **Migrations**: Sequential `.sql` files in `src/db/migrations/`, tracked in a `_migrations` table. Run automatically on server start via `runMigrations()`

### Web (`packages/web`)

- **Pages**: `src/pages/` — Today (active timer + today's entries), History, Reports, Projects
- **API layer**: `src/api/client.ts` (thin fetch wrapper), `src/api/types.ts` (shared interfaces), `src/api/hooks.ts` (React Query hooks)
- **Components**: `src/components/` — TimerBar, ProjectPills, EntryList, EntryForm
- **Styling**: Tailwind v4 (uses `@tailwindcss/vite` plugin, no config file needed). Dark theme (`bg-gray-950`). Mobile-first with bottom nav; desktop gets top nav.

### Database Schema

Two tables: `projects` (UUID PK, name, color, archived) and `time_entries` (UUID PK, project_id FK, started_at, stopped_at nullable for running timers, note). A running timer is a `time_entry` row where `stopped_at IS NULL` — only one should exist at a time (enforced by app logic, not DB constraint).

### Adding New Migrations

Create a new numbered `.sql` file in `packages/api/src/db/migrations/` (e.g., `003_add_tags.sql`). It will auto-run on next server start.
