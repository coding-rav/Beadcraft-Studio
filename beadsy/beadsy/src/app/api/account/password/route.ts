import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { hashPassword, requireUser, startSession, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";

export const POST = apiHandler(
  async (req) => {
    const current = await requireUser();
    const { currentPassword, newPassword } = changePasswordSchema.parse(await readJson(req));
    const user = await db.user.findUnique({ where: { id: current.id } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(400, "Your current password is incorrect.", "BAD_PASSWORD");
    }
    const updated = await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    await startSession(updated); // other devices are signed out (the hash fingerprint changed); this one stays signed in
    return json({ ok: true });
  },
  { rateLimit: { name: "password", max: 8, windowMs: 15 * 60_000 } },
);
