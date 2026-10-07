import { siteConfig, commerceConfig } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { configuredProviders } from "@/lib/payments/config";
import { PageHead } from "@/components/admin/AdminUI";

function Flag({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={`mt-1 size-3 shrink-0 rounded-full ${ok ? "bg-mint-500" : "bg-coral-500"}`} aria-hidden="true" />
      <span className="text-sm"><strong>{label}</strong> — {ok ? "configured" : "not configured"}<span className="block text-muted">{hint}</span></span>
    </li>
  );
}

export default function AdminSettings() {
  const p = configuredProviders();
  const e = process.env;
  return (
    <div className="space-y-6">
      <PageHead title="Settings" />
      <section className="card p-5" aria-labelledby="int"><h3 id="int" className="font-sans text-lg font-bold">Integrations</h3>
        <p className="mb-2 text-sm text-muted">Only whether a value is set is shown — secrets are never displayed.</p>
        <ul className="divide-y divide-plum-100">
          <Flag ok={Boolean(e.DATABASE_URL)} label="Database" hint="DATABASE_URL" />
          <Flag ok={Boolean(e.AUTH_SECRET && e.AUTH_SECRET.length >= 32)} label="Session secret" hint="AUTH_SECRET (32+ characters)" />
          <Flag ok={p.stripe} label="Stripe payments" hint="STRIPE_SECRET_KEY" />
          <Flag ok={Boolean(e.STRIPE_WEBHOOK_SECRET)} label="Stripe webhook" hint={`STRIPE_WEBHOOK_SECRET · endpoint ${siteConfig.url}/api/webhooks/stripe`} />
          <Flag ok={p.razorpay} label="Razorpay payments" hint="RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET" />
          <Flag ok={Boolean(e.RAZORPAY_WEBHOOK_SECRET)} label="Razorpay webhook" hint={`RAZORPAY_WEBHOOK_SECRET · endpoint ${siteConfig.url}/api/webhooks/razorpay`} />
          <Flag ok={Boolean(e.BLOB_READ_WRITE_TOKEN)} label="Image uploads" hint="BLOB_READ_WRITE_TOKEN (Vercel Blob)" />
          <Flag ok={Boolean(e.RESEND_API_KEY)} label="Transactional email" hint="RESEND_API_KEY + EMAIL_FROM" />
          <Flag ok={Boolean(e.CRON_SECRET)} label="Stock-release cron" hint="CRON_SECRET" />
        </ul>
      </section>
      <section className="card p-5 text-sm" aria-labelledby="cm"><h3 id="cm" className="mb-2 font-sans text-lg font-bold">Store rules</h3>
        <p className="mb-2 text-muted">Edit these in <code>src/lib/config.ts</code> and redeploy.</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
          <dt className="font-semibold">Standard shipping</dt><dd>{formatMoney(commerceConfig.standardShippingCents)}</dd>
          <dt className="font-semibold">Express shipping</dt><dd>{formatMoney(commerceConfig.expressShippingCents)}</dd>
          <dt className="font-semibold">Free shipping over</dt><dd>{formatMoney(commerceConfig.freeShippingOverCents)}</dd>
          <dt className="font-semibold">GST</dt><dd>{commerceConfig.taxRateBps / 100}% ({commerceConfig.taxInclusive ? "included in prices" : "added at checkout"})</dd>
          <dt className="font-semibold">Stock hold time</dt><dd>{commerceConfig.reservationMinutes} minutes</dd>
        </dl>
      </section>
    </div>
  );
}
