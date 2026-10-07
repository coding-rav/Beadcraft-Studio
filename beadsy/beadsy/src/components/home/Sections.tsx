import Link from "next/link";
import { BeadArt } from "@/components/art/BeadArt";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Stars } from "@/components/ui/Stars";
import { ProductGrid } from "@/components/product/ProductGrid";
import type { ArtKind, ProductCardDTO } from "@/lib/types";
import { siteConfig } from "@/lib/config";

/* ------------------------------------------------------------------ hero */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-[420px] rounded-full bg-bubblegum-100 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-24 size-[380px] rounded-full bg-mint-100 blur-3xl" />
      <div className="container-x relative grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
        <div className="animate-fade-up text-center lg:text-left">
          <p className="eyebrow mb-4">Handmade · Small-batch · Made to gift</p>
          <h1 id="hero-title" className="text-[2.9rem] leading-[1.02] font-semibold sm:text-6xl lg:text-7xl">
            Small Beads.
            <span className="block text-plum-600 italic">Big Vibes.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-plum-800 lg:mx-0">
            Handpicked beads, beautiful designs, and little things made to brighten your day.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/shop" className="btn btn-primary btn-lg">
              Shop Collection
            </Link>
            <Link href="/shop?sort=best" className="btn btn-secondary btn-lg">
              Explore Best Sellers
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-plum-700 lg:justify-start">
            <li className="inline-flex items-center gap-1.5"><Icon name="sparkle" size={16} className="text-sun-700" /> Handmade</li>
            <li className="inline-flex items-center gap-1.5"><Icon name="truck" size={16} className="text-plum-600" /> Ships across India</li>
            <li className="inline-flex items-center gap-1.5"><Icon name="gift" size={16} className="text-bubblegum-600" /> Gift-ready</li>
          </ul>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[460px]">
          <div className="animate-float absolute inset-[6%] overflow-hidden rounded-[2.5rem] border-4 border-white shadow-pop">
            <BeadArt kind="bracelet" palette={["#F58FB0", "#F8D26B", "#9B79AE", "#98C99A", "#F9B1C9"]} seed={7} label="A pastel handmade bead bracelet" />
          </div>
          <div className="absolute -top-1 -left-1 size-28 rotate-[-8deg] overflow-hidden rounded-3xl border-4 border-white shadow-soft sm:size-32" style={{ animation: "float 6s ease-in-out infinite 1s" }}>
            <BeadArt kind="charm" palette={["#9B79AE", "#F58FB0", "#F8D26B"]} seed={3} />
          </div>
          <div className="absolute -right-1 -bottom-1 size-32 rotate-[6deg] overflow-hidden rounded-3xl border-4 border-white shadow-soft sm:size-36" style={{ animation: "float 8s ease-in-out infinite 2s" }}>
            <BeadArt kind="keychain" palette={["#98C99A", "#F8D26B", "#F58FB0", "#9B79AE"]} seed={9} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- headings */
