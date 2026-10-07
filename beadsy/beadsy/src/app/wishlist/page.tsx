import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { WishlistView } from "./WishlistView";

export const metadata: Metadata = buildMetadata({ title: "Your wishlist", path: "/wishlist", noIndex: true });

export default function WishlistPage() {
  return <WishlistView />;
}
