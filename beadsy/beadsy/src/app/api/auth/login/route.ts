import { db } from "@/lib/db";
import { apiHandler, json, readJson } from "@/lib/api";
import { burnPasswordCheck, startSession, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export const POST = apiHandler(
  async (req) => {
    const input = loginSchema.parse(await readJson(req));

    // Per-account throttle on top of the per-IP one (slows credential stuffing).
    const acct = rateLimit(`login-acct:${input.email}`, 8, 15 * 60_000);
    if (!acct.ok) {
      return json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429, headers: { "Retry-After": String(acct.retryAfterSeconds) } });
    }

    const user = await db.user.findUnique({ where: { email: input.email } });
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : await burnPasswordCheck(input.password);
    if (!user || !valid) return json({ error: "Incorrect email or password." }, { status: 401 });

    await startSession(user);
    return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  },
  { rateLimit: { name: "login", max: 20, windowMs: 15 * 60_000 } },
);
