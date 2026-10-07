import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { lowStockVariants, PAID_STATUSES, revenueByDay } from "@/lib/admin-stats";
import { StatusBadge } from "@/components/account/OrderBits";
import { BarChart, PageHead, Stat, Table } from "@/components/admin/AdminUI";

export default async function AdminOverview() {
  const [sales, orderCount, customers, products, pending, recent, low, chart] = await Promise.all([
    db.order.aggregate({ where: { status: { in: [...PAID_STATUSES] } }, _sum: { totalCents: true } }),
    db.order.count(),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.product.count(),
    db.order.count({ where: { status: { in: ["PENDING", "PAID", "PROCESSING"] } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    lowStockVariants(10),
    revenueByDay(14),
  ]);

  return (
    <div className="space-y-8">
      <PageHead title="Overview" />
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <li><Stat label="Total sales" value={formatMoney(sales._sum.totalCents ?? 0)} hint="Paid orders" /></li>
        <li><Stat label="Orders" value={orderCount} /></li>
        <li><Stat label="Customers" value={customers} /></li>
        <li><Stat label="Products" value={products} /></li>
        <li><Stat label="To process" value={pending} hint="Pending / paid / processing" /></li>
        <li><Stat label="Low stock" value={low.length} tone={low.length ? "warn" : undefined} hint="Variants at or below threshold" /></li>
      </ul>

      <section className="card p-5" aria-labelledby="rev-h">
        <h3 id="rev-h" className="mb-4 font-sans text-lg font-bold">Revenue · last 14 days</h3>
        <BarChart data={chart} label="Revenue per day" />
      </section>

      <section aria-labelledby="recent-h">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="recent-h" className="font-sans text-lg font-bold">Recent orders</h3>
          <Link href="/admin/orders" className="text-sm font-bold text-plum-700 underline">View all</Link>
        </div>
        <Table head={["Order", "Customer", "Date", "Status", "Total"]} empty={recent.length === 0 ? "No orders yet." : undefined}>
          {recent.map((o) => (
            <tr key={o.id}>
              <td><Link href={`/admin/orders/${o.id}`} className="font-bold text-plum-700 underline">{o.number}</Link></td>
              <td className="max-w-[220px] truncate">{o.email}</td>
              <td>{formatDate(o.createdAt)}</td>
              <td><StatusBadge status={o.status} /></td>
              <td className="font-semibold">{formatMoney(o.totalCents)}</td>
            </tr>
          ))}
        </Table>
      </section>

      {low.length > 0 && (
        <section aria-labelledby="low-h">
          <h3 id="low-h" className="mb-3 font-sans text-lg font-bold">Running low</h3>
          <Table head={["Product", "Variant", "SKU", "Available"]}>
            {low.map((v) => (
              <tr key={v.id}>
                <td>{v.productName}</td><td>{v.name}</td><td className="text-muted">{v.sku}</td>
                <td><span className={`badge ${v.available <= 0 ? "bg-coral-500/15 text-coral-700" : "bg-sun-100 text-sun-700"}`}>{v.available}</span></td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </div>
  );
}
