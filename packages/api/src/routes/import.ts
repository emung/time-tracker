import { Hono } from "hono";
import sql from "../db";
import { parseCsv } from "../csv";

const app = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_COLOR = "#3B82F6";

interface ImportRow {
  row: number;
  id: string;
  projectId: string | null;
  projectName: string;
  projectColor: string;
  projectArchived: boolean;
  startedAt: string;
  stoppedAt: string | null;
  note: string;
}

interface RowError {
  row: number;
  message: string;
}

function parseRows(text: string): { rows: ImportRow[]; errors: RowError[] } {
  const [header, ...data] = parseCsv(text);
  if (!header) return { rows: [], errors: [{ row: 1, message: "file is empty" }] };

  const col = new Map(header.map((h, i) => [h.trim().toLowerCase(), i]));
  const missing = ["project", "started_at"].filter((c) => !col.has(c));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 1, message: `missing required column(s): ${missing.join(", ")}` }],
    };
  }

  const get = (r: string[], name: string) => {
    const i = col.get(name);
    return i === undefined ? "" : (r[i] ?? "").trim();
  };

  const rows: ImportRow[] = [];
  const errors: RowError[] = [];

  data.forEach((r, idx) => {
    const row = idx + 2; // 1-based, header is row 1
    const fail = (message: string) => errors.push({ row, message });

    const id = get(r, "id");
    const projectId = get(r, "project_id");
    const projectName = get(r, "project");
    const started = get(r, "started_at");
    const stopped = get(r, "stopped_at");
    const archived = get(r, "project_archived").toLowerCase();

    if (id && !UUID_RE.test(id)) return fail(`invalid id "${id}"`);
    if (projectId && !UUID_RE.test(projectId)) return fail(`invalid project_id "${projectId}"`);
    if (!projectName) return fail("project is empty");

    const startedMs = Date.parse(started);
    if (!started || Number.isNaN(startedMs)) return fail(`invalid started_at "${started}"`);

    let stoppedAt: string | null = null;
    if (stopped) {
      const stoppedMs = Date.parse(stopped);
      if (Number.isNaN(stoppedMs)) return fail(`invalid stopped_at "${stopped}"`);
      if (stoppedMs <= startedMs) return fail("stopped_at must be after started_at");
      stoppedAt = new Date(stoppedMs).toISOString();
    }

    if (archived && archived !== "true" && archived !== "false") {
      return fail(`invalid project_archived "${archived}"`);
    }

    rows.push({
      row,
      id: id || crypto.randomUUID(),
      projectId: projectId || null,
      projectName,
      projectColor: get(r, "project_color") || DEFAULT_COLOR,
      projectArchived: archived === "true",
      startedAt: new Date(startedMs).toISOString(),
      stoppedAt,
      // Notes keep their original whitespace
      note: col.has("note") ? (r[col.get("note")!] ?? "") : "",
    });
  });

  const running = rows.filter((r) => r.stoppedAt === null);
  if (running.length > 1) {
    errors.push({
      row: running[1].row,
      message: `only one running entry (empty stopped_at) is allowed, found ${running.length}`,
    });
  }

  return { rows, errors };
}

// Imports a CSV in the format produced by GET /api/export/all (the per-range
// export from GET /api/export/csv works too). All-or-nothing: any invalid row
// rejects the whole file. Entries already present (same id, or same project +
// start + stop) are skipped, so re-importing the same file is a no-op.
app.post("/api/import/csv", async (c) => {
  const { csv } = await c.req.json<{ csv: string }>();
  if (typeof csv !== "string" || !csv.trim()) {
    return c.json({ error: "csv is required" }, 400);
  }

  let parsed;
  try {
    parsed = parseRows(csv);
  } catch (err) {
    return c.json({ error: `Could not parse CSV: ${(err as Error).message}` }, 400);
  }

  const { rows, errors } = parsed;
  if (errors.length > 0) {
    const summary = errors
      .slice(0, 5)
      .map((e) => `row ${e.row}: ${e.message}`)
      .join("; ");
    const more = errors.length > 5 ? ` (+${errors.length - 5} more)` : "";
    return c.json(
      { error: `Import rejected — ${summary}${more}`, errors: errors.slice(0, 100) },
      400,
    );
  }

  const result = await sql.begin(async (tx) => {
    let imported = 0;
    let skipped = 0;
    let projectsCreated = 0;
    const warnings: string[] = [];

    const projects = await tx<{ id: string; name: string; archived: boolean }[]>`
      SELECT id, name, archived FROM projects ORDER BY archived, created_at
    `;
    const byId = new Map(projects.map((p) => [p.id, p.id]));
    const byName = new Map<string, string>();
    for (const p of projects) if (!byName.has(p.name)) byName.set(p.name, p.id);

    // Match by id first (survives renames), then by name, otherwise create.
    const resolveProject = async (r: ImportRow): Promise<string> => {
      if (r.projectId && byId.has(r.projectId)) return r.projectId;
      const named = byName.get(r.projectName);
      if (named) return named;

      const [created] = await tx<{ id: string }[]>`
        INSERT INTO projects (id, name, color, archived)
        VALUES (
          ${r.projectId ?? crypto.randomUUID()},
          ${r.projectName},
          ${r.projectColor},
          ${r.projectArchived}
        )
        RETURNING id
      `;
      projectsCreated++;
      byId.set(created.id, created.id);
      byName.set(r.projectName, created.id);
      return created.id;
    };

    const [runningNow] = await tx<{ id: string }[]>`
      SELECT id FROM time_entries WHERE stopped_at IS NULL LIMIT 1
    `;
    let runningId: string | null = runningNow?.id ?? null;

    for (const r of rows) {
      if (r.stoppedAt === null && runningId && runningId !== r.id) {
        skipped++;
        warnings.push(`row ${r.row}: skipped running entry — a timer is already running`);
        continue;
      }

      const projectId = await resolveProject(r);
      const inserted = await tx`
        INSERT INTO time_entries (id, project_id, started_at, stopped_at, note)
        SELECT ${r.id}::uuid, ${projectId}::uuid, ${r.startedAt}::timestamptz,
               ${r.stoppedAt}::timestamptz, ${r.note}
        WHERE NOT EXISTS (
          SELECT 1 FROM time_entries
          WHERE id = ${r.id}::uuid
             OR (project_id = ${projectId}::uuid
                 AND started_at = ${r.startedAt}::timestamptz
                 AND stopped_at IS NOT DISTINCT FROM ${r.stoppedAt}::timestamptz)
        )
        RETURNING id
      `;

      if (inserted.length > 0) {
        imported++;
        if (r.stoppedAt === null) runningId = r.id;
      } else {
        skipped++;
      }
    }

    return { imported, skipped, projects_created: projectsCreated, warnings };
  });

  return c.json(result);
});

export default app;
