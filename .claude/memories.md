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
