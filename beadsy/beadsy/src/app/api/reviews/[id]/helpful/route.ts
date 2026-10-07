import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiHandler, HttpError, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** Toggles the signed-in user's "helpful" vote on an approved review. */
export const POST = apiHandler(
  async (_req, ctx: Ctx) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const review = await db.review.findFirst({ where: { id, status: "APPROVED" }, select: { id: true, userId: true } });
    if (!review) throw new HttpError(404, "Review not found");
    if (review.userId === user.id) throw new HttpError(400, "You can't vote on your own review.");

    let helpful = true;
    try {
      await db.$transaction([
        db.reviewHelpful.create({ data: { reviewId: id, userId: user.id } }),
        db.review.update({ where: { id }, data: { helpfulCount: { increment: 1 } } }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        helpful = false;
        await db.$transaction([
          db.reviewHelpful.deleteMany({ where: { reviewId: id, userId: user.id } }),
          db.review.update({ where: { id }, data: { helpfulCount: { decrement: 1 } } }),
        ]);
      } else {
        throw err;
      }
    }
    const updated = await db.review.findUnique({ where: { id }, select: { helpfulCount: true } });
    return json({ helpful, count: Math.max(updated?.helpfulCount ?? 0, 0) });
  },
  { rateLimit: { name: "helpful", max: 60, windowMs: 60_000 } },
);
