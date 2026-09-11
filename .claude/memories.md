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
