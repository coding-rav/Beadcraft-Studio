import { db } from "@/lib/db";
import { apiHandler, json, readJson } from "@/lib/api";
import { hashPassword, startSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export const POST = apiHandler(
  async (req) => {
    const input = registerSchema.parse(await readJson(req));
    const exists = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (exists) return json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });

    const user = await db.user.create({
      data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
    });
    await startSession(user);
    return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  },
  { rateLimit: { name: "register", max: 8, windowMs: 15 * 60_000 } },
);
