# Project Memories

## History page: manual entry creation (2026-08-06)

`EntryForm` (`packages/web/src/components/EntryForm.tsx`) is dual-purpose: it creates a new
entry when rendered without an `entry` prop, and edits when one is passed. It also accepts an
optional `defaultDate?: string` (`YYYY-MM-DD`) — when creating (no `entry`) and `defaultDate` is
set, Start/End are pre-filled to `${defaultDate}T09:00`–`${defaultDate}T10:00` instead of blank.
`Today.tsx` omits `defaultDate` (fields stay blank, i.e. "now"-oriented); `History.tsx` passes the
currently-viewed `date` so adding a past entry doesn't require retyping the date.

No backend changes were needed — `POST /api/entries` (`packages/api/src/routes/entries.ts`)
already accepted arbitrary `started_at`/`stopped_at` with no "today only" restriction.

**Known gap (not yet addressed):** `POST /api/entries` has no overlap/conflict validation —
you can create an entry that overlaps another entry or the currently-running timer
(`stopped_at IS NULL` row). This predates the History add-entry feature and applies to edits too.

## Weekly report email (2026-09-12)

Added an automatic email sent every Friday 18:00 (`REPORT_TIMEZONE`, default `Europe/Bucharest`)
with the current week's time summary. New modules: `packages/api/src/reports/weekly.ts`
(`getCurrentWeekRange`, `getWeeklySummary`, `formatDuration` — shared aggregation logic, also
used by `routes/reports.ts`, which now delegates to `getWeeklySummary` instead of inlining SQL),
`packages/api/src/scheduler/weeklyReportScheduler.ts` (hand-rolled `setInterval` tick, no cron
dependency — `shouldFireNow(date, timezone)` is a pure/testable predicate), and
`packages/api/src/email/sendWeeklyReport.ts` (Resend API via `RESEND_API_KEY`, `REPORT_EMAIL_FROM`,
`REPORT_EMAIL_TO`).

**Sending mechanism history:** originally implemented with `nodemailer` over generic SMTP
(`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`). Abandoned after both attempts hit
provider auth issues: an Outlook.com app password was rejected (`535 5.7.3 Authentication
unsuccessful`) — Microsoft consumer accounts increasingly require OAuth2 or an explicit "SMTP AUTH"
toggle, not just an app password — and switching to full OAuth2 was judged too heavy for a
single-user personal app (Azure app registration + refresh-token flow). Replaced with the `resend`
package (simple API-key auth over HTTPS, no SMTP/OAuth involved) — if email sending breaks again,
suspect the Resend API key/domain verification before re-litigating SMTP providers.

Uses **reports.ts semantics** (running timers count via `COALESCE(stopped_at, now())`), not
export.ts's completed-only filter — intentional, so the email matches what the Reports page would
show for the same range at send time.

Restart guard is **in-memory only** (`lastSentWeekStart` module variable in the scheduler) — a
deliberate simplicity tradeoff for this single-instance personal app; a container restart landing
inside the Friday 18:00–18:01 window could in theory cause a duplicate send. No DB table was added
for this.

Manual test path (no HTTP trigger endpoint, since this app has no auth):
`bun run report:send` (or `docker compose exec app bun run report:send`) runs the full pipeline
once immediately, independent of the scheduler's guard/timing.

**Daily breakdown (2026-09-12):** the email also includes a per-day, per-project hours breakdown
for the current week (Monday–Sunday, including empty days as "No time tracked"). Added
`getDailyBreakdown(from, to)` to `weekly.ts` (groups `time_entries` by `started_at::date` + project;
same running-timer-counts semantics as `getWeeklySummary`). `sendWeeklyReportEmail` now takes both
`WeeklySummary` and `DailyBreakdown[]` and renders a styled, table-based HTML email (inline styles
for email-client compatibility — project color dots reuse `projects.color`).

## Monthly report email (2026-09-26)

Sent automatically at 18:00 (`REPORT_TIMEZONE`) on the **last day of each month**, to the same
recipient as the weekly email (`getReportRecipient`; the Settings label is now "Report recipient").
Content: per-project totals for the calendar month plus a **per-week breakdown** (Monday–Sunday
weeks clipped to the month, e.g. "Sep 1 – Sep 6"; empty weeks show "No time tracked").

