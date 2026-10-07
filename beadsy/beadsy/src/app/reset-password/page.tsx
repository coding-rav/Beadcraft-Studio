import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { AuthForm } from "@/components/auth/AuthForm";
import { StatePanel } from "@/components/ui/States";

export const metadata: Metadata = buildMetadata({ title: "Reset password", path: "/reset-password", noIndex: true });

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return <StatePanel art="charm" tone="pink" title="This link isn't valid" message="The reset link is missing or incomplete. Request a new one and try again." actions={[{ label: "Request a new link", href: "/forgot-password" }]} />;
  }
  return <AuthForm mode="reset" token={token} />;
}