export function SectionHeader({ eyebrow, title, href, linkLabel = "View all" }: { eyebrow?: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-bold text-plum-700 underline underline-offset-4 hover:text-plum-900">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export function ProductSection({ eyebrow, title, href, products, id }: { eyebrow?: string; title: string; href?: string; products: ProductCardDTO[]; id: string }) {
  if (products.length === 0) return null;
  return (
    <section id={id} aria-label={title} className="container-x mt-16 sm:mt-24">
      <SectionHeader eyebrow={eyebrow} title={title} href={href} />
      <ProductGrid products={products.slice(0, 4)} columns="four" />
    </section>
  );
}

/* ------------------------------------------------------------- categories */
const CATEGORY_ART: Record<string, { kind: ArtKind; palette: string[] }> = {
  bracelets: { kind: "bracelet", palette: ["#F58FB0", "#F8D26B", "#9B79AE", "#98C99A"] },
  necklaces: { kind: "necklace", palette: ["#9B79AE", "#F9B1C9", "#F8D26B", "#BFE0C0"] },
  keychains: { kind: "keychain", palette: ["#98C99A", "#F58FB0", "#F8D26B", "#9B79AE"] },
  charms: { kind: "charm", palette: ["#F8D26B", "#F58FB0", "#9B79AE"] },
  anklets: { kind: "anklet", palette: ["#8EC3E6", "#F8D26B", "#F58FB0", "#98C99A"] },
  "gift-sets": { kind: "giftset", palette: ["#F58FB0", "#9B79AE", "#98C99A", "#F8D26B"] },
};

export function CategoryTiles({ categories }: { categories: { slug: string; name: string; count: number }[] }) {
  if (!categories.length) return null;
  return (
    <section aria-labelledby="cat-title" className="container-x mt-16 sm:mt-24">
      <div className="mb-6 sm:mb-8">
        <p className="eyebrow mb-1.5">Find your thing</p>
        <h2 id="cat-title" className="section-title">Shop by category</h2>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-6">
        {categories.map((c, i) => {
          const art = CATEGORY_ART[c.slug] ?? { kind: "charm" as ArtKind, palette: ["#9B79AE", "#F58FB0", "#F8D26B"] };
          return (
            <li key={c.slug}>
              <Link href={`/shop/${c.slug}`} className="group card block overflow-hidden text-center transition duration-300 hover:-translate-y-1 hover:shadow-pop">
                <div className="aspect-square overflow-hidden transition duration-500 group-hover:scale-105">
                  <BeadArt kind={art.kind} palette={art.palette} seed={i * 5 + 2} />
                </div>
                <div className="relative bg-white p-3">
                  <h3 className="font-sans text-base font-bold">{c.name}</h3>
                  <p className="text-xs text-muted">{c.count} {c.count === 1 ? "piece" : "pieces"}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------------- promo */
export function PromoBanner() {
  return (
    <section aria-labelledby="promo-title" className="container-x mt-16 sm:mt-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-plum-700 px-6 py-10 text-white sm:px-12 sm:py-14">
        <div aria-hidden="true" className="absolute -right-10 -bottom-10 size-64 opacity-90 sm:size-80">
          <BeadArt kind="giftset" palette={["#F58FB0", "#F8D26B", "#98C99A", "#C5A9DB"]} seed={21} bare />
        </div>
        <div className="relative max-w-xl">
          <p className="mb-2 text-xs font-bold tracking-[0.18em] text-sun-300 uppercase">Gift season</p>
          <h2 id="promo-title" className="!text-white text-3xl font-semibold sm:text-5xl">Build a little bundle of joy</h2>
          <p className="mt-3 text-plum-100">Pick a bracelet, a keychain and a charm — wrapped, tagged and ready to give. Our gift sets are made for birthdays, friendships and “just because”.</p>
          <Link href="/shop/gift-sets" className="btn btn-pink btn-lg mt-6">
            Shop gift sets
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- why beadsy */
const WHY: { icon: IconName; title: string; text: string; bg: string }[] = [
  { icon: "sparkle", title: "Truly handmade", text: "Every piece is strung by hand in small batches — no two are exactly alike.", bg: "bg-bubblegum-100" },
  { icon: "gift", title: "Gift-ready", text: "Cute packaging on every order, so it's ready to hand over the moment it arrives.", bg: "bg-sun-100" },
  { icon: "truck", title: "Fast, tracked shipping", text: "Dispatched within 2 working days, with free shipping on bigger bags.", bg: "bg-mint-100" },
  { icon: "shield", title: "Safe checkout", text: "Pay by UPI, cards or netbanking through trusted, encrypted payment partners.", bg: "bg-plum-100" },
];

export function WhyBeadsy() {
  return (
    <section aria-labelledby="why-title" className="container-x mt-16 sm:mt-24">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-1.5">Why Beadsy</p>
        <h2 id="why-title" className="section-title">Small things, done with care</h2>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map((w) => (
          <li key={w.title} className="card p-6 text-center">
            <span className={`mx-auto mb-4 grid size-14 place-items-center rounded-full ${w.bg} text-plum-700`}>
              <Icon name={w.icon} size={26} />
            </span>
            <h3 className="font-sans text-lg font-bold">{w.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{w.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- story */
export function HandmadeStory() {
  return (
    <section aria-labelledby="story-title" className="container-x mt-16 sm:mt-24">
      <div className="grid items-center gap-8 rounded-[2rem] bg-cream-200 p-6 sm:p-10 lg:grid-cols-2 lg:gap-14">
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
          <div className="aspect-[4/5] overflow-hidden rounded-3xl border-4 border-white shadow-soft">
            <BeadArt kind="necklace" palette={["#9B79AE", "#F58FB0", "#F8D26B", "#98C99A"]} seed={31} />
          </div>
          <div className="mt-8 aspect-[4/5] overflow-hidden rounded-3xl border-4 border-white shadow-soft">
            <BeadArt kind="anklet" palette={["#F8D26B", "#8EC3E6", "#F58FB0", "#98C99A"]} seed={12} />
          </div>
        </div>
        <div>
          <p className="eyebrow mb-2">Our story</p>
          <h2 id="story-title" className="section-title">Made by hand, one tiny bead at a time</h2>
          <p className="mt-4 text-plum-800">
            Beadsy started with a tray of mismatched beads and a very good playlist. We love colour, we love tiny details, and we love the moment someone opens a little package made just for them.
          </p>
          <p className="mt-3 text-plum-800">
            Every bracelet, keychain and charm is designed, strung and checked by hand — in small batches, so each piece keeps its personality.
          </p>
          <Link href="/about" className="btn btn-secondary mt-6">
            Read our story
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- reviews */
export interface HomeReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  author: string;
  productName: string;
  productSlug: string;
}

export function ReviewsSection({ reviews }: { reviews: HomeReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="reviews-title" className="container-x mt-16 sm:mt-24">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-1.5">Kind words</p>
        <h2 id="reviews-title" className="section-title">Loved by our customers</h2>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {reviews.slice(0, 3).map((r) => (
          <li key={r.id} className="card flex flex-col p-6">
            <Stars rating={r.rating} />
            <h3 className="mt-3 font-sans text-lg font-bold">{r.title}</h3>
            <p className="mt-2 line-clamp-5 flex-1 text-sm text-plum-800">{r.body}</p>
            <div className="mt-4 flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold">
                {r.author}
                {r.verified && <span className="badge ml-2 bg-mint-100 text-mint-700">Verified buyer</span>}
              </span>
              <Link href={`/product/${r.productSlug}`} className="truncate text-xs font-semibold text-plum-600 hover:underline">
                {r.productName}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------- newsletter */
export function NewsletterBand({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="news-title" className="container-x mt-16 sm:mt-24">
      <div className="rounded-[2rem] bg-bubblegum-100 px-6 py-10 text-center sm:px-12 sm:py-14">
        <h2 id="news-title" className="section-title">Join the Beadsy club 💌</h2>
        <p className="mx-auto mt-2 mb-6 max-w-md text-plum-800">New drops, restocks and a little welcome gift: 10% off your first order.</p>
        <div className="flex justify-center">{children}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- gallery */
const GALLERY: { kind: ArtKind; palette: string[]; seed: number }[] = [
  { kind: "bracelet", palette: ["#F58FB0", "#F8D26B", "#98C99A"], seed: 41 },
  { kind: "keychain", palette: ["#9B79AE", "#F58FB0", "#F8D26B"], seed: 42 },
  { kind: "charm", palette: ["#98C99A", "#F8D26B", "#F58FB0"], seed: 43 },
  { kind: "necklace", palette: ["#F9B1C9", "#9B79AE", "#F8D26B"], seed: 44 },
  { kind: "anklet", palette: ["#8EC3E6", "#F58FB0", "#F8D26B"], seed: 45 },
  { kind: "giftset", palette: ["#F58FB0", "#98C99A", "#9B79AE"], seed: 46 },
];

export function SocialGallery() {
  const url = siteConfig.instagramUrl;
  const tiles = GALLERY.map((g, i) => (
    <li key={i} className="aspect-square overflow-hidden rounded-2xl transition duration-300 hover:scale-[1.04] hover:rotate-1">
      <BeadArt kind={g.kind} palette={g.palette} seed={g.seed} />
    </li>
  ));
  return (
    <section aria-labelledby="gram-title" className="container-x mt-16 sm:mt-24">
      <div className="mb-6 text-center">
        <p className="eyebrow mb-1.5">#BeadsyVibes</p>
        <h2 id="gram-title" className="section-title">Wear it. Gift it. Share it.</h2>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm mt-3">
            <Icon name="instagram" size={16} /> Follow us on Instagram
          </a>
        ) : (
          <p className="mt-2 text-sm text-muted">Tag your Beadsy pieces with #BeadsyVibes to be featured.</p>
        )}
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">{tiles}</ul>
    </section>
  );
}
