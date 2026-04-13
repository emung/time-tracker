import { Hono } from "hono";
import sql from "../db";

const app = new Hono();

app.get("/api/timer", async (c) => {
  const [active] = await sql`
    SELECT te.*, p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    WHERE te.stopped_at IS NULL
    LIMIT 1
  `;
  return c.json(active ?? null);
});

app.post("/api/timer/start", async (c) => {
  const { project_id, note } = await c.req.json<{
    project_id: string;
    note?: string;
  }>();
  if (!project_id) return c.json({ error: "project_id is required" }, 400);

  const [entry] = await sql.begin(async (tx) => {
    // Stop any running timer
    await tx`UPDATE time_entries SET stopped_at = now() WHERE stopped_at IS NULL`;

    // Start new timer
    return tx`
      INSERT INTO time_entries (project_id, started_at, note)
      VALUES (${project_id}, now(), ${note ?? ""})
      RETURNING *
    `;
  });

  // Return with project info
  const [full] = await sql`
    SELECT te.*, p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    WHERE te.id = ${entry.id}
  `;
  return c.json(full, 201);
});

app.post("/api/timer/stop", async (c) => {
  const [entry] = await sql`
    UPDATE time_entries SET stopped_at = now()
    WHERE stopped_at IS NULL
    RETURNING *
  `;
  if (!entry) return c.json({ error: "no active timer" }, 404);

  const [full] = await sql`
    SELECT te.*, p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    WHERE te.id = ${entry.id}
  `;
  return c.json(full);
});

export default app;
