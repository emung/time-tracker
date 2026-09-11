import sql from "../db";

const SETTING_KEY = "report_recipient_email";

export async function getReportRecipient(): Promise<string> {
  const rows = await sql<{ value: string }[]>`
    SELECT value FROM app_settings WHERE key = ${SETTING_KEY}
  `;

  return rows[0]?.value ?? process.env.REPORT_EMAIL_TO ?? "";
}

export async function setReportRecipient(email: string): Promise<void> {
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${SETTING_KEY}, ${email}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${email}, updated_at = now()
  `;
}
