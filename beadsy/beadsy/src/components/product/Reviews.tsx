import { db } from "@/lib/db";
import { getReviewSummary } from "@/lib/catalog";
import { formatDate } from "@/lib/utils";
import { Stars } from "@/components/ui/Stars";
import { HelpfulButton, ReviewForm } from "./ReviewForm";

export async function Reviews({ productId, productName, avg, count }: { productId: string; productName: string; avg: number; count: number }) {
  const [reviews, dist] = await Promise.all([
    db.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { user: { select: { name: true } } },
    }),
    getReviewSummary(productId),
  ]);

  return (
    <section id="reviews" aria-labelledby="reviews-h" className="mt-16 scroll-mt-28 sm:mt-24">
      <h2 id="reviews-h" className="section-title mb-6">Customer reviews</h2>
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="card p-6">
            {count > 0 ? (
              <>
                <p className="font-display text-5xl font-semibold">{avg.toFixed(1)}</p>
                <Stars rating={avg} size={20} className="mt-1" />
                <p className="mt-1 text-sm text-muted">Based on {count} {count === 1 ? "review" : "reviews"}</p>
                <ul className="mt-5 space-y-2" aria-label="Rating distribution">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const c = dist[n] ?? 0;
                    const pct = count ? Math.round((c / count) * 100) : 0;
                    return (
                      <li key={n} className="flex items-center gap-2 text-sm">
                        <span className="w-12 shrink-0 font-semibold">{n} star</span>
                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-plum-100" aria-hidden="true">
                          <span className="block h-full rounded-full bg-sun-500" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="w-8 text-right text-muted">{c}</span>
                        <span className="sr-only">{pct} percent</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold">No reviews yet</p>
                <p className="mt-1 text-sm text-muted">Bought {productName}? Be the first to share how it looks on you.</p>
              </>
            )}
          </div>
          <ReviewForm productId={productId} />
        </div>

        <div>
          {reviews.length === 0 ? (
            <div className="card grid place-items-center p-10 text-center text-muted">Reviews will show up here once they've been approved.</div>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={r.rating} />
                    {r.verifiedPurchase && <span className="badge bg-mint-100 text-mint-700">✓ Verified purchase</span>}
                  </div>
                  <h3 className="mt-2 font-sans text-lg font-bold">{r.title}</h3>
                  <p className="mt-1.5 whitespace-pre-line text-plum-800">{r.body}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                    <span>
                      <strong className="text-plum-900">{r.user.name.split(" ")[0]}</strong> · {formatDate(r.createdAt)}
                    </span>
                    <HelpfulButton reviewId={r.id} initial={r.helpfulCount} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
