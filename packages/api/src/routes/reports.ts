import { Hono } from "hono";
import { getWeeklySummary } from "../reports/weekly";

const app = new Hono();

app.get("/api/reports/summary", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) {
    return c.json({ error: "from and to params required" }, 400);
  }

  const { projects } = await getWeeklySummary(from, to);

  return c.json(projects);
});

export default app;
