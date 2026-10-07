import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PageHead, Table } from "@/components/admin/AdminUI";
import { Pagination } from "@/components/shop/Pagination";

const PER = 30;

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Math.min(Number(sp.page) || 1, 1000));
  const [total, payments] = await Promise.all([
    db.payment.count(),
    db.payment.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { order: { select: { id: true, number: true } } } }),
  ]);
  const tone: Record<string, string> = { SUCCEEDED: "bg-mint-100 text-mint-700", PENDING: "bg-sun-100 text-sun-700", FAILED: "bg-coral-500/15 text-coral-700", CANCELLED: "bg-plum-100 text-plum-700", REFUNDED: "bg-bubblegum-100 text-bubblegum-700" };
  return (
    <div>
      <PageHead title="Payments" />
      <Table head={["Date", "Order", "Provider", "Reference", "Amount", "Status"]} empty={payments.length === 0 ? "No payments yet." : undefined}>
        {payments.map((p) => (
          <tr key={p.id}>
            <td>{formatDate(p.createdAt)}</td>
            <td><Link href={`/admin/orders/${p.order.id}`} className="font-bold text-plum-700 underline">{p.order.number}</Link></td>
            <td>{p.provider}</td>
            <td className="max-w-[200px] truncate text-xs text-muted" title={p.providerPaymentId ?? p.providerRef}>{p.providerPaymentId ?? p.providerRef}</td>
            <td className="font-semibold">{formatMoney(p.amountCents)}</td>
            <td><span className={`badge ${tone[p.status]}`}>{p.status}</span>{p.failureReason && <p className="mt-0.5 text-xs text-muted">{p.failureReason}</p>}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER)} basePath="/admin/payments" params={{}} />
    </div>
  );
}
