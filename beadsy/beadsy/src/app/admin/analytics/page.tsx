import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PAID_STATUSES, revenueByDay } from "@/lib/admin-stats";
import { BarChart, PageHead, Stat, Table } from "@/components/admin/AdminUI";

export default async function AdminAnalytics() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [chart, agg, top, byStatus, coupons] = await Promise.all([
    revenueByDay(30),
    db.order.aggregate({ where: { status: { in: [...PAID_STATUSES] }, paidAt: { gte: since } }, _sum: { totalCents: true, discountCents: true }, _count: { _all: true } }),
    db.product.findMany({ orderBy: { soldCount: "desc" }, take: 8, where: { soldCount: { gt: 0 } }, select: { id: true, name: true, soldCount: true, currentPriceCents: true } }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.couponRedemption.groupBy({ by: ["couponId"], _count: { _all: true }, orderBy: { _count: { couponId: "desc" } }, take: 5 }),
  ]);
  const couponNames = await db.coupon.findMany({ where: { id: { in: coupons.map((c) => c.couponId) } }, select: { id: true, code: true } });
  const orders30 = agg._count._all;
  const rev30 = agg._sum.totalCents ?? 0;
  return (
    <div className="space-y-8">
      <PageHead title="Analytics · last 30 days" />
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <li><Stat label="Revenue" value={formatMoney(rev30)} /></li>
        <li><Stat label="Paid orders" value={orders30} /></li>
        <li><Stat label="Avg. order value" value={formatMoney(orders30 ? Math.round(rev30 / orders30) : 0)} /></li>
        <li><Stat label="Discounts given" value={formatMoney(agg._sum.discountCents ?? 0)} /></li>
      </ul>
      <section className="card p-5" aria-labelledby="rv"><h3 id="rv" className="mb-4 font-sans text-lg font-bold">Revenue per day</h3><BarChart data={chart} label="Revenue per day, last 30 days" /></section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="tp"><h3 id="tp" className="mb-3 font-sans text-lg font-bold">Best sellers (all time)</h3>
          <Table head={["Product", "Units sold", "Price"]} empty={top.length === 0 ? "No sales yet." : undefined}>{top.map((p) => <tr key={p.id}><td className="font-bold">{p.name}</td><td>{p.soldCount}</td><td>{formatMoney(p.currentPriceCents)}</td></tr>)}</Table>
        </section>
        <section aria-labelledby="os"><h3 id="os" className="mb-3 font-sans text-lg font-bold">Orders by status</h3>
          <Table head={["Status", "Orders"]} empty={byStatus.length === 0 ? "No orders yet." : undefined}>{byStatus.map((s) => <tr key={s.status}><td>{s.status}</td><td>{s._count._all}</td></tr>)}</Table>
          {coupons.length > 0 && (<><h3 className="mt-6 mb-3 font-sans text-lg font-bold">Top coupons</h3><Table head={["Code", "Uses"]}>{coupons.map((c) => <tr key={c.couponId}><td className="font-bold">{couponNames.find((n) => n.id === c.couponId)?.code ?? "—"}</td><td>{c._count._all}</td></tr>)}</Table></>)}
        </section>
      </div>
    </div>
  );
}
