import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PAID_STATUSES } from "@/lib/admin-stats";
import { PageHead, Table } from "@/components/admin/AdminUI";
import { Pagination } from "@/components/shop/Pagination";

const PER = 25;

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, Math.min(Number(sp.page) || 1, 1000));
  const where = { role: "CUSTOMER" as const, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}) };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, select: { id: true, name: true, email: true, createdAt: true } }),
  ]);
  const spent = await db.order.groupBy({ by: ["userId"], where: { userId: { in: users.map((u) => u.id) }, status: { in: [...PAID_STATUSES] } }, _sum: { totalCents: true }, _count: { _all: true } });
  const byUser = new Map(spent.map((s) => [s.userId, s]));
  return (
    <div>
      <PageHead title="Customers" />
      <form className="mb-4 flex gap-2" role="search"><label htmlFor="cq" className="sr-only">Search customers</label><input id="cq" name="q" defaultValue={q} placeholder="Name or email" className="input max-w-sm rounded-full" /><button className="btn btn-soft">Search</button></form>
      <Table head={["Customer", "Joined", "Paid orders", "Total spent"]} empty={users.length === 0 ? "No customers yet." : undefined}>
        {users.map((u) => {
          const s = byUser.get(u.id);
          return (
            <tr key={u.id}><td><p className="font-bold">{u.name}</p><p className="text-xs text-muted">{u.email}</p></td><td>{formatDate(u.createdAt)}</td><td>{s?._count._all ?? 0}</td><td className="font-semibold">{formatMoney(s?._sum.totalCents ?? 0)}</td></tr>
          );
        })}
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER)} basePath="/admin/customers" params={q ? { q } : {}} />
    </div>
  );
}
