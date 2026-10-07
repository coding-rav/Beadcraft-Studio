import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { NewsletterForm } from "./NewsletterForm";

const COLS = [
  {
    title: "Shop",
    links: [
      ["All products", "/shop"],
      ["Bracelets", "/shop/bracelets"],
      ["Necklaces", "/shop/necklaces"],
      ["Keychains", "/shop/keychains"],
      ["Gift sets", "/shop/gift-sets"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Shipping & returns", "/shipping-returns"],
      ["Contact us", "/contact"],
      ["Track an order", "/account/orders"],
      ["Wishlist", "/wishlist"],
    ],
  },
  {
    title: "Beadsy",
    links: [
      ["Our story", "/about"],
      ["Privacy policy", "/privacy"],
      ["Terms of service", "/terms"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-plum-100 bg-plum-900 text-plum-100">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.3fr_2fr]">
        <div>
          <div className="w-40 rounded-2xl bg-cream-100 p-3">
            <Logo variant="wordmark" />
          </div>
          <p className="mt-4 max-w-xs text-sm text-plum-200">
            {siteConfig.tagline} Handpicked beads, beautiful designs, and little things made to brighten your day.
          </p>
          <div className="mt-6">
            <p className="mb-2 text-sm font-bold text-white">Get 10% off your first order</p>
            <NewsletterForm tone="dark" />
          </div>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLS.map((c) => (
            <div key={c.title}>
              <h2 className="mb-3 font-sans text-sm font-bold tracking-widest text-white uppercase">{c.title}</h2>
              <ul className="space-y-2 text-sm">
                {c.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-plum-200 transition hover:text-white hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-xs text-plum-300 sm:flex-row">
          <p>© {new Date().getFullYear()} Beadsy. Made with 💜 and a lot of tiny beads.</p>
          <div className="flex items-center gap-4">
            {siteConfig.instagramUrl && (
              <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
                <Icon name="instagram" size={16} /> Instagram
              </a>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Icon name="lock" size={14} /> Secure checkout
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
