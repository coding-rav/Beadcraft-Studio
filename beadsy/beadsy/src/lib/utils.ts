export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Only allow same-site relative redirects (prevents open redirects). */
export function safeRedirectPath(next: string | null | undefined, fallback = "/account"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.includes("://")) return fallback;
  return next;
}

export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-IN", opts ?? { day: "numeric", month: "short", year: "numeric" }).format(
    typeof d === "string" ? new Date(d) : d,
  );
}
