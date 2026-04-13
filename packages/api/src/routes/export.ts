import { Hono } from "hono";
import sql from "../db";

const app = new Hono();

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
    const note = `"${String(e.note).replace(/"/g, '""')}"`;
    return `${date},${e.project_name},${started},${stopped},${minutes},${note}`;
  });

  const csv = [header, ...rows].join("\n");

  c.header("Content-Type", "text/csv");
  c.header("Content-Disposition", `attachment; filename="time-entries-${from}-to-${to}.csv"`);
  return c.body(csv);
});

export default app;
