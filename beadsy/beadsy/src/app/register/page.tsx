import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = buildMetadata({ title: "Create account", path: "/register", noIndex: true });

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={next} />;
}
