import { Hono } from "hono";
import { getReportRecipient, setReportRecipient } from "../settings/reportRecipient";

const app = new Hono();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.get("/api/settings/report-recipient", async (c) => {
  const email = await getReportRecipient();
  return c.json({ email });
});

app.patch("/api/settings/report-recipient", async (c) => {
  const { email } = await c.req.json<{ email: string }>();

  if (!email?.trim() || !EMAIL_RE.test(email.trim())) {
    return c.json({ error: "a valid email is required" }, 400);
  }

  await setReportRecipient(email.trim());
  return c.json({ email: email.trim() });
});

export default app;
