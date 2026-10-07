"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useStore } from "@/components/providers/StoreProvider";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/account", label: "Dashboard", icon: "home" },
  { href: "/account/orders", label: "Orders", icon: "package" },
  { href: "/wishlist", label: "Wishlist", icon: "heart" },
  { href: "/account/profile", label: "Profile", icon: "user" },
  { href: "/account/addresses", label: "Addresses", icon: "truck" },
  { href: "/account/settings", label: "Settings", icon: "settings" },
];

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { refreshUser, toast } = useStore();

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await refreshUser();
      toast("Signed out. See you soon! 👋", "info");
      router.push("/");
      router.refresh();
    } catch {
      toast("Couldn't sign out. Please try again.", "error");
    }
  };

  const active = (href: string) => (href === "/account" ? pathname === "/account" : pathname.startsWith(href));

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-28 lg:self-start">
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map((i) => (
          <li key={i.href} className="shrink-0">
            <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-bold whitespace-nowrap transition lg:rounded-2xl ${active(i.href) ? "bg-plum-700 text-white" : "bg-white text-plum-800 hover:bg-plum-100"}`}>
              <Icon name={i.icon} size={18} /> {i.label}
            </Link>
          </li>
        ))}
        {isAdmin && (
          <li className="shrink-0">
            <Link href="/admin" className="flex items-center gap-2.5 rounded-full bg-sun-100 px-4 py-2.5 text-sm font-bold whitespace-nowrap text-plum-900 lg:rounded-2xl">
              <Icon name="chart" size={18} /> Admin
            </Link>
          </li>
        )}
        <li className="shrink-0">
          <button type="button" onClick={logout} className="flex w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-bold whitespace-nowrap text-coral-700 hover:bg-coral-500/10 lg:rounded-2xl">
            <Icon name="logout" size={18} /> Sign out
          </button>
        </li>
      </ul>
    </nav>
  );
}
