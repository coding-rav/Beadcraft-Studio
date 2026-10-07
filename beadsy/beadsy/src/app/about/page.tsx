import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { BeadArt } from "@/components/art/BeadArt";
import { StaticPage } from "@/components/ui/StaticPage";

export const metadata: Metadata = buildMetadata({
  title: "Our story",
  description: "Beadsy is a small handmade bead brand. Learn how every bracelet, keychain and charm is designed and strung by hand.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <StaticPage eyebrow="Our story" title="Small beads. Big vibes." intro="Beadsy is a tiny studio making colourful, handmade bead jewellery and gifts.">
      <div className="mb-8 aspect-[16/9] overflow-hidden rounded-3xl border-4 border-white shadow-soft">
        <BeadArt kind="giftset" palette={["#F58FB0", "#F8D26B", "#98C99A", "#9B79AE"]} seed={77} />
      </div>
      <p>Beadsy started with a tray of mismatched beads and a very good playlist. We love colour, we love tiny details, and we love the moment someone opens a little package made just for them.</p>
      <h2>Made by hand</h2>
      <p>Every bracelet, keychain, charm and necklace is designed, strung and checked by hand, in small batches. That means each piece has a little personality of its own — and it means we'd rather make fewer things well than a lot of things quickly.</p>
      <h2>What we care about</h2>
      <ul>
        <li>Bright, happy colour combinations that are easy to wear every day.</li>
        <li>Sturdy stringing and finishing, so your favourites last.</li>
        <li>Gift-ready packaging on every order.</li>
        <li>Honest descriptions and fair prices.</li>
      </ul>
      <p>Ready to find your favourite? <Link href="/shop">Browse the collection</Link>.</p>
    </StaticPage>
  );
}
