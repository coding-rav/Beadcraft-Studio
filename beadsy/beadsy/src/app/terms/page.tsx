import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { StaticPage } from "@/components/ui/StaticPage";

export const metadata: Metadata = buildMetadata({ title: "Terms of service", description: "The terms that apply when you shop at Beadsy.", path: "/terms" });

export default function TermsPage() {
  return (
    <StaticPage eyebrow="Legal" title="Terms of service" intro="Last updated: October 2026. This is a plain-language template — have it reviewed for your business before launch.">
      <h2>Orders</h2>
      <p>By placing an order you confirm that the information you give is accurate. An order is confirmed once payment has been successfully received. We may cancel and refund an order if an item is unavailable or a pricing error has occurred.</p>
      <h2>Prices</h2>
      <p>Prices are shown in Indian rupees and include GST. Shipping is shown at checkout before you pay.</p>
      <h2>Handmade products</h2>
      <p>Because items are handmade, small variations in colour, bead size and shape are normal and are part of their charm.</p>
      <h2>Returns</h2>
      <p>Our returns policy is described on the Shipping & returns page.</p>
      <h2>Liability</h2>
      <p>Our jewellery is not suitable for very young children because of small parts. To the extent permitted by law, our liability is limited to the price paid for the product.</p>
    </StaticPage>
  );
}
