import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { apiHandler, json, readJson } from "@/lib/api";
import { siteConfig } from "@/lib/config";
import { emailShell, sendEmail } from "@/lib/email";
import { sha256 } from "@/lib/ids";
import { forgotPasswordSchema } from "@/lib/validation";

const GENERIC = { ok: true, message: "If an account exists for that email, a reset link is on its way." };

export const POST = apiHandler(
  async (req) => {
    const { email } = forgotPasswordSchema.parse(await readJson(req));
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const token = randomBytes(32).toString("base64url");
      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
      });
      const link = `${siteConfig.url}/reset-password?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: email,
        subject: "Reset your Beadsy password",
        text: `Reset your password (valid for 1 hour): ${link}\nIf you didn't ask for this, you can ignore this email.`,
        html: emailShell(
          "Reset your password",
          `<p>Tap the button below to choose a new password. The link works for one hour.</p>
           <p><a href="${link}" style="background:#6B4A82;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Choose a new password</a></p>
           <p style="font-size:12px;color:#6E5F7A">If you didn't ask for this, you can safely ignore this email.</p>`,
        ),
      });
    }
    // Same response whether or not the account exists (prevents account enumeration).
    return json(GENERIC);
  },
  { rateLimit: { name: "forgot", max: 5, windowMs: 60 * 60_000 } },
);
