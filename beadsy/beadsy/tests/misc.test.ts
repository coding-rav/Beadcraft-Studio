import { describe, expect, it } from "vitest";
import { fuzzyMatch, levenshtein } from "@/lib/fuzzy";
import { discountPercent, formatMoney, toCents } from "@/lib/money";
import { addBusinessDays, safeRedirectPath, slugify } from "@/lib/utils";
import { parseShopParams } from "@/lib/shop-params";

describe("fuzzy", () => {
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("same", "same")).toBe(0);
  });
  it("finds typo matches", () => {
    const items = ["Lavender Dream Bracelet", "Mint Meadow Bracelet", "Tiny Flower Keychain"];
    expect(fuzzyMatch("lavendar", items, (s) => s)).toEqual(["Lavender Dream Bracelet"]);
    expect(fuzzyMatch("xyzzy", items, (s) => s)).toEqual([]);
    expect(fuzzyMatch("", items, (s) => s)).toEqual([]);
  });
});

describe("money", () => {
  it("formats paise as rupees", () => {
    expect(formatMoney(49900)).toContain("499");
    expect(formatMoney(49950)).toContain("499.50");
  });
  it("parses rupee input to paise", () => {
    expect(toCents("1,299.50")).toBe(129950);
    expect(Number.isNaN(toCents("abc"))).toBe(true);
    expect(Number.isNaN(toCents(-5))).toBe(true);
  });
  it("calculates discount percent", () => {
    expect(discountPercent(1000, 750)).toBe(25);
    expect(discountPercent(1000, 1200)).toBe(0);
    expect(discountPercent(1000, null)).toBe(0);
  });
});

describe("utils", () => {
  it("blocks open redirects", () => {
    expect(safeRedirectPath("/account/orders")).toBe("/account/orders");
    expect(safeRedirectPath("//evil.com")).toBe("/account");
    expect(safeRedirectPath("https://evil.com")).toBe("/account");
    expect(safeRedirectPath("/\\evil.com")).toBe("/account");
    expect(safeRedirectPath(null, "/x")).toBe("/x");
  });
  it("skips weekends when adding business days", () => {
    const fri = new Date("2026-06-05T12:00:00"); // Friday
    expect(addBusinessDays(fri, 1).getDay()).toBe(1); // Monday
    expect(addBusinessDays(fri, 5).getDay()).toBe(5);
  });
  it("slugifies", () => expect(slugify("  Café Beads & Co.! ")).toBe("cafe-beads-co"));
});

describe("parseShopParams", () => {
  it("sanitises hostile input", () => {
    const q = parseShopParams({ sort: "DROP TABLE", page: "-4", colors: "pink,<script>,green", min: "abc", max: "500" });
    expect(q.sort).toBeUndefined();
    expect(q.page).toBe(1);
    expect(q.colors).toEqual(["pink", "green"]);
    expect(q.min).toBeUndefined();
    expect(q.max).toBe(50000);
  });
  it("accepts valid values", () => {
    const q = parseShopParams({ sort: "price-asc", page: "3", stock: "1" }, "bracelets");
    expect(q).toMatchObject({ sort: "price-asc", page: 3, inStockOnly: true, category: "bracelets" });
  });
});
