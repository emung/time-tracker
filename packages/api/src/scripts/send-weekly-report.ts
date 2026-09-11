import { getCurrentWeekRange, getDailyBreakdown, getWeeklySummary } from "../reports/weekly";
import { sendWeeklyReportEmail } from "../email/sendWeeklyReport";
import { getReportRecipient } from "../settings/reportRecipient";

const timezone = process.env.REPORT_TIMEZONE ?? "Europe/Bucharest";
const { from, to, weekStart } = getCurrentWeekRange(timezone);

const summary = await getWeeklySummary(from, to);
const daily = await getDailyBreakdown(from, to);
const recipient = await getReportRecipient();
await sendWeeklyReportEmail(summary, daily, recipient);

console.log(`Weekly report email sent for week of ${weekStart} (${from}..${to}) to ${recipient}`);
process.exit(0);
