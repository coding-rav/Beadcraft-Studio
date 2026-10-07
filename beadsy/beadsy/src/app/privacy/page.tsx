import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { StaticPage } from "@/components/ui/StaticPage";

export const metadata: Metadata = buildMetadata({ title: "Privacy policy", description: "How Beadsy collects, uses and protects your personal information.", path: "/privacy" });

export default function PrivacyPage() {
  return (
    <StaticPage eyebrow="Legal" title="Privacy policy" intro="Last updated: October 2026. This is a plain-language template — have it reviewed for your business before launch.">
      <h2>What we collect</h2>
      <p>When you create an account or place an order we collect your name, email address, phone number and delivery address, plus the contents of your order. If you subscribe to our newsletter we store your email address.</p>
      <h2>Payments</h2>
      <p>Payments are processed by Stripe and/or Razorpay. Your card, UPI and bank details are entered on their secure pages and are never seen or stored by Beadsy.</p>
      <h2>How we use it</h2>
      <p>To fulfil and deliver orders, send order updates, provide customer support, prevent fraud, and (only if you opt in) send occasional news and offers.</p>
      <h2>Sharing</h2>
      <p>We share only what's needed with payment providers, couriers and our email service. We never sell your data.</p>
      <h2>Your choices</h2>
      <p>You can update your details in your account at any time, unsubscribe from marketing emails, or ask us to delete your account by contacting us.</p>
      <h2>Cookies & storage</h2>
      <p>We use a secure session cookie to keep you signed in, and your browser's local storage to remember your bag, wishlist and recent searches on your device.</p>
    </StaticPage>
  );
}
