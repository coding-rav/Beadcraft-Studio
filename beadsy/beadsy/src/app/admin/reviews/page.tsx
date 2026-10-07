import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { ReviewActions } from "@/components/admin/AdminForms";
import { PageHead } from "@/components/admin/AdminUI";
import { Stars } from "@/components/ui/Stars";

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (["PENDING", "APPROVED", "REJECTED"] as const).find((s) => s === sp.status) ?? "PENDING";
  const reviews = await db.review.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true, email: true } }, product: { select: { name: true, slug: true } } } });
  return (
    <div>
      <PageHead title="Reviews" />
      <div className="mb-4 flex gap-2">{(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => <Link key={s} href={`/admin/reviews?status=${s}`} className="chip" aria-pressed={status === s}>{s.charAt(0) + s.slice(1).toLowerCase()}</Link>)}</div>
      {reviews.length === 0 ? <div className="card p-10 text-center text-muted">No {status.toLowerCase()} reviews.</div> : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="card space-y-2 p-5">
              <div className="flex flex-wrap items-center gap-3"><Stars rating={r.rating} />{r.verifiedPurchase && <span className="badge bg-mint-100 text-mint-700">Verified</span>}<Link href={`/product/${r.product.slug}`} className="text-sm font-bold text-plum-700 underline">{r.product.name}</Link></div>
              <p className="font-bold">{r.title}</p><p className="whitespace-pre-line text-sm text-plum-800">{r.body}</p>
              <p className="text-xs text-muted">{r.user.name} ({r.user.email}) · {formatDate(r.createdAt)}</p>
              <ReviewActions id={r.id} status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
