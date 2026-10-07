import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/account/OrderBits";
import { OrderEditor } from "@/components/admin/AdminForms";
import { PageHead } from "@/components/admin/AdminUI";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, payments: true, user: { select: { name: true, email: true } } } });
  if (!o) notFound();
  const a = o.shippingAddress as { fullName?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string };
  return (
    <div className="space-y-6">
      <PageHead title={`Order ${o.number}`}><Link href="/admin/orders" className="btn btn-ghost btn-sm">← All orders</Link></PageHead>
      {o.internalNote && <p role="alert" className="rounded-xl bg-sun-100 p-3 text-sm font-semibold">⚠ {o.internalNote}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5" aria-label="Items">
            <div className="mb-3 flex items-center justify-between"><StatusBadge status={o.status} /><span className="text-sm text-muted">{formatDate(o.createdAt)}</span></div>
            <ul className="divide-y divide-plum-100">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-2.5 text-sm"><span>{i.name}{i.variantName ? ` — ${i.variantName}` : ""} <span className="text-muted">({i.sku}) × {i.quantity}</span></span><span className="font-semibold">{formatMoney(i.unitPriceCents * i.quantity)}</span></li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-plum-100 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(o.subtotalCents)}</dd></div>
              {o.discountCents > 0 && <div className="flex justify-between"><dt className="text-muted">Discount {o.couponCode ? `(${o.couponCode})` : ""}</dt><dd>− {formatMoney(o.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping ({o.deliveryMethod.toLowerCase()})</dt><dd>{formatMoney(o.shippingCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">GST included</dt><dd>{formatMoney(o.taxCents)}</dd></div>
              <div className="flex justify-between pt-1 text-lg font-bold"><dt>Total</dt><dd>{formatMoney(o.totalCents)}</dd></div>
            </dl>
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="card p-5 text-sm"><h3 className="mb-1 font-sans font-bold">Customer</h3><p>{o.user?.name ?? "Guest"}</p><p>{o.email}</p><p>{o.phone}</p></section>
            <section className="card p-5 text-sm"><h3 className="mb-1 font-sans font-bold">Ship to</h3><p>{a.fullName}</p><p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p><p>{a.city}, {a.state} {a.postalCode}</p><p>{a.phone}</p>{o.notes && <p className="mt-2 rounded-lg bg-plum-50 p-2">Note: {o.notes}</p>}</section>
          </div>
          <section className="card p-5 text-sm" aria-label="Payments"><h3 className="mb-2 font-sans font-bold">Payments</h3>
            {o.payments.length === 0 ? <p className="text-muted">None recorded.</p> : o.payments.map((p) => (
              <p key={p.id} className="flex flex-wrap justify-between gap-2"><span>{p.provider} · <span className="break-all text-muted">{p.providerPaymentId ?? p.providerRef}</span></span><span className="font-semibold">{p.status} · {formatMoney(p.amountCents)}{p.failureReason ? ` · ${p.failureReason}` : ""}</span></p>
            ))}
          </section>
        </div>
        <OrderEditor id={o.id} status={o.status} trackingNumber={o.trackingNumber ?? ""} internalNote={o.internalNote ?? ""} />
      </div>
    </div>
  );
}
