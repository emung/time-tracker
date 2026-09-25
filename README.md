# Time Tracker

A self-hosted, single-user time-tracking web app. Start and stop a timer against a project,
fix up or back-fill entries, see where your time went, and get weekly and monthly summaries
sent to you by email. It runs as one Docker container next to Postgres, on a Mac or on a
Raspberry Pi 5 that stays on all the time.

## Features

- **One-tap timer**: pick a project to start timing. Starting another project stops the
  running timer first, so only one timer runs at a time.
- **Today & History**: list, edit, delete and add entries manually for any day, past days
  included.
- **Projects**: name, color and archive flag.
- **Reports**: per-project totals for any date range, with CSV export.
- **Email reports** (via [Resend](https://resend.com)):
  - weekly, every Friday at 18:00, with totals and a per-day breakdown
  - monthly, on the last day of the month at 18:00, with totals and a per-week breakdown
  - both can also be sent from the Settings page at any time
- **Backup / restore**: export all data to CSV and import it again. Import checks every row
  before writing anything and can be re-run without creating duplicates.
- Mobile-first dark UI (bottom nav on phones, top nav on desktop).

> **No authentication.** Anyone who can reach the app can read and edit your data. Keep it on
> your LAN or behind a VPN/reverse proxy with auth, and don't port-forward it.

## Tech stack

| Layer    | Tech                                                                  |
| -------- | --------------------------------------------------------------------- |
| Runtime  | [Bun](https://bun.sh) workspaces (monorepo)                           |
| API      | [Hono](https://hono.dev), [postgres.js](https://github.com/porsager/postgres), plain SQL migrations |
| Web      | React 19, Vite, Tailwind CSS v4, React Router v7, TanStack Query v5   |
| Database | PostgreSQL 17                                                         |
| Email    | Resend                                                                |

```
packages/
  api/   Hono REST API on :3100; in production it also serves the built frontend
  web/   React SPA (Vite dev server on :5173, proxies /api to :3100)
docs/    Raspberry Pi guide, original design spec
```

## Quick start (Docker)

This is the recommended way to run the app. You only need Docker with the Compose plugin.

```bash
cp .env.example .env    # set POSTGRES_PASSWORD and the email settings
docker compose up --build -d
```

Open <http://localhost:3100>. Database migrations run automatically when the app starts.

Set the `POSTGRES_*` values **before the first start**. Postgres only reads them when it
creates the `pgdata` volume.

### Updating

The `app` image is built from your local checkout, so pulling new commits does nothing until
you rebuild:

```bash
git pull
docker compose up --build -d app
```

This recreates only the `app` container. Postgres and its data volume stay as they are.

### Raspberry Pi 5

The same `Dockerfile` and `docker-compose.yml` run unchanged on a Pi 5 with a **64-bit** OS.
See [docs/raspberry-pi.md](docs/raspberry-pi.md) for setup, running it all the time,
moving data over from another machine and the kernel page-size caveat.

## Local development

Requirements: [Bun](https://bun.sh) ≥ 1.3 and a running PostgreSQL instance.

```bash
bun install
cp .env.example .env    # DATABASE_URL is the only value needed for local dev
bun run dev             # api (:3100, hot reload) + web (:5173)
```

Then open <http://localhost:5173>. If `DATABASE_URL` is unset, the API connects to
`postgres://postgres:postgres@localhost:5432/timetracker`. To start just a database, run
`docker compose up -d postgres`. Compose doesn't publish its port, though, so for local dev a
Postgres installed on your machine (or one you run with `-p 5432:5432`) is easier.

### Scripts

| Command                   | What it does                               |
| ------------------------- | ------------------------------------------ |
| `bun run dev`             | Start API and web together                 |
| `bun run dev:api`         | API only, with `--hot` reload              |
| `bun run dev:web`         | Vite dev server only                       |
| `bun run build`           | Type-check and build the frontend to `packages/web/dist` |

Inside `packages/api`:

| Command                       | What it does                                              |
| ----------------------------- | --------------------------------------------------------- |
| `bun test`                    | Run unit tests (CSV helpers, monthly report logic)        |
| `bun run report:send`         | Send the weekly report email now                          |
| `bun run report:send-monthly` | Send the monthly report email now                         |

In Docker, run the report scripts with `docker compose exec app bun run report:send`.

## Configuration

All settings are environment variables. Put them in `.env`; see [.env.example](.env.example).

| Variable            | Default                                                  | Purpose |
| ------------------- | -------------------------------------------------------- | ------- |
| `DATABASE_URL`      | `postgres://postgres:postgres@localhost:5432/timetracker` | Local dev only. Compose builds its own from `POSTGRES_*` |
| `POSTGRES_USER`     | `admin`                                                  | Docker Postgres user (applied only when the volume is first created) |
| `POSTGRES_PASSWORD` | `P4ssw0rd`                                               | Docker Postgres password. Change it, and keep it URL-safe |
| `POSTGRES_DB`       | `timetracker`                                            | Docker Postgres database name |
| `REPORT_TIMEZONE`   | `Europe/Bucharest`                                       | Timezone for report schedules and week/month boundaries |
| `RESEND_API_KEY`    | none                                                     | Resend API key; the report emails can't be sent without it |
| `REPORT_EMAIL_FROM` | none                                                     | Sender address (must be on a domain verified in Resend) |
| `REPORT_EMAIL_TO`   | none                                                     | Default recipient. Can be changed later on the Settings page, which takes precedence |

## Data model

- **`projects`**: `id` (UUID), `name`, `color`, `archived`
- **`time_entries`**: `id` (UUID), `project_id`, `started_at`, `stopped_at`, `note`. A row
  with `stopped_at IS NULL` is the running timer.
- **`app_settings`**: key/value store (currently only the report recipient)

Migrations are numbered `.sql` files in `packages/api/src/db/migrations/`. They run in order
at startup and are recorded in a `_migrations` table. To change the schema, add a new file
such as `004_add_tags.sql`.

## API

All endpoints are JSON under `/api`. Dates are `YYYY-MM-DD` and timestamps are ISO 8601.

| Method  | Path                              | Description |
| ------- | --------------------------------- | ----------- |
| `GET`   | `/api/health`                     | Health check |
| `GET`   | `/api/projects`                   | List projects |
| `POST`  | `/api/projects`                   | Create a project |
| `PATCH` | `/api/projects/:id`               | Update name / color / archived |
| `GET`   | `/api/timer`                      | Currently running entry, or `null` |
| `POST`  | `/api/timer/start`                | Start a timer `{ project_id, note? }` (stops any running one) |
| `POST`  | `/api/timer/stop`                 | Stop the running timer |
| `GET`   | `/api/entries?date=` or `?from=&to=` | List entries for a day or date range |
| `POST`  | `/api/entries`                    | Create an entry `{ project_id, started_at, stopped_at, note? }` |
| `PATCH` | `/api/entries/:id`                | Update an entry |
| `DELETE`| `/api/entries/:id`                | Delete an entry |
| `GET`   | `/api/reports/summary?from=&to=`  | Per-project totals for a range |
| `POST`  | `/api/reports/send-weekly`        | Send this week's report email now |
| `POST`  | `/api/reports/send-monthly`       | Send this month's report email now |
| `GET`   | `/api/export/csv?from=&to=`       | CSV export of a date range |
| `GET`   | `/api/export/all`                 | Full CSV backup of all entries |
| `POST`  | `/api/import/csv`                 | Import a CSV backup `{ csv }` |
| `GET`   | `/api/settings/report-recipient`  | Current report recipient |
| `PATCH` | `/api/settings/report-recipient`  | Change the report recipient |

## Known limitations

- Single user, no authentication.
- Entries can overlap each other or the running timer. Neither the API nor CSV import checks
  for overlaps.
- The "already sent" markers for report emails are kept in memory only. If the container
  restarts during the 18:00 send window, a report could be sent twice.
