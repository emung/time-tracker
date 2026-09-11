import { getCurrentWeekRange, getDailyBreakdown, getWeeklySummary } from "../reports/weekly";
import { sendWeeklyReportEmail } from "../email/sendWeeklyReport";

const timezone = process.env.REPORT_TIMEZONE ?? "Europe/Bucharest";
const { from, to, weekStart } = getCurrentWeekRange(timezone);

const summary = await getWeeklySummary(from, to);
const daily = await getDailyBreakdown(from, to);
await sendWeeklyReportEmail(summary, daily);

console.log(`Weekly report email sent for week of ${weekStart} (${from}..${to}) to ${process.env.REPORT_EMAIL_TO}`);
process.exit(0);
