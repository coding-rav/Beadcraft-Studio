import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { CartView } from "./CartView";

export const metadata: Metadata = buildMetadata({ title: "Your bag", path: "/cart", noIndex: true });

export default function CartPage() {
  return <CartView />;
}
