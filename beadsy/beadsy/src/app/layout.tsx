import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { organizationLd, websiteLd } from "@/lib/seo";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { JsonLd } from "@/components/ui/JsonLd";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["SOFT", "opsz"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
    locale: "en_IN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Beadsy — Small Beads. Big Vibes." }],
  },
  twitter: { card: "summary_large_image", title: `${siteConfig.name} — ${siteConfig.tagline}`, description: siteConfig.description, images: ["/og.png"] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fdf7ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <StoreProvider>
          <AnnouncementBar />
          <Header />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer />
          <CartDrawer />
        </StoreProvider>
        <JsonLd data={organizationLd()} />
        <JsonLd data={websiteLd()} />
      </body>
    </html>
  );
}
