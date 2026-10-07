import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = addressSchema.extend({ isDefault: z.boolean().optional() });

async function ownAddress(userId: string, id: string) {
  const a = await db.address.findFirst({ where: { id, userId } }); // userId in the filter = ownership check
  if (!a) throw new HttpError(404, "Address not found");
  return a;
}

export const PUT = apiHandler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownAddress(user.id, id);
  const input = updateSchema.parse(await readJson(req));
  const address = await db.$transaction(async (tx) => {
    if (input.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return tx.address.update({
      where: { id },
      data: {
        label: input.label || null,
        fullName: input.fullName,
        phone: input.phone,
        line1: input.line1,
        line2: input.line2 || null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
    });
  });
  return json({ address });
});

export const DELETE = apiHandler(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const a = await ownAddress(user.id, id);
  await db.address.delete({ where: { id } });
  if (a.isDefault) {
    const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return json({ ok: true });
});
