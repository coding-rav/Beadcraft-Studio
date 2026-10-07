import type { Metadata } from "next";
import { siteConfig } from "./config";

export function absoluteUrl(path = "/"): string {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildMetadata(opts: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
}): Metadata {
  const title = opts.title ? `${opts.title} | ${siteConfig.name}` : `${siteConfig.name} — ${siteConfig.tagline}`;
  const description = opts.description ?? siteConfig.description;
  const url = absoluteUrl(opts.path ?? "/");
  const image = opts.image ?? absoluteUrl("/og.png");
  return {
    title: opts.title ?? { absolute: title },
    description,
    alternates: { canonical: url },
    robots: opts.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: "en_IN",
      type: opts.type ?? "website",
      images: [{ url: image, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** Serialises JSON-LD safely for a <script> tag (escapes "<" so content can't close the tag). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl("/brand/logo-full.png"),
    slogan: siteConfig.tagline,
    ...(siteConfig.instagramUrl ? { sameAs: [siteConfig.instagramUrl] } : {}),
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteConfig.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}
