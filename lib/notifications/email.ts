import { Resend } from "resend";

export interface NotificationItem {
  emoji: string;
  title: string;
  detail: string;
}

const BRAND = {
  bg: "#0F0F13",
  card: "#1A1A24",
  border: "#2A2A3A",
  primary: "#6C63FF",
  text: "#F0F0F5",
  textDim: "#8888A0",
};

/** Clean HTML email matching the app's dark design. */
export function renderDigestEmail(name: string, items: NotificationItem[]): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid ${BRAND.border};">
          <div style="font-size:15px;font-weight:600;color:${BRAND.text};margin:0 0 3px;">
            ${item.emoji}&nbsp; ${escapeHtml(item.title)}
          </div>
          <div style="font-size:13px;color:${BRAND.textDim};margin:0;">
            ${escapeHtml(item.detail)}
          </div>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding:0 4px 18px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${BRAND.primary};margin-right:8px;"></span>
          <span style="font-size:18px;font-weight:700;color:${BRAND.text};letter-spacing:-0.3px;">Pulse</span>
        </td></tr>
        <tr><td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:20px 18px 6px;">
              <div style="font-size:16px;font-weight:600;color:${BRAND.text};">Hey ${escapeHtml(name)} 👋</div>
              <div style="font-size:13px;color:${BRAND.textDim};margin-top:4px;">Here's what needs your attention today.</div>
            </td></tr>
            ${rows}
            <tr><td style="padding:16px 18px;">
              <a href="https://pulse.app/dashboard" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:12px;">Open Pulse</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 4px;font-size:11px;color:${BRAND.textDim};">
          You're getting this because notifications are enabled in Pulse. Turn them off anytime in Settings.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Send the daily digest email via Resend. No-ops if not configured. */
export async function sendDigestEmail(
  to: string,
  name: string,
  items: NotificationItem[]
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || items.length === 0) return;

  const resend = new Resend(apiKey);
  const first = items[0];
  const subject =
    items.length === 1 && first
      ? `${first.emoji} ${first.title}`
      : `⚡ ${items.length} things need your attention`;

  try {
    await resend.emails.send({
      from: "Pulse <onboarding@resend.dev>",
      to,
      subject,
      html: renderDigestEmail(name, items),
    });
  } catch {
    // Email is best-effort backup for push — never crash the cron on failure.
  }
}
