import { db } from "./db";

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export async function revenueByDay(days: number): Promise<{ label: string; value: number }[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const orders = await db.order.findMany({
    where: { status: { in: [...PAID_STATUSES] }, paidAt: { gte: since } },
    select: { paidAt: true, totalCents: true },
  });
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of orders) {
    if (!o.paidAt) continue;
    const k = new Date(o.paidAt.getFullYear(), o.paidAt.getMonth(), o.paidAt.getDate(), 12).toISOString().slice(0, 10);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + o.totalCents);
  }
  return [...buckets.entries()].map(([k, value]) => ({ label: new Date(k).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value }));
}

export async function lowStockVariants(limit = 50) {
  return db.$queryRaw<{ id: string; name: string; sku: string; productName: string; available: number; threshold: number }[]>`
    SELECT v."id", v."name", v."sku", p."name" AS "productName",
           (i."quantity" - i."reserved")::int AS "available", i."lowStockThreshold"::int AS "threshold"
    FROM "Inventory" i
    JOIN "ProductVariant" v ON v."id" = i."variantId"
    JOIN "Product" p ON p."id" = v."productId"
    WHERE v."isActive" = TRUE AND p."isActive" = TRUE AND (i."quantity" - i."reserved") <= i."lowStockThreshold"
    ORDER BY (i."quantity" - i."reserved") ASC
    LIMIT ${limit}`;
}

export { PAID_STATUSES };
