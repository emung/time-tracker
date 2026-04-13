import { Hono } from "hono";
import sql from "../db";

const app = new Hono();

app.get("/api/entries", async (c) => {
  const date = c.req.query("date");
  const from = c.req.query("from");
  const to = c.req.query("to");

  let entries;
  if (date) {
    entries = await sql`
      SELECT te.*, p.name AS project_name, p.color AS project_color
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      WHERE te.started_at::date = ${date}
      ORDER BY te.started_at DESC
    `;
  } else if (from && to) {
    entries = await sql`
      SELECT te.*, p.name AS project_name, p.color AS project_color
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      WHERE te.started_at >= ${from}::date AND te.started_at < (${to}::date + 1)
      ORDER BY te.started_at DESC
    `;
  } else {
    return c.json({ error: "date or from/to params required" }, 400);
  }

  return c.json(entries);
});

app.post("/api/entries", async (c) => {
  const { project_id, started_at, stopped_at, note } = await c.req.json<{
    project_id: string;
    started_at: string;
    stopped_at: string;
    note?: string;
  }>();

  if (!project_id || !started_at || !stopped_at) {
    return c.json(
      { error: "project_id, started_at, and stopped_at are required" },
      400,
    );
  }

  if (new Date(stopped_at) <= new Date(started_at)) {
    return c.json({ error: "stopped_at must be after started_at" }, 400);
  }

  const [entry] = await sql`
    INSERT INTO time_entries (project_id, started_at, stopped_at, note)
    VALUES (${project_id}, ${started_at}, ${stopped_at}, ${note ?? ""})
    RETURNING *
  `;

  const [full] = await sql`
    SELECT te.*, p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    WHERE te.id = ${entry.id}
  `;
  return c.json(full, 201);
});

app.patch("/api/entries/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{
    project_id?: string;
    started_at?: string;
    stopped_at?: string;
    note?: string;
  }>();

  const updates: Record<string, unknown> = {};
  if (body.project_id !== undefined) updates.project_id = body.project_id;
  if (body.started_at !== undefined) updates.started_at = body.started_at;
  if (body.stopped_at !== undefined) updates.stopped_at = body.stopped_at;
  if (body.note !== undefined) updates.note = body.note;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }

  const setClauses = Object.entries(updates)
    .map(([key], i) => `${key} = $${i + 2}`)
    .join(", ");
  const values = Object.values(updates);

  const [entry] = await sql.unsafe(
    `UPDATE time_entries SET ${setClauses} WHERE id = $1 RETURNING *`,
    [id, ...values],
  );

  if (!entry) return c.json({ error: "not found" }, 404);

  const [full] = await sql`
    SELECT te.*, p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    WHERE te.id = ${entry.id}
  `;
  return c.json(full);
});

app.delete("/api/entries/:id", async (c) => {
  const { id } = c.req.param();
  const [entry] = await sql`DELETE FROM time_entries WHERE id = ${id} RETURNING id`;
  if (!entry) return c.json({ error: "not found" }, 404);
  return c.body(null, 204);
});

export default app;
