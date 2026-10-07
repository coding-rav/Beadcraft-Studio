import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validation";

const MAX_ADDRESSES = 10;
const createSchema = addressSchema.extend({ isDefault: z.boolean().optional() });

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return json({ addresses });
});

export const POST = apiHandler(
  async (req) => {
    const user = await requireUser();
    const input = createSchema.parse(await readJson(req));
    const count = await db.address.count({ where: { userId: user.id } });
    if (count >= MAX_ADDRESSES) throw new HttpError(400, `You can save up to ${MAX_ADDRESSES} addresses.`);
    const makeDefault = count === 0 || input.isDefault === true;
    const address = await db.$transaction(async (tx) => {
      if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      return tx.address.create({
        data: {
          userId: user.id,
          label: input.label || null,
          fullName: input.fullName,
          phone: input.phone,
          line1: input.line1,
          line2: input.line2 || null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
          isDefault: makeDefault,
        },
      });
    });
    return json({ address }, { status: 201 });
  },
  { rateLimit: { name: "address", max: 40, windowMs: 10 * 60_000 } },
);
