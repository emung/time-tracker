# Time Tracker — Design Spec

## Context

A personal, browser-based time tracker for a single user. Accessed from Mac and phone browsers over a local network or Tailscale, hosted on a Raspberry Pi. The goal is a fast, minimal tool for tracking time across multiple projects with real-time stopwatch functionality and the ability to review where time was spent over days, weeks, and months.

## Core Concepts

- **Projects**: Flat list, each with a name and color. Can be archived (soft-delete).
- **Time entries**: A span of time linked to a project. Has `started_at`, `stopped_at`, and an optional note.
- **Active timer**: A time entry with `stopped_at IS NULL`. At most one exists at a time. The server stores only the `started_at` timestamp; the client renders elapsed time as `now - started_at`.
- **Quick-switch**: Tapping a different project pill auto-stops the current timer and starts a new one in a single action.

## Data Model

### `projects`

| Column     | Type        | Notes                      |
|------------|-------------|----------------------------|
| id         | uuid        | PK, generated              |
| name       | text        | e.g. "Client X"            |
| color      | text        | hex, e.g. "#3B82F6"        |
| archived   | boolean     | default false              |
| created_at | timestamptz | default now()              |

### `time_entries`

| Column     | Type        | Notes                                  |
|------------|-------------|----------------------------------------|
| id         | uuid        | PK, generated                          |
| project_id | uuid        | FK → projects.id                       |
| started_at | timestamptz | when the entry began                   |
| stopped_at | timestamptz | nullable — null means timer is running |
| note       | text        | optional description                   |
| created_at | timestamptz | default now()                          |

No separate session table. A running timer is a `time_entries` row where `stopped_at IS NULL`. The API enforces at most one active entry (single-user, no DB constraint needed).

## API

All endpoints return JSON. Base path: `/api`.

### Projects

| Method | Route              | Body / Params            | Description                    |
|--------|--------------------|--------------------------|--------------------------------|
| GET    | /api/projects      | —                        | List non-archived projects     |
| POST   | /api/projects      | `{name, color}`          | Create project                 |
| PATCH  | /api/projects/:id  | `{name?, color?, archived?}` | Update project             |

### Timer

| Method | Route             | Body / Params           | Description                                          |
|--------|-------------------|-------------------------|------------------------------------------------------|
| GET    | /api/timer        | —                       | Active session (entry with `stopped_at IS NULL`) or null |
| POST   | /api/timer/start  | `{project_id, note?}`   | Start timer — auto-stops any running timer first     |
| POST   | /api/timer/stop   | —                       | Stop the active timer                                |

### Time Entries

| Method | Route             | Body / Params                            | Description              |
|--------|-------------------|------------------------------------------|--------------------------|
| GET    | /api/entries      | `?date=YYYY-MM-DD` or `?from=...&to=...` | Entries for day or range |
| POST   | /api/entries      | `{project_id, started_at, stopped_at, note?}` | Manual entry        |
| PATCH  | /api/entries/:id  | `{project_id?, started_at?, stopped_at?, note?}` | Edit entry        |
| DELETE | /api/entries/:id  | —                                        | Delete entry             |

### Reports

| Method | Route                | Params           | Description                       |
|--------|----------------------|------------------|-----------------------------------|
| GET    | /api/reports/summary | `?from=...&to=...` | Per-project totals for range   |

### Export

| Method | Route            | Params              | Description                  |
|--------|------------------|----------------------|------------------------------|
| GET    | /api/export/csv  | `?from=...&to=...`  | Download CSV of entries      |

## UI

### Layout: Compact Single Column

All pages use a single-column layout. Navigation via bottom tab bar (mobile) / top nav (desktop).

### Pages

| Page         | Route      | Description                                                        |
|--------------|------------|--------------------------------------------------------------------|
| **Today**    | `/`        | Active timer bar + project quick-switch pills + today's timeline   |
| **History**  | `/history` | Date picker, browse past days, daily totals per project            |
| **Reports**  | `/reports` | Weekly/monthly summaries, per-project breakdowns, bar charts       |
| **Projects** | `/projects`| Manage projects: add, edit name/color, archive                     |

### Today Page (Primary View)

Top-to-bottom:

1. **Active timer bar** — colored to match the current project, shows project name, elapsed time (ticking), stop button. If no timer is running, shows an idle state.
2. **Project pills** — horizontal row of colored pill buttons, one per project. Tapping a pill starts tracking that project (auto-stops current). Active project is visually highlighted.
3. **Today's timeline** — chronological list of today's entries (newest first). Each entry shows: project color dot, project name, duration, start–end times. Tapping an entry opens it for editing.
4. **Daily total** — "TODAY — 5h 23m" label above the timeline.

### History Page

- Date picker (calendar or left/right arrows to navigate days)
- Selected day's entries displayed same as today's timeline
- Daily total per project shown as colored bars or list

### Reports Page

- Period selector: this week / this month / custom range
- Per-project breakdown: project name, color, total hours, percentage of total
- Simple bar chart for daily totals over the selected period

### Projects Page

- List of all projects (including archived, visually dimmed)
- Each row: color swatch, name, edit button
- Add project: name field + color picker
- Archive/unarchive toggle

## Tech Stack

| Layer           | Choice                        | Notes                                           |
|-----------------|-------------------------------|-------------------------------------------------|
| Frontend        | React + Vite                  | SPA, served as static files                     |
| Styling         | Tailwind CSS                  | Utility-first, fast to build, no runtime        |
| Client state    | TanStack Query (React Query)  | API caching, refetching, loading states          |
| Client routing  | React Router                  | SPA routing                                     |
| Backend         | Hono on Bun                   | Already scaffolded                              |
| DB driver       | `postgres` (porsager/postgres)| Raw SQL with tagged templates, no ORM           |
| Migrations      | Plain SQL files               | Run on app startup                              |
| Deployment      | Docker Compose on Raspberry Pi| Postgres container + app container (Bun)        |

### Project Structure

```
time-tracker/
  packages/
    web/                ← React + Vite frontend
      src/
        components/     ← shared UI components
        pages/          ← Today, History, Reports, Projects
        api/            ← API client (fetch wrappers)
        App.tsx
        main.tsx
      index.html
      vite.config.ts
      package.json
    api/                ← Hono backend
      src/
        routes/         ← projects, timer, entries, reports, export
        db/
          migrations/   ← SQL migration files
          index.ts      ← postgres connection
        index.ts        ← Hono app entry
      package.json
  docker-compose.yml
  package.json          ← Bun workspace root
```

### Deployment

`docker-compose.yml` with two services:

1. **postgres** — official Postgres image, volume-mounted for persistence
2. **app** — Bun-based container that runs the Hono API and serves the built Vite frontend as static files

The Hono API serves `/api/*` routes and falls back to serving the Vite build output for all other paths (SPA routing).

## Verification

1. **API**: `curl` each endpoint to verify CRUD for projects, timer start/stop/switch, entries, reports, and CSV export
2. **Timer**: Start a timer, close the browser, reopen — verify elapsed time is correct (server-authoritative)
3. **Quick-switch**: Tap a different project pill — verify old timer stops and new one starts
4. **Manual entry**: Add an entry for a past time range, verify it appears in the timeline
5. **History**: Navigate to a past date, verify entries display correctly
6. **Reports**: Check weekly/monthly summaries match the underlying entries
7. **CSV export**: Download a CSV for a date range, verify contents match
8. **Mobile**: Test on phone browser — verify single-column layout, bottom nav, and touch targets work
9. **Docker**: `docker-compose up` on Pi — verify everything starts and is accessible over the network
