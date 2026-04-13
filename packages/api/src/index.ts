import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { runMigrations } from "./db/migrate";
import projects from "./routes/projects";
import timer from "./routes/timer";
import entries from "./routes/entries";
import reports from "./routes/reports";
import exportCsv from "./routes/export";

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/", projects);
app.route("/", timer);
app.route("/", entries);
app.route("/", reports);
app.route("/", exportCsv);

// Serve frontend static files in production
// root is relative to cwd — in Docker, cwd is /app
app.use("/*", serveStatic({ root: "./packages/web/dist" }));
app.get("/*", serveStatic({ root: "./packages/web/dist", path: "/index.html" }));

await runMigrations();

export default {
  port: 3100,
  fetch: app.fetch,
};
