import { siteConfig } from "./config";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends email through Resend's REST API when RESEND_API_KEY is set.
 * In development without a key the message is logged so flows can be tested.
 * In production without a key it is skipped (and a warning logged) — it never throws,
 * so an email outage can't break checkout or password reset.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    } else {
      console.warn("[email] RESEND_API_KEY not set — email not sent");
    }
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${siteConfig.name} <onboarding@resend.dev>`,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) console.error(`[email] provider responded ${res.status}`);
  } catch {
    console.error("[email] failed to reach provider");
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function emailShell(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#FDF7EE;color:#3A2749">
  <h1 style="font-size:24px;color:#6B4A82;margin:0 0 4px">${escapeHtml(siteConfig.name)}</h1>
  <p style="margin:0 0 20px;color:#84609A;font-size:13px">${escapeHtml(siteConfig.tagline)}</p>
  <h2 style="font-size:18px">${escapeHtml(title)}</h2>
  ${bodyHtml}
</div>`;
}
