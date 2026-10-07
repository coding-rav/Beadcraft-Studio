import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { commerceConfig } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { StaticPage } from "@/components/ui/StaticPage";

export const metadata: Metadata = buildMetadata({ title: "Shipping & returns", description: "Delivery times, shipping costs and our 7-day return policy.", path: "/shipping-returns" });

export default function ShippingReturnsPage() {
  const s = commerceConfig.deliveryEstimates;
  return (
    <StaticPage eyebrow="Help" title="Shipping & returns">
      <h2>Shipping</h2>
      <ul>
        <li>Orders are packed and dispatched within 2 working days.</li>
        <li><strong>Standard:</strong> {s.STANDARD.minDays}–{s.STANDARD.maxDays} working days · {formatMoney(commerceConfig.standardShippingCents)} (free on orders over {formatMoney(commerceConfig.freeShippingOverCents)}).</li>
        <li><strong>Express:</strong> {s.EXPRESS.minDays}–{s.EXPRESS.maxDays} working days · {formatMoney(commerceConfig.expressShippingCents)}.</li>
        <li>We currently deliver within India only.</li>
      </ul>
      <h2>Returns</h2>
      <p>If you're not happy, you can return unworn items in their original packaging within 7 days of delivery. Because each piece is handmade to order, custom designs can't be returned unless they arrive damaged.</p>
      <h2>Damaged or wrong item?</h2>
      <p>Contact us with your order number and a photo within 48 hours of delivery and we'll make it right with a replacement or refund.</p>
      <h2>Refunds</h2>
      <p>Approved refunds go back to your original payment method and usually appear within 5–7 working days.</p>
    </StaticPage>
  );
}
