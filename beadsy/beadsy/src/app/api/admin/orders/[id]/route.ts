import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { orderUpdateSchema } from "@/lib/admin-validation";
import { refreshProductStock } from "@/lib/inventory";
import { cancelPendingOrder } from "@/lib/orders";
import type { OrderStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// Which manual status changes make sense. PENDING→PAID is deliberately absent:
// only a verified payment callback may mark an order paid.
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export const PATCH = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const input = orderUpdateSchema.parse(await readJson(req));
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new HttpError(404, "Order not found");

  if (input.status && input.status !== order.status) {
    if (!ALLOWED[order.status].includes(input.status)) {
      throw new HttpError(400, `An order that is ${order.status.toLowerCase()} can't be changed to ${input.status.toLowerCase()}.`, "BAD_TRANSITION");
    }
    if (order.status === "PENDING" && input.status === "CANCELLED") {
      await cancelPendingOrder(order.id, "Cancelled by admin");
    } else {
      await db.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: { status: input.status! } });
        if (input.status === "REFUNDED") await tx.payment.updateMany({ where: { orderId: id, status: "SUCCEEDED" }, data: { status: "REFUNDED" } });
        if (input.restock && (input.status === "CANCELLED" || input.status === "REFUNDED")) {
          for (const item of order.items) {
            if (!item.variantId) continue;
            await tx.inventory.updateMany({ where: { variantId: item.variantId }, data: { quantity: { increment: item.quantity }, sold: { decrement: item.quantity } } });
            if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { soldCount: { decrement: item.quantity } } });
          }
          await refreshProductStock(tx, order.items.map((i) => i.productId).filter((x): x is string => Boolean(x)));
        }
      });
      if (input.restock) revalidateTag("catalog");
    }
  }

  if (input.trackingNumber !== undefined || input.internalNote !== undefined) {
    await db.order.update({
      where: { id },
      data: {
        ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber || null } : {}),
        ...(input.internalNote !== undefined ? { internalNote: input.internalNote || null } : {}),
      },
    });
  }
  return json({ ok: true });
});
