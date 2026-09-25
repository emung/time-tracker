import { Resend } from "resend";
import type { DailyBreakdown, WeeklySummary } from "../reports/weekly";
import {
  buildReportHtml,
  buildReportText,
  formatDateLabel,
  type ReportContent,
} from "./reportLayout";

function formatDayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildSubject(summary: WeeklySummary): string {
  return `Weekly Time Report — ${formatDateLabel(summary.from)}–${formatDateLabel(summary.to)}`;
}

function buildContent(summary: WeeklySummary, daily: DailyBreakdown[]): ReportContent {
  return {
    kicker: "Weekly Time Report",
    heading: `${formatDateLabel(summary.from)} – ${formatDateLabel(summary.to)}`,
    summary,
    summaryTitle: "Weekly Summary",
    breakdownTitle: "Daily Breakdown",
    sections: daily.map((d) => ({
      label: formatDayLabel(d.day),
      projects: d.projects,
      totalSeconds: d.totalSeconds,
    })),
    sectionTotalLabel: "Day total",
    footer: "Sent automatically every Friday by your time tracker.",
  };
}

export async function sendWeeklyReportEmail(
  summary: WeeklySummary,
  daily: DailyBreakdown[],
  to: string,
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const content = buildContent(summary, daily);

  await resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM!,
    to,
    subject: buildSubject(summary),
    text: buildReportText(content),
    html: buildReportHtml(content),
  });
}
