import type { ProjectSummary } from "../reports/weekly";
import { formatDuration } from "../reports/weekly";

const ACCENT = "#3B82F6";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const PANEL = "#f8fafc";

/** One labelled block of the breakdown (a day in the weekly email, a week in the monthly one). */
export interface BreakdownSection {
  label: string;
  projects: ProjectSummary[];
  totalSeconds: number;
}

export interface ReportContent {
  kicker: string;
  heading: string;
  summary: { projects: ProjectSummary[]; totalSeconds: number };
  summaryTitle: string;
  breakdownTitle: string;
  sections: BreakdownSection[];
  sectionTotalLabel: string;
  footer: string;
}

export function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildReportText(content: ReportContent): string {
  const summaryLines = content.summary.projects.map(
    (p) => `${p.name}: ${formatDuration(p.total_seconds)}`,
  );

  const sectionLines = content.sections.flatMap((s) => {
    if (s.projects.length === 0) {
      return [s.label, "  No time tracked", ""];
    }
    return [
      s.label,
      ...s.projects.map((p) => `  ${p.name}: ${formatDuration(p.total_seconds)}`),
      `  ${content.sectionTotalLabel}: ${formatDuration(s.totalSeconds)}`,
      "",
    ];
  });

  return [
    content.summaryTitle.toUpperCase(),
    ...summaryLines,
    "",
    `Total: ${formatDuration(content.summary.totalSeconds)}`,
    "",
    content.breakdownTitle.toUpperCase(),
    ...sectionLines,
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

function buildSection(s: BreakdownSection, totalLabel: string): string {
  const body =
    s.projects.length === 0
      ? `<tr><td colspan="2" style="padding:6px 0; font-size:13px; color:${MUTED}; font-style:italic;">No time tracked</td></tr>`
      : `${s.projects.map((p) => projectRow(p)).join("")}
         <tr>
           <td style="padding:6px 0 2px; font-size:13px; color:${MUTED}; border-top:1px solid ${BORDER};">${totalLabel}</td>
           <td style="padding:6px 0 2px; font-size:13px; color:${MUTED}; font-weight:600; text-align:right; border-top:1px solid ${BORDER};">${formatDuration(s.totalSeconds)}</td>
         </tr>`;

  return `
    <tr>
      <td style="padding-top:18px;">
        <div style="font-size:13px; font-weight:600; color:${MUTED}; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px;">
          ${s.label}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${body}
        </table>
      </td>
    </tr>`;
}

export function buildReportHtml(content: ReportContent): string {
  const summaryRows = content.summary.projects.map((p) => projectRow(p)).join("");
  const sections = content.sections
    .map((s) => buildSection(s, content.sectionTotalLabel))
    .join("");

  return `
<div style="background-color:#f1f5f9; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid ${BORDER};">
    <tr>
      <td style="height:4px; background-color:${ACCENT};"></td>
    </tr>
    <tr>
      <td style="padding:28px 32px 8px;">
        <div style="font-size:12px; font-weight:600; color:${ACCENT}; text-transform:uppercase; letter-spacing:0.06em;">${content.kicker}</div>
        <div style="font-size:20px; font-weight:700; color:${TEXT}; margin-top:4px;">
          ${content.heading}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${summaryRows}
          <tr>
            <td style="padding:10px 0 0; font-size:14px; font-weight:700; color:${TEXT}; border-top:1px solid ${BORDER};">Total</td>
            <td style="padding:10px 0 0; font-size:14px; font-weight:700; color:${TEXT}; text-align:right; border-top:1px solid ${BORDER};">${formatDuration(content.summary.totalSeconds)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px 4px;">
        <div style="font-size:12px; font-weight:600; color:${MUTED}; text-transform:uppercase; letter-spacing:0.06em; border-top:1px solid ${BORDER}; padding-top:16px;">${content.breakdownTitle}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${sections}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px; background-color:${PANEL}; font-size:12px; color:${MUTED};">
        ${content.footer}
      </td>
    </tr>
  </table>
</div>`;
}
