import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { db } from "@/lib/db";
import { absoluteUrl, breadcrumbLd, buildMetadata } from "@/lib/seo";
import { commerceConfig } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { JsonLd } from "@/components/ui/JsonLd";
import { Stars } from "@/components/ui/Stars";
import { Gallery } from "@/components/product/Gallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { Reviews } from "@/components/product/Reviews";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ProductGrid } from "@/components/product/ProductGrid";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const SLUG = /^[a-z0-9-]{1,100}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG.test(slug)) return { title: "Product not found", robots: { index: false } };
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const img = p.card.images[0]?.url ?? undefined;
  return buildMetadata({
    title: p.card.name,
    description: p.card.shortDescription,
    path: `/product/${slug}`,
    image: img,
  });
}

const FAQ = (name: string) => [
  { q: "Is this handmade?", a: `Yes — every ${name} is strung by hand in small batches, so slight variations in bead size and shade are part of its charm.` },
  { q: "How long does delivery take?", a: `Standard delivery takes ${commerceConfig.deliveryEstimates.STANDARD.minDays}–${commerceConfig.deliveryEstimates.STANDARD.maxDays} working days across India. Express takes ${commerceConfig.deliveryEstimates.EXPRESS.minDays}–${commerceConfig.deliveryEstimates.EXPRESS.maxDays} working days.` },
  { q: "Can I return or exchange it?", a: "Yes. Unworn items in their original packaging can be returned within 7 days of delivery. Write to us and we'll sort it out." },
  { q: "How do I look after my beads?", a: "Keep them dry, take them off before swimming, showering or sleeping, and store them flat in the pouch they arrived in." },
];

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const { card } = p;

  const category = await db.category.findFirst({ where: { slug: card.categorySlug }, select: { id: true } });
  const [related, reviewSamples] = await Promise.all([
    getRelatedProducts(card.id, category?.id ?? "", 4),
    db.review.findMany({ where: { productId: card.id, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } } } }),
  ]);

  const url = absoluteUrl(`/product/${card.slug}`);
  const price = (card.salePriceCents ?? card.priceCents) / 100;
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: card.name,
    description: card.shortDescription,
    sku: p.sku,
    category: card.categoryName,
    url,
    image: card.images.map((i) => i.url).filter((u): u is string => Boolean(u)).concat(card.images.every((i) => !i.url) ? [absoluteUrl("/og.png")] : []),
    brand: { "@type": "Brand", name: "Beadsy" },
    ...(p.material ? { material: p.material } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: price.toFixed(2),
      availability: card.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(card.reviewCount > 0
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: card.rating.toFixed(1), reviewCount: card.reviewCount },
          review: reviewSamples.map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.user.name.split(" ")[0] },
            name: r.title,
            reviewBody: r.body,
            datePublished: r.createdAt.toISOString().slice(0, 10),
          })),
        }
      : {}),
  };
  const faq = FAQ(card.name);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: card.categoryName, path: `/shop/${card.categorySlug}` },
    { name: card.name, path: `/product/${card.slug}` },
  ];

  return (
    <div className="container-x py-6 sm:py-10">
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={faqLd} />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i === crumbs.length - 1 ? <span aria-current="page" className="font-semibold text-plum-800">{c.name}</span> : <Link href={c.path} className="hover:underline">{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <Gallery images={card.images} name={card.name} />

        <div>
          <p className="eyebrow mb-2">
            <Link href={`/shop/${card.categorySlug}`} className="hover:underline">{card.categoryName}</Link>
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{card.name}</h1>
          <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm">
            {card.reviewCount > 0 ? (
              <>
                <Stars rating={card.rating} />
                <span className="font-semibold">{card.rating.toFixed(1)}</span>
                <span className="text-muted underline">({card.reviewCount} reviews)</span>
              </>
            ) : (
              <span className="text-muted underline">Be the first to review</span>
            )}
          </a>
          <p className="mt-4 text-plum-800">{card.shortDescription}</p>
          <div className="mt-6">
            <PurchasePanel
              productId={card.id}
              name={card.name}
              priceCents={card.priceCents}
              salePriceCents={card.salePriceCents}
              variants={p.variants.map((v) => ({ id: v.id, name: v.name, color: v.color, priceCents: v.priceCents, available: v.available }))}
            />
          </div>
        </div>
      </div>

      <section aria-labelledby="details-h" className="mt-14 grid gap-4 lg:grid-cols-2">
        <h2 id="details-h" className="sr-only">Product details</h2>
        <details open className="card group p-5">
          <summary className="cursor-pointer list-none font-sans text-lg font-bold">Description</summary>
          <div className="prose-beadsy mt-3">
            {p.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </details>
        <details open className="card p-5">
          <summary className="cursor-pointer list-none font-sans text-lg font-bold">Specifications</summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-semibold">SKU</dt><dd className="text-plum-800">{p.sku}</dd>
            {p.material && (<><dt className="font-semibold">Materials</dt><dd className="text-plum-800">{p.material}</dd></>)}
            {p.dimensions && (<><dt className="font-semibold">Dimensions</dt><dd className="text-plum-800">{p.dimensions}</dd></>)}
            {p.colors.length > 0 && (<><dt className="font-semibold">Colours</dt><dd className="text-plum-800 capitalize">{p.colors.join(", ")}</dd></>)}
            <dt className="font-semibold">Made</dt><dd className="text-plum-800">By hand, in small batches</dd>
          </dl>
        </details>
        {p.care && (
          <details className="card p-5">
            <summary className="cursor-pointer list-none font-sans text-lg font-bold">Care instructions</summary>
            <p className="prose-beadsy mt-3 text-sm">{p.care}</p>
          </details>
        )}
        <details className="card p-5">
          <summary className="cursor-pointer list-none font-sans text-lg font-bold">Shipping & returns</summary>
          <ul className="prose-beadsy mt-3 text-sm">
            <li>Dispatched within 2 working days.</li>
            <li>Standard delivery: {commerceConfig.deliveryEstimates.STANDARD.minDays}–{commerceConfig.deliveryEstimates.STANDARD.maxDays} working days ({formatMoney(commerceConfig.standardShippingCents)}, free over {formatMoney(commerceConfig.freeShippingOverCents)}).</li>
            <li>Express delivery: {commerceConfig.deliveryEstimates.EXPRESS.minDays}–{commerceConfig.deliveryEstimates.EXPRESS.maxDays} working days ({formatMoney(commerceConfig.expressShippingCents)}).</li>
            <li>Returns accepted within 7 days of delivery for unworn items. See our <Link href="/shipping-returns">full policy</Link>.</li>
          </ul>
        </details>
      </section>

      <Reviews productId={card.id} productName={card.name} avg={card.rating} count={card.reviewCount} />

      <section aria-labelledby="faq-h" className="mt-16 sm:mt-24">
        <h2 id="faq-h" className="section-title mb-6">Questions, answered</h2>
        <div className="space-y-3">
          {faq.map((f) => (
            <details key={f.q} className="card p-5">
              <summary className="cursor-pointer list-none font-sans text-base font-bold">{f.q}</summary>
              <p className="prose-beadsy mt-2 text-sm">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-h" className="mt-16 sm:mt-24">
          <h2 id="related-h" className="section-title mb-6">You might also like</h2>
          <ProductGrid products={related} columns="four" />
        </section>
      )}

      <RecentlyViewed excludeId={card.id} />
    </div>
  );
}
