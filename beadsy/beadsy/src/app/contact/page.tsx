import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/config";
import { StaticPage } from "@/components/ui/StaticPage";

export const metadata: Metadata = buildMetadata({ title: "Contact us", description: "Questions about an order, a custom design or wholesale? Get in touch with Beadsy.", path: "/contact" });

export default function ContactPage() {
  const email = siteConfig.contactEmail;
  const ig = siteConfig.instagramUrl;
  return (
    <StaticPage eyebrow="Say hello" title="Contact us" intro="Questions about an order, a custom design, or wholesale? We'd love to hear from you.">
      {email && (
        <>
          <h2>Email</h2>
          <p><a href={`mailto:${email}`}>{email}</a> — we usually reply within 1–2 working days.</p>
        </>
      )}
      {ig && (
        <>
          <h2>Instagram</h2>
          <p><a href={ig} target="_blank" rel="noopener noreferrer">Message us on Instagram</a></p>
        </>
      )}
      {!email && !ig && <p>Our contact details are being set up. Please check back shortly.</p>}
      <h2>Order help</h2>
      <p>Please include your order number (it looks like <strong>BD-XXXXXX</strong>) so we can find your order quickly.</p>
    </StaticPage>
  );
}
