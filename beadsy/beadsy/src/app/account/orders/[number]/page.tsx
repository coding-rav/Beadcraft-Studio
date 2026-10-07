import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { OrderTracker, StatusBadge } from "@/components/account/OrderBits";

export default async function OrderDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requirePageUser(`/account/orders/${number}`);
  if (!/^[A-Z0-9-]{3,20}$/.test(number)) notFound();
  // userId in the filter: customers can only ever load their own orders.
  const order = await db.order.findFirst({ where: { number, userId: user.id }, include: { items: { include: { variant: { select: { product: { select: { slug: true } } } } } }, payments: true } });
  if (!order) notFound();
  const addr = order.shippingAddress as { fullName?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-sm font-bold text-plum-700 underline">← All orders</Link>
          <h2 className="mt-1 text-3xl font-semibold">Order {order.number}</h2>
          <p className="text-sm text-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="card p-5 sm:p-6"><OrderTracker status={order.status} />
        {order.status === "PENDING" && <p className="text-sm text-plum-800">We're waiting for your payment to be confirmed. If you've already paid, this will update shortly.</p>}
        {order.status === "CANCELLED" && <p className="text-sm text-plum-800">This order was cancelled and you weren't charged.</p>}
        {order.status === "REFUNDED" && <p className="text-sm text-plum-800">This order was refunded to your original payment method.</p>}
        {order.trackingNumber && <p className="mt-4 text-sm"><span className="text-muted">Tracking number:</span> <strong>{order.trackingNumber}</strong></p>}
      </div>

      <section className="card p-5 sm:p-6" aria-label="Items">
        <ul className="divide-y divide-plum-100">
          {order.items.map((i) => {
            const slug = i.variant?.product.slug;
            return (
              <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
                <span>
                  {slug ? <Link href={`/product/${slug}`} className="font-semibold hover:underline">{i.name}</Link> : <span className="font-semibold">{i.name}</span>}
                  {i.variantName ? ` — ${i.variantName}` : ""} <span className="text-muted">× {i.quantity}</span>
                </span>
                <span className="font-semibold">{formatMoney(i.unitPriceCents * i.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-plum-100 pt-3 text-sm">
          <Row label="Subtotal" value={formatMoney(order.subtotalCents)} />
          {order.discountCents > 0 && <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`− ${formatMoney(order.discountCents)}`} />}
          <Row label="Shipping" value={order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)} />
          <Row label="GST included" value={formatMoney(order.taxCents)} />
          <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total</dt><dd>{formatMoney(order.totalCents)}</dd></div>
        </dl>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card p-5 text-sm"><h3 className="mb-1 font-sans font-bold">Shipping address</h3>
          <p>{addr.fullName}</p><p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p><p>{addr.city}, {addr.state} {addr.postalCode}</p><p className="text-muted">{addr.phone}</p>
        </section>
        <section className="card p-5 text-sm"><h3 className="mb-1 font-sans font-bold">Payment</h3>
          {order.payments.length === 0 ? <p className="text-muted">No payment recorded.</p> : order.payments.map((p) => (
            <p key={p.id}>{p.provider === "STRIPE" ? "Card (Stripe)" : "UPI / Cards (Razorpay)"} · <span className="font-semibold">{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</span></p>
          ))}
          <p className="mt-2 text-muted">Delivery: {order.deliveryMethod === "EXPRESS" ? "Express" : "Standard"}</p>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
