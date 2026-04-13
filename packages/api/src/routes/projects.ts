import { Hono } from "hono";
import sql from "../db";

const app = new Hono();

app.get("/api/projects", async (c) => {
  const projects = await sql`
    SELECT * FROM projects WHERE archived = false ORDER BY created_at
  `;
  return c.json(projects);
});

app.post("/api/projects", async (c) => {
  const { name, color } = await c.req.json<{ name: string; color: string }>();
  if (!name?.trim()) return c.json({ error: "name is required" }, 400);
  if (!color?.trim()) return c.json({ error: "color is required" }, 400);

  const [project] = await sql`
    INSERT INTO projects (name, color) VALUES (${name.trim()}, ${color.trim()})
    RETURNING *
  `;
  return c.json(project, 201);
});

app.patch("/api/projects/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{
    name?: string;
    color?: string;
    archived?: boolean;
  }>();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.color !== undefined) updates.color = body.color.trim();
  if (body.archived !== undefined) updates.archived = body.archived;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }

  const setClauses = Object.entries(updates)
    .map(([key], i) => `${key} = $${i + 2}`)
    .join(", ");
  const values = Object.values(updates);

  const [project] = await sql.unsafe(
    `UPDATE projects SET ${setClauses} WHERE id = $1 RETURNING *`,
    [id, ...values],
  );

  if (!project) return c.json({ error: "not found" }, 404);
  return c.json(project);
});

export default app;
