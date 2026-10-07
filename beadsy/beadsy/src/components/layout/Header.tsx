"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "@/lib/config";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { useStore } from "@/components/providers/StoreProvider";
import { SearchBox } from "./SearchBox";

export function Header() {
  const { user, cartCount, wishlist, setCartOpen, toast, refreshUser } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
        setAccountOpen(false);
      }
    };
    const onDoc = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

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

  const isActive = (href: string) => (href === "/shop" ? pathname === "/shop" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-plum-100 bg-cream-100/90 backdrop-blur-md">
      <div className="container-x flex h-16 items-center gap-2 sm:h-[72px] sm:gap-4">
        <button type="button" className="icon-btn -ml-2 lg:hidden" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          <Icon name="menu" size={24} />
        </button>

        <div className="w-[104px] shrink-0 sm:w-32 lg:w-36">
          <Logo priority />
        </div>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition hover:bg-plum-100 ${isActive(l.href) ? "bg-plum-100 text-plum-800" : "text-plum-700"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mx-4 hidden max-w-md flex-1 md:block">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <button type="button" className="icon-btn md:hidden" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((s) => !s)}>
            <Icon name="search" size={22} />
          </button>

          <div ref={accountRef} className="relative">
            <button type="button" className="icon-btn" aria-label={user ? `Account menu for ${user.name}` : "Account"} aria-expanded={accountOpen} aria-haspopup="menu" onClick={() => setAccountOpen((o) => !o)}>
              <Icon name="user" size={22} />
            </button>
            {accountOpen && (
              <div role="menu" className="animate-pop absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-plum-100 bg-white p-2 shadow-pop">
                {user ? (
                  <>
                    <p className="truncate px-3 py-2 text-sm font-bold">Hi, {user.name.split(" ")[0]} 💜</p>
                    <MenuLink href="/account">My account</MenuLink>
                    <MenuLink href="/account/orders">Orders</MenuLink>
                    <MenuLink href="/wishlist">Wishlist</MenuLink>
                    {user.role === "ADMIN" && <MenuLink href="/admin">Admin dashboard</MenuLink>}
                    <button type="button" role="menuitem" onClick={logout} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-coral-700 hover:bg-coral-500/10">
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <MenuLink href="/login">Sign in</MenuLink>
                    <MenuLink href="/register">Create account</MenuLink>
                  </>
                )}
              </div>
            )}
          </div>

          <Link href="/wishlist" className="icon-btn relative" aria-label={`Wishlist, ${wishlist.length} items`}>
            <Icon name="heart" size={22} />
            {wishlist.length > 0 && <Count n={wishlist.length} tone="pink" />}
          </Link>

          <button type="button" className="icon-btn relative" aria-label={`Open cart, ${cartCount} items`} onClick={() => setCartOpen(true)}>
            <Icon name="bag" size={22} />
            {cartCount > 0 && <Count n={cartCount} tone="plum" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="container-x pb-3 md:hidden">
          <SearchBox autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-plum-900/50 backdrop-blur-sm" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="animate-fade-up absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-cream-100 p-5 shadow-pop">
            <div className="mb-6 flex items-center justify-between">
              <div className="w-28">
                <Logo link={false} />
              </div>
              <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <Icon name="close" size={24} />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-2xl px-4 py-3 font-display text-xl font-semibold text-plum-800 hover:bg-plum-100">
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-plum-100 pt-4">
              {user ? (
                <Link href="/account" className="btn btn-soft">My account</Link>
              ) : (
                <>
                  <Link href="/login" className="btn btn-primary">Sign in</Link>
                  <Link href="/register" className="btn btn-secondary">Create account</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" className="block rounded-xl px-3 py-2 text-sm font-semibold text-plum-800 hover:bg-plum-50">
      {children}
    </Link>
  );
}

function Count({ n, tone }: { n: number; tone: "plum" | "pink" }) {
  return (
    <span aria-hidden="true" className={`absolute top-1 right-0.5 grid min-w-5 place-items-center rounded-full px-1 text-[11px] leading-5 font-bold text-white ${tone === "pink" ? "bg-bubblegum-600" : "bg-plum-700"}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}
