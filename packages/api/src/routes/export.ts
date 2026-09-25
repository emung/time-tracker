import { Hono } from "hono";
import sql from "../db";
import { csvRow } from "../csv";

const app = new Hono();

// Columns of the full export. POST /api/import/csv reads files in this format
// (matched by header name, so column order doesn't matter).
export const FULL_EXPORT_COLUMNS = [
  "id",
  "project_id",
  "project",
  "project_color",
  "project_archived",
  "started_at",
  "stopped_at",
  "duration_minutes",
  "note",
] as const;

app.get("/api/export/csv", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) {
    return c.json({ error: "from and to params required" }, 400);
  }

  const entries = await sql`
    SELECT
      te.started_at,
      te.stopped_at,
      te.note,
      p.name AS project_name,
      EXTRACT(EPOCH FROM (te.stopped_at - te.started_at)) / 60 AS duration_minutes
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    WHERE te.stopped_at IS NOT NULL
      AND te.started_at >= ${from}::date
      AND te.started_at < (${to}::date + 1)
    ORDER BY te.started_at
  `;

  const header = "date,project,started_at,stopped_at,duration_minutes,note";
  const rows = entries.map((e) => {
    const date = new Date(e.started_at).toISOString().split("T")[0];
    const started = new Date(e.started_at).toISOString();
    const stopped = new Date(e.stopped_at).toISOString();
    const minutes = Math.round(Number(e.duration_minutes));
    return csvRow([date, e.project_name, started, stopped, minutes, e.note]);
  });

  const csv = [header, ...rows].join("\n");

  c.header("Content-Type", "text/csv");
  c.header("Content-Disposition", `attachment; filename="time-entries-${from}-to-${to}.csv"`);
  return c.body(csv);
});

// Full backup of every time entry (including a running timer), re-importable
// via POST /api/import/csv.
app.get("/api/export/all", async (c) => {
  const entries = await sql`
    SELECT
      te.id,
      te.project_id,
      te.started_at,
      te.stopped_at,
      te.note,
      p.name AS project_name,
      p.color AS project_color,
      p.archived AS project_archived,
      EXTRACT(EPOCH FROM (te.stopped_at - te.started_at)) / 60 AS duration_minutes
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    ORDER BY te.started_at
  `;

  const rows = entries.map((e) =>
    csvRow([
      e.id,
      e.project_id,
      e.project_name,
      e.project_color,
      e.project_archived,
      new Date(e.started_at).toISOString(),
      e.stopped_at ? new Date(e.stopped_at).toISOString() : "",
      e.stopped_at ? Math.round(Number(e.duration_minutes)) : "",
      e.note,
    ]),
  );

  const csv = [FULL_EXPORT_COLUMNS.join(","), ...rows].join("\n") + "\n";
  const today = new Date().toISOString().split("T")[0];

  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="time-entries-all-${today}.csv"`);
  return c.body(csv);
});

export default app;
