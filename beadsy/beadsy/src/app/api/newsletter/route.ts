import { db } from "@/lib/db";
import { apiHandler, json, readJson } from "@/lib/api";
import { newsletterSchema } from "@/lib/validation";

export const POST = apiHandler(
  async (req) => {
    const { email } = newsletterSchema.parse(await readJson(req));
    await db.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: {} });
    // Identical response for new and existing subscribers.
    return json({ ok: true, message: "You're on the list! 💜" }, { status: 201 });
  },
  { rateLimit: { name: "newsletter", max: 6, windowMs: 60 * 60_000 } },
);
