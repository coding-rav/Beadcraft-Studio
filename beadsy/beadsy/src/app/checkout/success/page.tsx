import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { markOrderPaid } from "@/lib/orders";
import { configuredProviders } from "@/lib/payments/config";
import { retrieveStripeSession } from "@/lib/payments/stripe";
import { StatePanel } from "@/components/ui/States";
import { ClearCartOnPaid, PendingPoller } from "@/components/checkout/SuccessClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildMetadata({ title: "Order confirmation", path: "/checkout/success", noIndex: true });

type Props = { searchParams: Promise<{ o?: string; t?: string }> };

export default async function SuccessPage({ searchParams }: Props) {
  const { o, t } = await searchParams;
  if (!o || !t || o.length > 20 || t.length > 100) {
    return <StatePanel art="bracelet" tone="pink" title="Order not found" message="That confirmation link isn't valid. If you just paid, check your email for your order details." actions={[{ label: "Go home", href: "/" }]} />;
  }

  // The secret access token in the link is what authorises viewing a guest order.
  let order = await db.order.findFirst({ where: { number: o, accessToken: t }, include: { items: true, payments: true } });
  if (!order) {
    return <StatePanel art="bracelet" tone="pink" title="Order not found" message="We couldn't find that order. Double-check the link from your confirmation email." actions={[{ label: "Contact us", href: "/contact" }, { label: "Go home", href: "/", variant: "secondary" }] } />;
  }

  // Safety net for a slow/missing webhook: ask Stripe directly (server-to-server) whether it was paid.
  if (order.status === "PENDING" && configuredProviders().stripe) {
    const sp = order.payments.find((p) => p.provider === "STRIPE" && p.status !== "SUCCEEDED");
    if (sp) {
      try {
        const s = await retrieveStripeSession(sp.providerRef);
        if (s.paid) {
          await markOrderPaid({ provider: "STRIPE", providerRef: sp.providerRef, providerPaymentId: s.paymentIntentId, amountPaidCents: s.amountTotal, currency: s.currency });
          order = (await db.order.findFirst({ where: { number: o, accessToken: t }, include: { items: true, payments: true } })) ?? order;
        }
      } catch {
        /* Stripe unreachable — the poller below keeps checking */
      }
    }
  }

  const paid = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status);
  const pending = order.status === "PENDING";
  const addr = order.shippingAddress as { fullName?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string };

  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return (
      <StatePanel
        art="charm"
        tone="pink"
        title={order.status === "REFUNDED" ? "This order was refunded" : "Payment didn't go through"}
        message={order.status === "REFUNDED" ? "Your payment has been returned to your original payment method." : "Your order wasn't completed and you haven't been charged. Your bag is saved — you can try again."}
        actions={[{ label: "Back to checkout", href: "/checkout" }, { label: "Need help?", href: "/contact", variant: "secondary" }]}
      />
    );
  }

  return (
    <div className="container-x max-w-3xl py-10 sm:py-16">
      {paid && <ClearCartOnPaid />}
      {pending && <PendingPoller />}

      <div className="text-center">
        <div className="mx-auto mb-5 grid size-20 place-items-center rounded-full bg-mint-100 text-4xl" aria-hidden="true">{paid ? "🎉" : "⏳"}</div>
        <h1 className="text-4xl font-semibold sm:text-5xl">{paid ? "Thank you! Your order is in" : "Confirming your payment…"}</h1>
        <p className="mt-3 text-plum-800" role="status">
          {paid ? <>We've emailed a confirmation to <strong>{order.email}</strong>. We'll start strung-by-hand preparations right away.</> : "This usually takes a few seconds. This page will update on its own — please don't pay again."}
        </p>
      </div>

      <section className="card mt-8 space-y-6 p-5 sm:p-8" aria-label="Order details">
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <p><span className="text-muted">Order number</span><br /><strong className="text-lg">{order.number}</strong></p>
          <p><span className="text-muted">Placed</span><br /><strong>{formatDate(order.createdAt)}</strong></p>
          <p><span className="text-muted">Status</span><br /><span className={`badge ${paid ? "bg-mint-100 text-mint-700" : "bg-sun-100 text-sun-700"}`}>{order.status}</span></p>
        </div>
        <ul className="divide-y divide-plum-100">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
              <span>{i.name}{i.variantName ? ` — ${i.variantName}` : ""} <span className="text-muted">× {i.quantity}</span></span>
              <span className="font-semibold">{formatMoney(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 text-sm">
          <Line label="Subtotal" value={formatMoney(order.subtotalCents)} />
          {order.discountCents > 0 && <Line label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`− ${formatMoney(order.discountCents)}`} />}
          <Line label="Shipping" value={order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)} />
          <Line label="GST included" value={formatMoney(order.taxCents)} />
          <div className="flex justify-between border-t border-plum-100 pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatMoney(order.totalCents)}</dd></div>
        </dl>
        <div className="rounded-2xl bg-plum-50 p-4 text-sm">
          <p className="font-bold">Shipping to</p>
          <p>{addr.fullName}</p>
          <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postalCode}</p>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn btn-primary">Keep shopping</Link>
        {order.userId && <Link href={`/account/orders/${order.number}`} className="btn btn-secondary">View in my account</Link>}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
