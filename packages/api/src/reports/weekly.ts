import sql from "../db";

export interface ProjectSummary {
  id: string;
  name: string;
  color: string;
  total_seconds: number;
}

export interface WeeklySummary {
  from: string;
  to: string;
  projects: ProjectSummary[];
  totalSeconds: number;
}

export interface DailyBreakdown {
  day: string;
  projects: ProjectSummary[];
  totalSeconds: number;
}

/**
 * Monday–Sunday range containing "now", evaluated in the given IANA timezone.
 * `to` is the Sunday date; callers treat the range as inclusive of that whole day.
 */
export function getCurrentWeekRange(timezone: string): {
  from: string;
  to: string;
  weekStart: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const todayLocal = `${get("year")}-${get("month")}-${get("day")}`;
  const weekdayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offsetFromMonday = weekdayMap[get("weekday")];

  const today = new Date(`${todayLocal}T00:00:00Z`);
  const monday = new Date(today);
  monday.setUTCDate(monday.getUTCDate() - offsetFromMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  const from = monday.toISOString().split("T")[0];
  const to = sunday.toISOString().split("T")[0];

  return { from, to, weekStart: from };
}

export async function getWeeklySummary(
  from: string,
  to: string,
): Promise<WeeklySummary> {
  const projects = await sql<ProjectSummary[]>`
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

  const totalSeconds = projects.reduce((sum, p) => sum + p.total_seconds, 0);

  return { from, to, projects, totalSeconds };
}

function dateRangeInclusive(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export async function getDailyBreakdown(
  from: string,
  to: string,
): Promise<DailyBreakdown[]> {
  const rows = await sql<
    { day: string; id: string; name: string; color: string; total_seconds: number }[]
  >`
    SELECT
      te.started_at::date::text AS day,
      p.id,
      p.name,
      p.color,
      SUM(
        EXTRACT(EPOCH FROM (COALESCE(te.stopped_at, now()) - te.started_at))
      )::float AS total_seconds
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    WHERE p.archived = false
      AND te.started_at >= ${from}::date
      AND te.started_at < (${to}::date + 1)
    GROUP BY day, p.id, p.name, p.color
    HAVING SUM(EXTRACT(EPOCH FROM (COALESCE(te.stopped_at, now()) - te.started_at))) > 0
    ORDER BY day, total_seconds DESC
  `;

  const byDay = new Map<string, ProjectSummary[]>();
  for (const row of rows) {
    const list = byDay.get(row.day) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      color: row.color,
      total_seconds: row.total_seconds,
    });
    byDay.set(row.day, list);
  }

  return dateRangeInclusive(from, to).map((day) => {
    const projects = byDay.get(day) ?? [];
    const totalSeconds = projects.reduce((sum, p) => sum + p.total_seconds, 0);
    return { day, projects, totalSeconds };
  });
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}
