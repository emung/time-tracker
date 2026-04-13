import { Hono } from "hono";
import sql from "../db";

const app = new Hono();

app.get("/api/reports/summary", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) {
    return c.json({ error: "from and to params required" }, 400);
  }

  const rows = await sql`
    SELECT
      p.id,
      p.name,
      p.color,
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(te.stopped_at, now()) - te.started_at))
      ), 0)::float AS total_seconds
    FROM projects p
    LEFT JOIN time_entries te
      ON te.project_id = p.id
      AND te.started_at >= ${from}::date
      AND te.started_at < (${to}::date + 1)
    WHERE p.archived = false
    GROUP BY p.id, p.name, p.color
    HAVING SUM(EXTRACT(EPOCH FROM (COALESCE(te.stopped_at, now()) - te.started_at))) > 0
    ORDER BY total_seconds DESC
  `;

  return c.json(rows);
});

export default app;
