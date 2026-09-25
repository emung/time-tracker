import { getWeeklySummary } from "../reports/weekly";
import { getCurrentMonthRange, getWeeklyBreakdown } from "../reports/monthly";
import { sendMonthlyReportEmail } from "../email/sendMonthlyReport";
import { getReportRecipient } from "../settings/reportRecipient";

const timezone = process.env.REPORT_TIMEZONE ?? "Europe/Bucharest";
const { from, to, monthStart } = getCurrentMonthRange(timezone);

const summary = await getWeeklySummary(from, to);
const weeks = await getWeeklyBreakdown(from, to);
const recipient = await getReportRecipient();
await sendMonthlyReportEmail(summary, weeks, recipient);

console.log(`Monthly report email sent for month of ${monthStart} (${from}..${to}) to ${recipient}`);
process.exit(0);
