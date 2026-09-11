import { getCurrentWeekRange, getDailyBreakdown, getWeeklySummary } from "../reports/weekly";
import { sendWeeklyReportEmail } from "../email/sendWeeklyReport";
import { getReportRecipient } from "../settings/reportRecipient";

const CHECK_INTERVAL_MS = 60_000;

/**
 * True at the start of the Friday-18:00 minute in `timezone`.
 */
export function shouldFireNow(date: Date, timezone: string): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return get("weekday") === "Fri" && get("hour") === "18" && get("minute") === "00";
}

let lastSentWeekStart: string | null = null;

async function tick() {
  const timezone = process.env.REPORT_TIMEZONE ?? "Europe/Bucharest";

  if (!shouldFireNow(new Date(), timezone)) return;

  const { from, to, weekStart } = getCurrentWeekRange(timezone);
  if (weekStart === lastSentWeekStart) return;
  lastSentWeekStart = weekStart;

  try {
    const summary = await getWeeklySummary(from, to);
    const daily = await getDailyBreakdown(from, to);
    const recipient = await getReportRecipient();
    await sendWeeklyReportEmail(summary, daily, recipient);
    console.log(`Weekly report email sent for week of ${weekStart}`);
  } catch (err) {
    console.error("Failed to send weekly report email:", err);
  }
}

export function startWeeklyReportScheduler(): void {
  setInterval(tick, CHECK_INTERVAL_MS);
}
