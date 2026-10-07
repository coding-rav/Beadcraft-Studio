import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { AccountNav } from "@/components/account/AccountNav";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("/account");
  return (
    <div className="container-x py-8 sm:py-12">
      <div className="mb-6">
        <p className="eyebrow mb-1">My account</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Hi, {user.name.split(" ")[0]} 💜</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[230px_1fr] lg:gap-12">
        <AccountNav isAdmin={user.role === "ADMIN"} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
