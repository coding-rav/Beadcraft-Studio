import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, json, readJson } from "@/lib/api";
import { cancelPendingOrder } from "@/lib/orders";

const schema = z.object({ number: z.string().min(3).max(20), token: z.string().min(10).max(100) });

/** Customer backed out of the payment page: release the held stock (only works for unpaid orders). */
export const POST = apiHandler(
  async (req) => {
    const { number, token } = schema.parse(await readJson(req));
    const order = await db.order.findFirst({ where: { number, accessToken: token }, select: { id: true } });
    if (order) await cancelPendingOrder(order.id, "Cancelled by customer");
    return json({ ok: true });
  },
  { rateLimit: { name: "checkout-cancel", max: 20, windowMs: 10 * 60_000 } },
);
