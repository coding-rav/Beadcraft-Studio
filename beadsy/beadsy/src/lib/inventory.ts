import type { Prisma } from "@prisma/client";
import { HttpError } from "./api";

type Tx = Prisma.TransactionClient;

export interface StockLine {
  variantId: string;
  quantity: number;
}

function sorted(lines: StockLine[]): StockLine[] {
  // Always lock rows in the same order to avoid deadlocks between concurrent checkouts.
  return [...lines].sort((a, b) => (a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0));
}

/**
 * Atomically reserves stock. The conditional UPDATE (quantity - reserved >= n) is
 * evaluated by Postgres under a row lock, so two concurrent checkouts can never
 * both take the last unit.
 */
export async function reserveStock(tx: Tx, lines: StockLine[]): Promise<void> {
  for (const l of sorted(lines)) {
    const affected = await tx.$executeRaw`
      UPDATE "Inventory"
      SET "reserved" = "reserved" + ${l.quantity}, "updatedAt" = NOW()
      WHERE "variantId" = ${l.variantId} AND ("quantity" - "reserved") >= ${l.quantity}`;
    if (affected !== 1) {
      throw new HttpError(409, "Sorry — one of the items just sold out or has limited stock. Please review your cart.", "OUT_OF_STOCK", {
        variantId: l.variantId,
      });
    }
  }
}

/** Returns reserved units to the shelf (payment failed / cancelled / expired). */
export async function releaseStock(tx: Tx, lines: StockLine[]): Promise<void> {
  for (const l of sorted(lines)) {
    await tx.$executeRaw`
      UPDATE "Inventory"
      SET "reserved" = GREATEST("reserved" - ${l.quantity}, 0), "updatedAt" = NOW()
      WHERE "variantId" = ${l.variantId}`;
  }
}

/** Converts reserved units into sold units after a confirmed payment. Returns variantIds that could not be fulfilled. */
export async function commitStock(tx: Tx, lines: StockLine[], wasReleased: boolean): Promise<string[]> {
  const shortfalls: string[] = [];
  for (const l of sorted(lines)) {
    const affected = wasReleased
      ? // reservation was already released (e.g. expired): take straight from free stock if any is left
        await tx.$executeRaw`
          UPDATE "Inventory"
          SET "quantity" = "quantity" - ${l.quantity}, "sold" = "sold" + ${l.quantity}, "updatedAt" = NOW()
          WHERE "variantId" = ${l.variantId} AND ("quantity" - "reserved") >= ${l.quantity}`
      : await tx.$executeRaw`
          UPDATE "Inventory"
          SET "quantity" = "quantity" - ${l.quantity},
              "reserved" = GREATEST("reserved" - ${l.quantity}, 0),
              "sold" = "sold" + ${l.quantity},
              "updatedAt" = NOW()
          WHERE "variantId" = ${l.variantId} AND "quantity" >= ${l.quantity}`;
    if (affected !== 1) shortfalls.push(l.variantId);
  }
  return shortfalls;
}

/** Re-computes the denormalised Product.inStock flag from variant inventory. */
export async function refreshProductStock(tx: Tx, productIds: string[]): Promise<void> {
  const unique = [...new Set(productIds)];
  for (const id of unique) {
    await tx.$executeRaw`
      UPDATE "Product" p
      SET "inStock" = EXISTS (
        SELECT 1 FROM "ProductVariant" v
        JOIN "Inventory" i ON i."variantId" = v."id"
        WHERE v."productId" = p."id" AND v."isActive" = TRUE AND (i."quantity" - i."reserved") > 0
      )
      WHERE p."id" = ${id}`;
  }
}
