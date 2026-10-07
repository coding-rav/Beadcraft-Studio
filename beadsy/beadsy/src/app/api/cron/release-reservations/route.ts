import { timingSafeEqual } from "node:crypto";
import { apiHandler, HttpError, json } from "@/lib/api";
import { expireStaleOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Vercel Cron: releases stock held by unpaid orders whose reservation expired. */
export const GET = apiHandler(async (req) => {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, "Unauthorized");
  const released = await expireStaleOrders(200);
  return json({ released });
});
