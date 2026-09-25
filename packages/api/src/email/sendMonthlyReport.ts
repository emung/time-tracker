import { Resend } from "resend";
import type { WeeklySummary } from "../reports/weekly";
import type { WeekBreakdown } from "../reports/monthly";
import {
  buildReportHtml,
  buildReportText,
  formatDateLabel,
  type ReportContent,
} from "./reportLayout";

function formatMonthLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekLabel(w: WeekBreakdown): string {
  return w.from === w.to
    ? formatDateLabel(w.from)
    : `${formatDateLabel(w.from)} – ${formatDateLabel(w.to)}`;
}

function buildContent(summary: WeeklySummary, weeks: WeekBreakdown[]): ReportContent {
  return {
    kicker: "Monthly Time Report",
    heading: formatMonthLabel(summary.from),
    summary,
    summaryTitle: "Monthly Summary",
    breakdownTitle: "Weekly Breakdown",
    sections: weeks.map((w) => ({
      label: formatWeekLabel(w),
      projects: w.projects,
      totalSeconds: w.totalSeconds,
    })),
    sectionTotalLabel: "Week total",
    footer: "Sent automatically on the last day of every month by your time tracker.",
  };
}

export async function sendMonthlyReportEmail(
  summary: WeeklySummary,
  weeks: WeekBreakdown[],
  to: string,
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const content = buildContent(summary, weeks);

  await resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM!,
    to,
    subject: `Monthly Time Report — ${formatMonthLabel(summary.from)}`,
    text: buildReportText(content),
    html: buildReportHtml(content),
  });
}
