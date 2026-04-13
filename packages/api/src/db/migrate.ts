import { readdir } from "node:fs/promises";
import { join } from "node:path";
import sql from "./index";

export async function runMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const migrationsDir = join(import.meta.dir, "migrations");
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const executed = await sql<{ name: string }[]>`
    SELECT name FROM _migrations
  `;
  const executedSet = new Set(executed.map((r) => r.name));

  for (const file of files) {
    if (executedSet.has(file)) continue;

    const content = await Bun.file(join(migrationsDir, file)).text();
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
    console.log(`Migration applied: ${file}`);
  }
}