- `packages/api/src/reports/monthly.ts`: `getCurrentMonthRange(tz, now?)`,
  `getWeeksInRange(from, to)` (pure), `getWeeklyBreakdown(from, to)` (SQL groups by ISO-week
  Monday of `started_at::date`, same running-timer semantics as `weekly.ts`). Month totals reuse
  `getWeeklySummary(from, to)` — despite the name it works for any range.
- `packages/api/src/scheduler/monthlyReportScheduler.ts`: separate `setInterval` tick mirroring
  the weekly one; `shouldFireMonthlyNow(date, tz)` is the pure predicate; in-memory
  `lastSentMonthStart` guard (same restart tradeoff as weekly). Started from `index.ts`.
- `packages/api/src/email/reportLayout.ts`: shared HTML/text renderer (`ReportContent` with
  labelled `sections`) used by both `sendWeeklyReport.ts` and `sendMonthlyReport.ts`. The weekly
  email output was verified byte-identical after this extraction.
- Manual triggers: `POST /api/reports/send-monthly` (Settings button "Send this month's report
  now"), and `bun run report:send-monthly` in `packages/api`.
- Tests: `packages/api/src/reports/monthly.test.ts` (month range incl. leap years/timezone,
  week splitting, fire predicate across DST).

When the last day of the month is a Friday, both the weekly and the monthly email are sent.

## Full CSV export / import (2026-09-25)

Settings page has a "Data" section with **Export all (CSV)** (`GET /api/export/all`) and
**Import CSV** (`POST /api/import/csv`, JSON body `{ csv }` — the browser reads the file with
`file.text()`, no multipart). Shared RFC 4180 helpers live in `packages/api/src/csv.ts`
(`csvRow`, `parseCsv`; unit tests in `csv.test.ts`, run with `bun test` in `packages/api`).
The older per-range `GET /api/export/csv` (Reports page) now also uses `csvRow` — before, a
project name containing a comma produced a broken row.

Full export columns: `id,project_id,project,project_color,project_archived,started_at,stopped_at,duration_minutes,note`
(timestamps ISO UTC; a running timer is exported with empty `stopped_at`). Import is
header-driven (column order irrelevant); only `project` and `started_at` are required, so the
Reports-range export is importable too. `duration_minutes`/`date` are ignored on import.

Import semantics:
- **All-or-nothing validation**: any invalid row rejects the whole file (400 with per-row errors).
  Inserts then run in one `sql.begin` transaction.
- **Idempotent**: an entry is skipped if its `id` already exists, or if an entry with the same
  project + `started_at` + `stopped_at` exists. Entries keep their original UUIDs.
- **Projects**: matched by `project_id`, then by exact name (non-archived preferred), else created
  (reusing the exported id, color, archived flag).
- **Running timer**: max one running row per file; it is skipped with a warning if a different
  timer is already running (preserves the one-running-timer app invariant).
- Import does not check overlaps between entries (same known gap as `POST /api/entries`).

## Raspberry Pi 5 / 24/7 Docker support (2026-09-26)

Target: the same Docker setup runs on the Apple Silicon Mac and a Raspberry Pi 5 (arm64,
64-bit OS required, since Bun has no 32-bit ARM build). No platform-specific files: both base
images are multi-arch and the image is **built on the Pi itself** (user chose this over a
registry/buildx push flow). Pi setup and ops notes are in `docs/raspberry-pi.md`.

Hardening changes: `Dockerfile` pins Bun via `ARG BUN_VERSION` (bump it deliberately), sets
`NODE_ENV=production`, runs as the non-root `bun` user (the app never writes to disk), and has a
`HEALTHCHECK` using `bun -e fetch(...)` against `/api/health` (slim image has no curl).
`docker-compose.yml` adds `restart: unless-stopped`, `init: true` on `app` (Bun as PID 1 ignored
SIGTERM, so stops used to wait 10s for SIGKILL), json-file log rotation (3×10 MB),
`stop_grace_period: 30s` on Postgres, and reads `POSTGRES_USER/PASSWORD/DB` from `.env` with
defaults equal to the old hardcoded values (`admin`/`P4ssw0rd`/`timetracker`) so the existing Mac
`pgdata` volume keeps working. Those vars only apply when the volume is first initialised.

Known Pi 5 caveat: the default kernel uses 16K pages; if containers crash-loop with
allocator/page-size errors, switch to the 4K kernel (`kernel=kernel8.img` in
`/boot/firmware/config.txt`). Not yet verified on real Pi hardware.
