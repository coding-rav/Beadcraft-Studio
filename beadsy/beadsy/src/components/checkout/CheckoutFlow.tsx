"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CartLineRow } from "@/components/cart/CartLineRow";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { useCartPricing } from "@/components/cart/useCartPricing";
import { useStore } from "@/components/providers/StoreProvider";
import { Icon } from "@/components/ui/Icon";
import { StatePanel } from "@/components/ui/States";
import { commerceConfig } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { readCheckoutPrefs, writeCheckoutPrefs } from "@/lib/checkout-state";
import { formatDate } from "@/lib/utils";
import { AddressFields, EMPTY_ADDRESS, validateAddress, type AddressDraft, type FieldErrors } from "./AddressFields";

type Step = 1 | 2 | 3 | 4 | 5;
type Provider = "STRIPE" | "RAZORPAY";
const STEPS = ["Contact", "Shipping", "Delivery", "Payment", "Review"];

interface SavedAddress extends AddressDraft {
  id: string;
  isDefault: boolean;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string; contact?: string };
  theme?: { color: string };
  handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => RazorpayInstance;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { cart, ready, user, clearCart, toast } = useStore();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [delivery, setDelivery] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [cancelledBanner, setCancelledBanner] = useState(false);
  const topRef = useRef<HTMLHeadingElement>(null);

  // Restore choices made in the cart and handle a cancelled return from the payment page.
  useEffect(() => {
    const p = readCheckoutPrefs();
    if (p.couponCode) setCoupon(p.couponCode);
    if (p.delivery) setDelivery(p.delivery);
    setPrefsLoaded(true);

    const o = params.get("o");
    const t = params.get("t");
    if (params.get("cancelled") && o && t) {
      setCancelledBanner(true);
      void fetch("/api/checkout/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: o, token: t }) }).catch(() => {});
      router.replace("/checkout");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      setEmail((e) => e || user.email);
      void fetch("/api/addresses")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { addresses: SavedAddress[] } | null) => {
          if (!d) return;
          setSaved(d.addresses);
          const def = d.addresses.find((a) => a.isDefault) ?? d.addresses[0];
          if (def) {
            setAddress((cur) => (cur.line1 ? cur : { fullName: def.fullName, phone: def.phone, line1: def.line1, line2: def.line2 ?? "", city: def.city, state: def.state, postalCode: def.postalCode }));
            setPhone((p) => p || def.phone);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const { data, loading, error, retry, blocked, purchasable } = useCartPricing({ couponCode: coupon, delivery, email, enabled: prefsLoaded });

  useEffect(() => {
    if (prefsLoaded) writeCheckoutPrefs({ couponCode: data?.coupon?.valid ? coupon : undefined, delivery });
  }, [prefsLoaded, coupon, delivery, data?.coupon?.valid]);

  useEffect(() => {
    if (data?.providers && !provider) setProvider(data.providers.razorpay ? "RAZORPAY" : data.providers.stripe ? "STRIPE" : null);
  }, [data?.providers, provider]);

  const goto = useCallback((s: Step) => {
    setStep(s);
    setFormError(null);
    window.setTimeout(() => topRef.current?.focus(), 0);
  }, []);

  /* ---- empty / unavailable states ---- */
  if (ready && cart.length === 0) {
    return (
      <StatePanel
        art="bracelet"
        title="Your bag is empty"
        message="Add something lovely before checking out."
        actions={[{ label: "Start shopping", href: "/shop" }]}
      />
    );
  }

  const next1 = () => {
    const e: FieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email address";
    if (!/^\+?[0-9][0-9\s-]{7,14}$/.test(phone.trim())) e.phone = "Enter a valid phone number";
    setErrors(e);
    if (!Object.keys(e).length) goto(2);
  };
  const next2 = () => {
    const e = validateAddress(address);
    setErrors(e);
    if (!Object.keys(e).length) goto(3);
  };

  /* ---- place order ---- */
  const place = async () => {
    if (!provider) {
      setFormError("Please choose a payment method.");
      goto(4);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          couponCode: data?.coupon?.valid ? coupon : undefined,
          delivery,
          customer: { email: email.trim(), phone: phone.trim() },
          address: { ...address, country: "IN" },
          provider,
          notes: notes.trim() || undefined,
        }),
      });
      const body = (await res.json()) as {
        error?: string;
        code?: string;
        issues?: { path: string; message: string }[];
        provider?: Provider;
        url?: string;
        orderNumber?: string;
        accessToken?: string;
        razorpay?: { keyId: string; orderId: string; amount: number; currency: string; name: string; description: string; prefill: { email: string; contact: string } };
      };

      if (!res.ok) {
        if (body.issues?.length) {
          const fe: FieldErrors = {};
          body.issues.forEach((i) => (fe[i.path.split(".").pop() ?? i.path] = i.message));
          setErrors(fe);
          goto(fe.email || fe.phone ? 1 : 2);
        }
        if (body.code === "CART_CHANGED" || body.code === "OUT_OF_STOCK") void retry();
        throw new Error(body.error ?? "We couldn't place your order. Please try again.");
      }

      if (body.provider === "STRIPE" && body.url) {
        window.location.assign(body.url); // hosted Stripe Checkout; the cart is cleared on the success page
        return;
      }

      if (body.provider === "RAZORPAY" && body.razorpay && body.orderNumber && body.accessToken) {
        const ok = await loadRazorpay();
        if (!ok || !window.Razorpay) {
          await fetch("/api/checkout/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: body.orderNumber, token: body.accessToken }) });
          throw new Error("Couldn't load the payment window. Check your connection and try again.");
        }
        const rz = body.razorpay;
        const orderNumber = body.orderNumber;
        const token = body.accessToken;
        const instance = new window.Razorpay({
          key: rz.keyId,
          amount: rz.amount,
          currency: rz.currency,
          name: rz.name,
          description: rz.description,
          order_id: rz.orderId,
          prefill: { email: rz.prefill.email, contact: rz.prefill.contact },
          theme: { color: "#6B4A82" },
          handler: async (r) => {
            try {
              const v = await fetch("/api/payments/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderNumber, token, ...r }),
              });
              if (!v.ok) {
                const vb = (await v.json()) as { error?: string };
                throw new Error(vb.error ?? "Verification failed");
              }
              router.push(`/checkout/success?o=${encodeURIComponent(orderNumber)}&t=${encodeURIComponent(token)}`);
            } catch (err) {
              // Money may have moved: send them to the order page, which shows the true status.
              toast(err instanceof Error ? err.message : "We're confirming your payment…", "info");
              router.push(`/checkout/success?o=${encodeURIComponent(orderNumber)}&t=${encodeURIComponent(token)}`);
            }
          },
          modal: {
            ondismiss: () => {
              void fetch("/api/checkout/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: orderNumber, token }) }).catch(() => {});
              setBusy(false);
              setCancelledBanner(true);
            },
          },
        });
        instance.on("payment.failed", (resp) => {
          setFormError(resp.error?.description ?? "Your payment didn't go through. You can try again in the payment window.");
        });
        instance.open();
        return; // stays "busy" until the modal resolves
      }
      throw new Error("Unexpected response from the payment service.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error. Please check your connection and try again.");
      setBusy(false);
    }
  };

  const noProviders = data && !data.providers.stripe && !data.providers.razorpay;

  return (
    <div className="container-x py-8 sm:py-12">
      <h1 ref={topRef} tabIndex={-1} className="mb-2 text-4xl font-semibold outline-none sm:text-5xl">Checkout</h1>

      <ol className="mb-8 flex items-center gap-1.5 overflow-x-auto pb-2 text-xs font-bold sm:text-sm" aria-label="Checkout progress">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step;
          const done = n < step;
          const current = n === step;
          return (
            <li key={label} className="flex shrink-0 items-center gap-1.5" aria-current={current ? "step" : undefined}>
              <button type="button" disabled={!done} onClick={() => goto(n)} className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition ${current ? "bg-plum-700 text-white" : done ? "bg-mint-100 text-mint-700 hover:bg-mint-300" : "bg-plum-100 text-plum-600"}`}>
                <span className="grid size-5 place-items-center rounded-full bg-white/30 text-[11px]">{done ? "✓" : n}</span>
                {label}
              </button>
              {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-3 bg-plum-300 sm:w-6" />}
            </li>
          );
        })}
      </ol>

      {cancelledBanner && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl bg-sun-100 p-4 text-sm text-plum-900">
          <Icon name="alert" size={20} className="mt-0.5 shrink-0 text-sun-700" />
          <p><strong>Payment cancelled.</strong> Nothing was charged and your bag is still saved. Pick a method and try again whenever you're ready.</p>
        </div>
      )}

      {error && !data && (
        <div role="alert" className="card mb-6 bg-coral-500/10 p-6 text-center">
          <p className="font-bold text-coral-700">Network error</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <button type="button" className="btn btn-primary btn-sm mt-3" onClick={() => void retry()}>Try again</button>
        </div>
      )}

      {data && blocked && (
        <div role="alert" className="mb-6 rounded-2xl bg-coral-500/10 p-4 text-sm font-semibold text-coral-700">
          Some items in your bag are no longer available. <Link href="/cart" className="underline">Review your bag</Link> to continue.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_390px] lg:gap-12">
        <div className="space-y-6">
          {/* STEP 1 */}
          {step === 1 && (
            <section className="card space-y-5 p-5 sm:p-7" aria-labelledby="s1">
              <h2 id="s1" className="text-2xl font-semibold">Contact information</h2>
              {!user && (
                <p className="text-sm text-muted">
                  Already have an account? <Link href="/login?next=/checkout" className="font-bold text-plum-700 underline">Sign in</Link> — or just continue as a guest.
                </p>
              )}
              <div>
                <label htmlFor="c-email" className="label">Email</label>
                <input id="c-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} className="input" maxLength={254} />
                {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
                <p className="hint">We'll send your order confirmation here.</p>
              </div>
              <div>
                <label htmlFor="c-phone" className="label">Phone</label>
                <input id="c-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(errors.phone)} className="input" maxLength={16} />
                {errors.phone && <p className="field-error" role="alert">{errors.phone}</p>}
                <p className="hint">Only used by the courier for delivery updates.</p>
              </div>
              <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto" onClick={next1}>Continue to shipping</button>
            </section>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <section className="card space-y-5 p-5 sm:p-7" aria-labelledby="s2">
              <h2 id="s2" className="text-2xl font-semibold">Shipping address</h2>
              {saved.length > 0 && (
                <div>
                  <p className="label">Saved addresses</p>
                  <div className="flex flex-wrap gap-2">
                    {saved.map((a) => (
                      <button key={a.id} type="button" className="chip max-w-full !h-auto !items-start !rounded-2xl !py-2 text-left" onClick={() => { setAddress({ fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, postalCode: a.postalCode }); setErrors({}); }}>
                        <span><strong>{a.fullName}</strong><span className="block text-xs font-normal text-muted">{a.line1}, {a.city} {a.postalCode}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <AddressFields value={address} onChange={setAddress} errors={errors} idPrefix="ship" />
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => goto(1)}>Back</button>
                <button type="button" className="btn btn-primary btn-lg" onClick={next2}>Continue to delivery</button>
              </div>
            </section>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <section className="card space-y-5 p-5 sm:p-7" aria-labelledby="s3">
              <h2 id="s3" className="text-2xl font-semibold">Delivery method</h2>
              <fieldset>
                <legend className="sr-only">Choose a delivery method</legend>
                <div className="grid gap-3">
                  {(["STANDARD", "EXPRESS"] as const).map((m) => {
                    const est = commerceConfig.deliveryEstimates[m];
                    const base = m === "STANDARD" ? commerceConfig.standardShippingCents : commerceConfig.expressShippingCents;
                    const free = m === "STANDARD" && data && data.totals.subtotalCents - data.totals.discountCents >= commerceConfig.freeShippingOverCents;
                    return (
                      <label key={m} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${delivery === m ? "border-plum-700 bg-plum-50" : "border-plum-100 hover:border-plum-300"}`}>
                        <input type="radio" name="delivery" checked={delivery === m} onChange={() => setDelivery(m)} className="size-5 accent-plum-700" />
                        <span className="flex-1">
                          <span className="block font-bold">{est.label}</span>
                          <span className="text-sm text-muted">{est.minDays}–{est.maxDays} working days</span>
                        </span>
                        <span className="font-bold">{free ? "Free" : formatMoney(base)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div>
                <label htmlFor="notes" className="label">Gift note or delivery instructions (optional)</label>
                <textarea id="notes" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => goto(2)}>Back</button>
                <button type="button" className="btn btn-primary btn-lg" onClick={() => goto(4)}>Continue to payment</button>
              </div>
            </section>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <section className="card space-y-5 p-5 sm:p-7" aria-labelledby="s4">
              <h2 id="s4" className="text-2xl font-semibold">Payment method</h2>
              {noProviders ? (
                <div role="alert" className="rounded-2xl bg-coral-500/10 p-4 text-sm">
                  <p className="font-bold text-coral-700">Payments aren't switched on yet</p>
                  <p className="mt-1 text-plum-800">The store owner needs to add Stripe or Razorpay keys (see the README). No order can be placed until then.</p>
                </div>
              ) : (
                <fieldset>
                  <legend className="sr-only">Choose how to pay</legend>
                  <div className="grid gap-3">
                    {data?.providers.razorpay && (
                      <label className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${provider === "RAZORPAY" ? "border-plum-700 bg-plum-50" : "border-plum-100 hover:border-plum-300"}`}>
                        <input type="radio" name="provider" checked={provider === "RAZORPAY"} onChange={() => setProvider("RAZORPAY")} className="size-5 accent-plum-700" />
                        <span className="flex-1"><span className="block font-bold">UPI, cards & netbanking</span><span className="text-sm text-muted">Secure payment by Razorpay</span></span>
                        <Icon name="lock" size={18} className="text-plum-600" />
                      </label>
                    )}
                    {data?.providers.stripe && (
                      <label className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${provider === "STRIPE" ? "border-plum-700 bg-plum-50" : "border-plum-100 hover:border-plum-300"}`}>
                        <input type="radio" name="provider" checked={provider === "STRIPE"} onChange={() => setProvider("STRIPE")} className="size-5 accent-plum-700" />
                        <span className="flex-1"><span className="block font-bold">Credit / debit card</span><span className="text-sm text-muted">Secure payment by Stripe</span></span>
                        <Icon name="card" size={20} className="text-plum-600" />
                      </label>
                    )}
                  </div>
                </fieldset>
              )}
              <p className="flex items-center gap-2 text-xs text-muted">
                <Icon name="lock" size={14} /> You'll pay on the provider's secure page. Beadsy never sees or stores your card details.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => goto(3)}>Back</button>
                <button type="button" className="btn btn-primary btn-lg" disabled={!provider} onClick={() => goto(5)}>Review order</button>
              </div>
            </section>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <section className="card space-y-6 p-5 sm:p-7" aria-labelledby="s5">
              <h2 id="s5" className="text-2xl font-semibold">Review your order</h2>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <ReviewBlock title="Contact" onEdit={() => goto(1)}><p>{email}</p><p>{phone}</p></ReviewBlock>
                <ReviewBlock title="Ship to" onEdit={() => goto(2)}>
                  <p className="font-semibold">{address.fullName}</p>
                  <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                  <p>{address.city}, {address.state} {address.postalCode}</p>
                </ReviewBlock>
                <ReviewBlock title="Delivery" onEdit={() => goto(3)}>
                  <p>{commerceConfig.deliveryEstimates[delivery].label}</p>
                  {data && <p className="text-muted">Arrives {formatDate(data.delivery.earliest, { day: "numeric", month: "short" })} – {formatDate(data.delivery.latest, { day: "numeric", month: "short" })}</p>}
                </ReviewBlock>
                <ReviewBlock title="Payment" onEdit={() => goto(4)}><p>{provider === "STRIPE" ? "Card (Stripe)" : provider === "RAZORPAY" ? "UPI / Cards / Netbanking (Razorpay)" : "—"}</p></ReviewBlock>
              </dl>
              {formError && <p role="alert" className="rounded-xl bg-coral-500/10 p-3 text-sm font-semibold text-coral-700">{formError}</p>}
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => goto(4)} disabled={busy}>Back</button>
                <button type="button" className="btn btn-pink btn-lg flex-1 sm:flex-none" disabled={busy || !data || blocked || purchasable.length === 0 || !provider} onClick={() => void place()}>
                  {busy ? "Opening secure payment…" : `Pay ${data ? formatMoney(data.totals.totalCents) : ""}`}
                </button>
              </div>
              <p className="text-center text-xs text-muted">By placing your order you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/shipping-returns" className="underline">Return policy</Link>.</p>
            </section>
          )}
          {step !== 5 && formError && <p role="alert" className="rounded-xl bg-coral-500/10 p-3 text-sm font-semibold text-coral-700">{formError}</p>}
        </div>

        <aside aria-label="Order summary" className="lg:sticky lg:top-28 lg:self-start">
          <div className="card space-y-4 p-5 sm:p-6">
            <h2 className="text-2xl font-semibold">Order summary</h2>
            {loading && !data ? (
              <div className="space-y-3" aria-busy="true"><div className="skeleton h-20" /><div className="skeleton h-20" /></div>
            ) : data ? (
              <>
                <ul className="divide-y divide-plum-100">{data.lines.map((l) => <CartLineRow key={l.variantId} line={l} compact />)}</ul>
                {data.coupon && !data.coupon.valid && <p className="text-sm font-semibold text-coral-700" role="status">Code “{data.coupon.code}”: {data.coupon.message}</p>}
                <OrderSummary data={data} />
              </>
            ) : null}
            <Link href="/cart" className="block text-center text-sm font-semibold text-plum-700 underline underline-offset-4">Edit bag</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-plum-50 p-4">
      <div className="mb-1 flex items-center justify-between">
        <dt className="font-bold">{title}</dt>
        <button type="button" onClick={onEdit} className="text-xs font-bold text-plum-700 underline">Edit</button>
      </div>
      <dd className="space-y-0.5 text-plum-800">{children}</dd>
    </div>
  );
}
