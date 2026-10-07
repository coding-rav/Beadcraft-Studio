import { Prisma, type PaymentProvider } from "@prisma/client";
import { db } from "./db";

/**
 * Runs `fn` at most once per (provider, eventId).
 * - A duplicate delivery of an already-processed event is acknowledged without side effects.
 * - If processing throws, the claim is released so the provider's retry can succeed.
 */
export async function withWebhookIdempotency(
  provider: PaymentProvider,
  eventId: string,
  type: string,
  fn: () => Promise<void>,
): Promise<"processed" | "duplicate"> {
  try {
    await db.webhookEvent.create({ data: { provider, eventId, type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "duplicate";
    throw err;
  }
  try {
    await fn();
    return "processed";
  } catch (err) {
    await db.webhookEvent.deleteMany({ where: { provider, eventId } });
    throw err;
  }
}
