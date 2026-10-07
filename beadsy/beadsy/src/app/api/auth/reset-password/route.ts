import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { sha256 } from "@/lib/ids";
import { resetPasswordSchema } from "@/lib/validation";

export const POST = apiHandler(
  async (req) => {
    const { token, password } = resetPasswordSchema.parse(await readJson(req));
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new HttpError(400, "This reset link is invalid or has expired. Please request a new one.", "BAD_TOKEN");
    }
    const passwordHash = await hashPassword(password);
    await db.$transaction([
      // Changing the hash also revokes every existing session (the session carries a hash fingerprint).
      db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      db.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
    ]);
    return json({ ok: true });
  },
  { rateLimit: { name: "reset", max: 10, windowMs: 60 * 60_000 } },
);
