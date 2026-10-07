import { discountPercent, formatMoney } from "@/lib/money";

export function Price({
  priceCents,
  salePriceCents,
  size = "md",
}: {
  priceCents: number;
  salePriceCents?: number | null;
  size?: "sm" | "md" | "lg";
}) {
  const onSale = salePriceCents != null && salePriceCents < priceCents;
  const big = size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={`${big} font-bold ${onSale ? "text-bubblegum-700" : "text-plum-900"}`}>
        {formatMoney(onSale ? salePriceCents! : priceCents)}
      </span>
      {onSale && (
        <>
          <s className="text-sm text-muted" aria-label={`Original price ${formatMoney(priceCents)}`}>
            {formatMoney(priceCents)}
          </s>
          <span className="badge bg-bubblegum-100 text-bubblegum-700">{discountPercent(priceCents, salePriceCents)}% off</span>
        </>
      )}
    </span>
  );
}
