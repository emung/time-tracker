import { Hono } from "hono";
import { getCurrentWeekRange, getDailyBreakdown, getWeeklySummary } from "../reports/weekly";
import { sendWeeklyReportEmail } from "../email/sendWeeklyReport";
import { getReportRecipient } from "../settings/reportRecipient";

const app = new Hono();

app.get("/api/reports/summary", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) {
    return c.json({ error: "from and to params required" }, 400);
  }

  const { projects } = await getWeeklySummary(from, to);

  return c.json(projects);
});

app.post("/api/reports/send-weekly", async (c) => {
  const timezone = process.env.REPORT_TIMEZONE ?? "Europe/Bucharest";
  const { from, to } = getCurrentWeekRange(timezone);
  const recipient = await getReportRecipient();

  if (!recipient) {
    return c.json({ error: "no report recipient configured" }, 400);
  }

  try {
    const summary = await getWeeklySummary(from, to);
    const daily = await getDailyBreakdown(from, to);
    await sendWeeklyReportEmail(summary, daily, recipient);
    return c.json({ sent: true, to: recipient });
  } catch (err) {
    console.error("Failed to send weekly report email:", err);
    return c.json({ error: "failed to send email" }, 500);
  }
});

export default app;
