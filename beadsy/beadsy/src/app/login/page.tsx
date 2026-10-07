import type { Metadata } from "next";
import { Suspense } from "react";
import { buildMetadata } from "@/lib/seo";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = buildMetadata({ title: "Sign in", path: "/login", noIndex: true });

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <Suspense>
      <AuthForm mode="login" next={next} />
    </Suspense>
  );
}
