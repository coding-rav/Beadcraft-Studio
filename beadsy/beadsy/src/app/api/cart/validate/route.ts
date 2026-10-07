import { apiHandler, json, readJson } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { validateCart } from "@/lib/cart";
import { cartValidateSchema } from "@/lib/validation";

/**
 * Prices a cart from the database. The browser sends only variant ids + quantities
 * (+ optional coupon code and delivery method); every amount in the response is computed here.
 */
export const POST = apiHandler(
  async (req) => {
    const input = cartValidateSchema.parse(await readJson(req));
    const session = await getSession();
    const { couponRecord: _couponRecord, ...result } = await validateCart({
      items: input.items,
      couponCode: input.couponCode,
      delivery: input.delivery,
      userId: session?.sub ?? null,
      email: input.email ?? session?.email ?? null,
    });
    return json(result);
  },
  { rateLimit: { name: "cart-validate", max: 120, windowMs: 60_000 } },
);
