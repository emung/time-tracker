import sql from "../db";
import type { ProjectSummary } from "./weekly";

export interface WeekBreakdown {
  /** Monday of the ISO week — the grouping key, may lie before the month's `from`. */
  weekStart: string;
  /** Week bounds clipped to the month. */
  from: string;
  to: string;
  projects: ProjectSummary[];
  totalSeconds: number;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * First–last day of the month containing `now`, evaluated in the given IANA timezone.
 * `to` is the last date of the month; callers treat the range as inclusive of that whole day.
 */
export function getCurrentMonthRange(
  timezone: string,
  now: Date = new Date(),
): { from: string; to: string; monthStart: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const year = get("year");
  const month = get("month");

  const from = toDateStr(new Date(Date.UTC(year, month - 1, 1)));
  // Day 0 of the next month is the last day of this one.
  const to = toDateStr(new Date(Date.UTC(year, month, 0)));

  return { from, to, monthStart: from };
}

/**
 * Monday–Sunday weeks overlapping [from, to], each clipped to that range.
 */
export function getWeeksInRange(
  from: string,
  to: string,
): { weekStart: string; from: string; to: string }[] {
  const weeks: { weekStart: string; from: string; to: string }[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  const monday = new Date(start);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

  while (monday <= end) {
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    weeks.push({
      weekStart: toDateStr(monday),
      from: toDateStr(monday < start ? start : monday),
      to: toDateStr(sunday > end ? end : sunday),
    });
    monday.setUTCDate(monday.getUTCDate() + 7);
  }

  return weeks;
}

export async function getWeeklyBreakdown(
  from: string,
  to: string,
): Promise<WeekBreakdown[]> {
  const rows = await sql<
    { week_start: string; id: string; name: string; color: string; total_seconds: number }[]
  >`
    SELECT
      (te.started_at::date - (EXTRACT(ISODOW FROM te.started_at::date)::int - 1))::text AS week_start,
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
    GROUP BY week_start, p.id, p.name, p.color
    HAVING SUM(EXTRACT(EPOCH FROM (COALESCE(te.stopped_at, now()) - te.started_at))) > 0
    ORDER BY week_start, total_seconds DESC
  `;

  const byWeek = new Map<string, ProjectSummary[]>();
  for (const row of rows) {
    const list = byWeek.get(row.week_start) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      color: row.color,
      total_seconds: row.total_seconds,
    });
    byWeek.set(row.week_start, list);
  }

  return getWeeksInRange(from, to).map((week) => {
    const projects = byWeek.get(week.weekStart) ?? [];
    const totalSeconds = projects.reduce((sum, p) => sum + p.total_seconds, 0);
    return { ...week, projects, totalSeconds };
  });
}
