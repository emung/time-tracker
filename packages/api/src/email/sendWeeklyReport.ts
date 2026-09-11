import { Resend } from "resend";
import type { DailyBreakdown, ProjectSummary, WeeklySummary } from "../reports/weekly";
import { formatDuration } from "../reports/weekly";

const ACCENT = "#3B82F6";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const PANEL = "#f8fafc";

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

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

function buildText(summary: WeeklySummary, daily: DailyBreakdown[]): string {
  const summaryLines = summary.projects.map(
    (p) => `${p.name}: ${formatDuration(p.total_seconds)}`,
  );

  const dailyLines = daily.flatMap((d) => {
    const header = `${formatDayLabel(d.day)}`;
    if (d.projects.length === 0) {
      return [header, "  No time tracked", ""];
    }
    return [
      header,
      ...d.projects.map((p) => `  ${p.name}: ${formatDuration(p.total_seconds)}`),
      `  Day total: ${formatDuration(d.totalSeconds)}`,
      "",
    ];
  });

  return [
    "WEEKLY SUMMARY",
    ...summaryLines,
    "",
    `Total: ${formatDuration(summary.totalSeconds)}`,
    "",
    "DAILY BREAKDOWN",
    ...dailyLines,
  ].join("\n");
}

function projectRow(p: ProjectSummary, { bold = false }: { bold?: boolean } = {}): string {
  const weight = bold ? "600" : "400";
  return `
    <tr>
      <td style="padding:6px 0; font-size:14px; color:${TEXT}; font-weight:${weight};">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${p.color}; margin-right:8px;"></span>${p.name}
      </td>
      <td style="padding:6px 0; font-size:14px; color:${TEXT}; font-weight:${weight}; text-align:right;">
        ${formatDuration(p.total_seconds)}
      </td>
    </tr>`;
}

function buildDaySection(d: DailyBreakdown): string {
  const body =
    d.projects.length === 0
      ? `<tr><td colspan="2" style="padding:6px 0; font-size:13px; color:${MUTED}; font-style:italic;">No time tracked</td></tr>`
      : `${d.projects.map((p) => projectRow(p)).join("")}
         <tr>
           <td style="padding:6px 0 2px; font-size:13px; color:${MUTED}; border-top:1px solid ${BORDER};">Day total</td>
           <td style="padding:6px 0 2px; font-size:13px; color:${MUTED}; font-weight:600; text-align:right; border-top:1px solid ${BORDER};">${formatDuration(d.totalSeconds)}</td>
         </tr>`;

  return `
    <tr>
      <td style="padding-top:18px;">
        <div style="font-size:13px; font-weight:600; color:${MUTED}; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px;">
          ${formatDayLabel(d.day)}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${body}
        </table>
      </td>
    </tr>`;
}

function buildHtml(summary: WeeklySummary, daily: DailyBreakdown[]): string {
  const summaryRows = summary.projects.map((p) => projectRow(p)).join("");
  const dailySections = daily.map((d) => buildDaySection(d)).join("");

  return `
<div style="background-color:#f1f5f9; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid ${BORDER};">
    <tr>
      <td style="height:4px; background-color:${ACCENT};"></td>
    </tr>
    <tr>
      <td style="padding:28px 32px 8px;">
        <div style="font-size:12px; font-weight:600; color:${ACCENT}; text-transform:uppercase; letter-spacing:0.06em;">Weekly Time Report</div>
        <div style="font-size:20px; font-weight:700; color:${TEXT}; margin-top:4px;">
          ${formatDateLabel(summary.from)} – ${formatDateLabel(summary.to)}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${summaryRows}
          <tr>
            <td style="padding:10px 0 0; font-size:14px; font-weight:700; color:${TEXT}; border-top:1px solid ${BORDER};">Total</td>
            <td style="padding:10px 0 0; font-size:14px; font-weight:700; color:${TEXT}; text-align:right; border-top:1px solid ${BORDER};">${formatDuration(summary.totalSeconds)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px 4px;">
        <div style="font-size:12px; font-weight:600; color:${MUTED}; text-transform:uppercase; letter-spacing:0.06em; border-top:1px solid ${BORDER}; padding-top:16px;">Daily Breakdown</div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${dailySections}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px; background-color:${PANEL}; font-size:12px; color:${MUTED};">
        Sent automatically every Friday by your time tracker.
      </td>
    </tr>
  </table>
</div>`;
}

export async function sendWeeklyReportEmail(
  summary: WeeklySummary,
  daily: DailyBreakdown[],
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM!,
    to: process.env.REPORT_EMAIL_TO!,
    subject: buildSubject(summary),
    text: buildText(summary, daily),
    html: buildHtml(summary, daily),
  });
}
