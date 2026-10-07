import { formatMoney } from "@/lib/money";
import { commerceConfig } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import type { CartValidationDTO } from "@/lib/types";

export function OrderSummary({ data }: { data: CartValidationDTO }) {
  const t = data.totals;
  return (
    <dl className="space-y-2.5 text-sm">
      <Row label="Subtotal" value={formatMoney(t.subtotalCents)} />
      {t.discountCents > 0 && <Row label={`Discount${data.coupon?.valid ? ` (${data.coupon.code})` : ""}`} value={`− ${formatMoney(t.discountCents)}`} tone="good" />}
      <Row label={`Shipping · ${data.delivery.label}`} value={t.shippingCents === 0 ? "Free" : formatMoney(t.shippingCents)} tone={t.shippingCents === 0 ? "good" : undefined} />
      <div className="my-3 border-t border-plum-100" />
      <div className="flex items-baseline justify-between">
        <dt className="text-base font-bold">Total</dt>
        <dd className="text-2xl font-bold">{formatMoney(t.totalCents)}</dd>
      </div>
      <p className="text-xs text-muted">
        {commerceConfig.taxInclusive ? `Includes ${formatMoney(t.taxCents)} GST (${commerceConfig.taxRateBps / 100}%)` : `Includes ${formatMoney(t.taxCents)} GST`}
      </p>
      <p className="rounded-xl bg-plum-50 p-3 text-xs text-plum-800">
        🚚 Estimated delivery: <strong>{formatDate(data.delivery.earliest, { day: "numeric", month: "short" })} – {formatDate(data.delivery.latest, { day: "numeric", month: "short" })}</strong>
      </p>
    </dl>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-semibold ${tone === "good" ? "text-mint-700" : ""}`}>{value}</dd>
    </div>
  );
}
