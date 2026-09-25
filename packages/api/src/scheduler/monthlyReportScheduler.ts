import { getWeeklySummary } from "../reports/weekly";
import { getCurrentMonthRange, getWeeklyBreakdown } from "../reports/monthly";
import { sendMonthlyReportEmail } from "../email/sendMonthlyReport";
import { getReportRecipient } from "../settings/reportRecipient";

const CHECK_INTERVAL_MS = 60_000;

/**
 * True at the start of the 18:00 minute on the last day of the month in `timezone`.
 */
export function shouldFireMonthlyNow(date: Date, timezone: string): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const year = Number(get("year"));
  const month = Number(get("month"));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return (
    Number(get("day")) === lastDayOfMonth && get("hour") === "18" && get("minute") === "00"
  );
}

let lastSentMonthStart: string | null = null;

async function tick() {
  const timezone = process.env.REPORT_TIMEZONE ?? "Europe/Bucharest";

  if (!shouldFireMonthlyNow(new Date(), timezone)) return;

  const { from, to, monthStart } = getCurrentMonthRange(timezone);
  if (monthStart === lastSentMonthStart) return;
  lastSentMonthStart = monthStart;

  try {
    const summary = await getWeeklySummary(from, to);
    const weeks = await getWeeklyBreakdown(from, to);
    const recipient = await getReportRecipient();
    await sendMonthlyReportEmail(summary, weeks, recipient);
    console.log(`Monthly report email sent for month of ${monthStart}`);
  } catch (err) {
    console.error("Failed to send monthly report email:", err);
  }
}

export function startMonthlyReportScheduler(): void {
  setInterval(tick, CHECK_INTERVAL_MS);
}
