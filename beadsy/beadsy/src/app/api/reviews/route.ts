import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { reviewSchema } from "@/lib/validation";

export const POST = apiHandler(
  async (req) => {
    const user = await requireUser();
    const input = reviewSchema.parse(await readJson(req));

    const product = await db.product.findFirst({ where: { id: input.productId, isActive: true }, select: { id: true } });
    if (!product) throw new HttpError(404, "Product not found");

    const purchased = await db.orderItem.findFirst({
      where: {
        productId: product.id,
        order: { userId: user.id, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      },
      select: { id: true },
    });

    try {
      await db.review.create({
        data: {
          productId: product.id,
          userId: user.id,
          rating: input.rating,
          title: input.title,
          body: input.body,
          verifiedPurchase: Boolean(purchased),
          status: "PENDING", // every review is moderated before it appears
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, "You've already reviewed this product.", "DUPLICATE_REVIEW");
      }
      throw err;
    }
    return json({ ok: true, message: "Thanks! Your review will appear once it has been approved." }, { status: 201 });
  },
  { rateLimit: { name: "review", max: 10, windowMs: 60 * 60_000 } },
);
