import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/account/OrderBits";
import { PageHead, Table } from "@/components/admin/AdminUI";
import { Pagination } from "@/components/shop/Pagination";

const PER = 25;
const STATUSES: OrderStatus[] = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, Math.min(Number(sp.page) || 1, 1000));
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ number: { contains: q.toUpperCase() } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
  ]);
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (q) params.q = q;

  return (
    <div>
      <PageHead title="Orders" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/admin/orders" className="chip" aria-pressed={!status}>All</Link>
        {STATUSES.map((s) => <Link key={s} href={`/admin/orders?status=${s}`} className="chip" aria-pressed={status === s}>{s.charAt(0) + s.slice(1).toLowerCase()}</Link>)}
      </div>
      <form className="mb-4 flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="oq" className="sr-only">Search orders</label>
        <input id="oq" name="q" defaultValue={q} placeholder="Order number or email" className="input max-w-sm rounded-full" />
        <button className="btn btn-soft">Search</button>
      </form>
      <Table head={["Order", "Customer", "Date", "Status", "Total"]} empty={orders.length === 0 ? "No orders match." : undefined}>
        {orders.map((o) => (
          <tr key={o.id}>
            <td><Link href={`/admin/orders/${o.id}`} className="font-bold text-plum-700 underline">{o.number}</Link></td>
            <td className="max-w-[240px] truncate">{o.email}</td>
            <td>{formatDate(o.createdAt)}</td>
            <td><StatusBadge status={o.status} /></td>
            <td className="font-semibold">{formatMoney(o.totalCents)}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER)} basePath="/admin/orders" params={params} />
    </div>
  );
}
