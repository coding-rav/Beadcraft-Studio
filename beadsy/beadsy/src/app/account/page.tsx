import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/account/OrderBits";

export default async function AccountDashboard() {
  const user = await requirePageUser("/account");
  const [orders, orderCount, wishlistCount, addressCount] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3, include: { items: { take: 3 } } }),
    db.order.count({ where: { userId: user.id } }),
    db.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
    db.address.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-8">
      <ul className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Orders", value: orderCount, href: "/account/orders" },
          { label: "Wishlist", value: wishlistCount, href: "/wishlist" },
          { label: "Saved addresses", value: addressCount, href: "/account/addresses" },
        ].map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
              <p className="font-display text-4xl font-semibold">{s.value}</p>
              <p className="text-sm font-semibold text-muted">{s.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="recent-orders">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-orders" className="text-2xl font-semibold">Recent orders</h2>
          {orderCount > 0 && <Link href="/account/orders" className="text-sm font-bold text-plum-700 underline">View all</Link>}
        </div>
        {orders.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-display text-2xl font-semibold">No orders yet</p>
            <p className="mt-1 text-muted">Your first Beadsy order will show up here.</p>
            <Link href="/shop" className="btn btn-primary mt-5">Start shopping</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.number}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:shadow-pop">
                  <div>
                    <p className="font-bold">{o.number}</p>
                    <p className="text-sm text-muted">{formatDate(o.createdAt)} · {o.items.map((i) => i.name).join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="font-bold">{formatMoney(o.totalCents)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
