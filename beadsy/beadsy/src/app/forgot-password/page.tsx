import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = buildMetadata({ title: "Forgot password", path: "/forgot-password", noIndex: true });

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
