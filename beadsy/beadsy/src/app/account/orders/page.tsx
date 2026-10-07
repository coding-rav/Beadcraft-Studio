import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/account/OrderBits";
import { Pagination } from "@/components/shop/Pagination";

const PER_PAGE = 10;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requirePageUser("/account/orders");
  const sp = await searchParams;
  const page = Math.max(1, Math.min(Number(sp.page) || 1, 1000));
  const where = { userId: user.id };
  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { items: { select: { name: true, quantity: true } } } }),
  ]);

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Your orders</h2>
      {orders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-2xl font-semibold">No orders yet</p>
          <p className="mt-1 text-muted">When you place an order, you can track it here.</p>
          <Link href="/shop" className="btn btn-primary mt-5">Browse the shop</Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.number}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:shadow-pop sm:p-5">
                  <div className="min-w-0">
                    <p className="font-bold">{o.number}</p>
                    <p className="truncate text-sm text-muted">{formatDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} items</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="font-bold">{formatMoney(o.totalCents)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} basePath="/account/orders" params={{}} />
        </>
      )}
    </div>
  );
}
