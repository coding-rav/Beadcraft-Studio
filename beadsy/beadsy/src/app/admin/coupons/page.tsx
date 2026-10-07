import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { CouponEditor, EMPTY_COUPON, type CouponFormValues } from "@/components/admin/AdminForms";
import { PageHead } from "@/components/admin/AdminUI";

function localInput(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function AdminCoupons() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { redemptions: true } } } });
  return (
    <div className="space-y-6">
      <PageHead title="Coupons" />
      <section className="card p-5" aria-labelledby="nc"><h3 id="nc" className="mb-3 font-sans text-lg font-bold">Create a coupon</h3><CouponEditor initial={EMPTY_COUPON} /></section>
      <ul className="space-y-3">
        {coupons.map((c) => {
          const initial: CouponFormValues = {
            id: c.id, code: c.code, description: c.description ?? "", type: c.type,
            value: String(c.type === "PERCENTAGE" ? c.value : c.value / 100),
            maxDiscount: c.maxDiscountCents != null ? String(c.maxDiscountCents / 100) : "",
            minOrder: String(c.minOrderCents / 100),
            startsAt: localInput(c.startsAt), expiresAt: localInput(c.expiresAt),
            usageLimit: c.usageLimit != null ? String(c.usageLimit) : "", perUserLimit: c.perUserLimit != null ? String(c.perUserLimit) : "",
            isActive: c.isActive,
          };
          return (
            <li key={c.id} className="card p-5">
              <p className="mb-3 text-sm text-muted"><strong className="text-plum-900">{c.code}</strong> · {c.type === "PERCENTAGE" ? `${c.value}% off` : `${formatMoney(c.value)} off`} · used {c._count.redemptions}{c.usageLimit ? ` / ${c.usageLimit}` : ""} times</p>
              <CouponEditor initial={initial} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
