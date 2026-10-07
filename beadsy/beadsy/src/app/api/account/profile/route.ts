import { db } from "@/lib/db";
import { apiHandler, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validation";

export const PUT = apiHandler(
  async (req) => {
    const user = await requireUser();
    const input = profileSchema.parse(await readJson(req));
    const updated = await db.user.update({
      where: { id: user.id },
      data: { name: input.name, phone: input.phone || null },
      select: { id: true, name: true, email: true, phone: true },
    });
    return json({ user: updated });
  },
  { rateLimit: { name: "profile", max: 30, windowMs: 10 * 60_000 } },
);
