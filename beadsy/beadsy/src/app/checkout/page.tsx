import type { Metadata } from "next";
import { Suspense } from "react";
import { buildMetadata } from "@/lib/seo";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { PageSkeleton } from "@/components/ui/States";

export const metadata: Metadata = buildMetadata({ title: "Checkout", path: "/checkout", noIndex: true });

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckoutFlow />
    </Suspense>
  );
}
