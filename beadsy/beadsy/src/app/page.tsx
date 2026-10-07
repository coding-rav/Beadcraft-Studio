import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { getHomeData } from "@/lib/home";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import {
  CategoryTiles,
  HandmadeStory,
  Hero,
  NewsletterBand,
  ProductSection,
  PromoBanner,
  ReviewsSection,
  SocialGallery,
  WhyBeadsy,
} from "@/components/home/Sections";

export const dynamic = "force-dynamic"; // data is cached for 60s inside getHomeData; avoids needing a database at build time

export const metadata: Metadata = buildMetadata({ path: "/" });

export default async function HomePage() {
  const data = await getHomeData();
  const best = data.best.length ? data.best : data.featured;
  return (
    <>
      <Hero />
      <ProductSection id="featured" eyebrow="Hand-picked" title="Featured favourites" href="/shop" products={data.featured.length ? data.featured : data.newest} />
      <CategoryTiles categories={data.categories} />
      <ProductSection id="new" eyebrow="Just landed" title="New arrivals" href="/shop?sort=newest" products={data.newest} />
      <PromoBanner />
      <ProductSection id="best" eyebrow="Everyone's obsessed" title="Best sellers" href="/shop?sort=best" products={best} />
      <WhyBeadsy />
      <HandmadeStory />
      <ReviewsSection reviews={data.reviews} />
      <NewsletterBand>
        <NewsletterForm />
      </NewsletterBand>
      <SocialGallery />
    </>
  );
}
