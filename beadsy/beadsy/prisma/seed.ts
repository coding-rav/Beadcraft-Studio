/**
 * Seed script. Idempotent: safe to run more than once (uses upserts keyed on slug / sku / code / email).
 *
 *   npm run db:seed
 *
 * - Always creates categories, the WELCOME10 coupon and (if ADMIN_EMAIL + ADMIN_PASSWORD are set) the admin user.
 * - Demo products + sample reviews are created only when SEED_DEMO="true".
 *   Replace the demo catalogue with your real products from /admin/products before launch.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const CATEGORIES = [
  { slug: "bracelets", name: "Bracelets", description: "Stretchy, handmade bead bracelets for every mood.", sortOrder: 1 },
  { slug: "necklaces", name: "Necklaces", description: "Colourful beaded necklaces and layering strands.", sortOrder: 2 },
  { slug: "keychains", name: "Keychains", description: "Tiny bead charms for keys and bags.", sortOrder: 3 },
  { slug: "charms", name: "Charms", description: "Bead charms and accessories.", sortOrder: 4 },
  { slug: "anklets", name: "Anklets", description: "Summery bead anklets.", sortOrder: 5 },
  { slug: "gift-sets", name: "Gift Sets", description: "Ready-to-gift bead bundles.", sortOrder: 6 },
];

type Demo = {
  slug: string;
  name: string;
  cat: string;
  price: number; // rupees
  sale?: number;
  art: "bracelet" | "necklace" | "keychain" | "charm" | "anklet" | "giftset";
  palette: string[];
  colors: string[];
  tags: string[];
  featured?: boolean;
  sold: number;
  variants: { name: string; color?: string; qty: number }[];
  short: string;
};

const DEMO: Demo[] = [
  { slug: "bubblegum-pop-bracelet", name: "Bubblegum Pop Bracelet", cat: "bracelets", price: 349, art: "bracelet", palette: ["#F58FB0", "#FDE4EC", "#F8D26B", "#C5A9DB"], colors: ["pink", "yellow", "lavender"], tags: ["pastel", "stretch", "daily"], featured: true, sold: 120, variants: [{ name: "Small (15 cm)", qty: 25 }, { name: "Medium (17 cm)", qty: 30 }, { name: "Large (19 cm)", qty: 12 }], short: "Pink, butter-yellow and lavender beads on soft stretch cord." },
  { slug: "mint-meadow-bracelet", name: "Mint Meadow Bracelet", cat: "bracelets", price: 329, sale: 279, art: "bracelet", palette: ["#98C99A", "#E1F2E2", "#F8D26B", "#FDE4EC"], colors: ["green", "mint", "yellow"], tags: ["pastel", "stretch", "sale"], featured: true, sold: 85, variants: [{ name: "Small (15 cm)", qty: 20 }, { name: "Medium (17 cm)", qty: 20 }], short: "Fresh greens with a pop of sunshine." },
  { slug: "lavender-dream-bracelet", name: "Lavender Dream Bracelet", cat: "bracelets", price: 369, art: "bracelet", palette: ["#C5A9DB", "#EDE3F4", "#F58FB0", "#FFFFFF"], colors: ["lavender", "purple", "pink"], tags: ["pastel", "stretch"], sold: 64, variants: [{ name: "Small (15 cm)", qty: 15 }, { name: "Medium (17 cm)", qty: 18 }], short: "Dreamy lilac beads with tiny pearly accents." },
  { slug: "rainbow-pals-bracelet", name: "Rainbow Pals Bracelet", cat: "bracelets", price: 399, art: "bracelet", palette: ["#F58FB0", "#F8D26B", "#98C99A", "#8EC3E6", "#9B79AE"], colors: ["rainbow", "multicolor"], tags: ["rainbow", "kids", "stretch"], featured: true, sold: 210, variants: [{ name: "Kids (14 cm)", qty: 20 }, { name: "Medium (17 cm)", qty: 25 }], short: "Every colour, one happy bracelet." },
  { slug: "sunny-side-necklace", name: "Sunny Side Necklace", cat: "necklaces", price: 599, art: "necklace", palette: ["#F8D26B", "#FEF3CD", "#F58FB0", "#FFFFFF"], colors: ["yellow", "pink", "white"], tags: ["summer", "layering"], featured: true, sold: 58, variants: [{ name: "16 inch", qty: 14 }, { name: "18 inch", qty: 16 }], short: "Buttery yellow beads with blush accents." },
  { slug: "berry-sorbet-necklace", name: "Berry Sorbet Necklace", cat: "necklaces", price: 649, sale: 549, art: "necklace", palette: ["#E8688F", "#F58FB0", "#C5A9DB", "#FDE4EC"], colors: ["rose", "pink", "lavender"], tags: ["layering", "sale"], sold: 40, variants: [{ name: "16 inch", qty: 10 }, { name: "18 inch", qty: 10 }], short: "Sweet berry tones that go with everything." },
  { slug: "tiny-flower-keychain", name: "Tiny Flower Keychain", cat: "keychains", price: 199, art: "keychain", palette: ["#C5A9DB", "#F8D26B", "#F58FB0"], colors: ["lavender", "yellow", "pink"], tags: ["gift", "bag-charm"], featured: true, sold: 300, variants: [{ name: "Lavender", color: "lavender", qty: 40 }, { name: "Pink", color: "pink", qty: 40 }, { name: "Mint", color: "mint", qty: 3 }], short: "A little bead flower for your keys or bag." },
  { slug: "heart-bead-keychain", name: "Heart Bead Keychain", cat: "keychains", price: 229, art: "keychain", palette: ["#F58FB0", "#FDE4EC", "#FFFFFF"], colors: ["pink", "white"], tags: ["gift", "heart"], sold: 150, variants: [{ name: "One size", qty: 50 }], short: "Pink heart charm with pearly beads." },
  { slug: "pastel-charm-pack", name: "Pastel Charm Pack", cat: "charms", price: 249, art: "charm", palette: ["#FDE4EC", "#E1F2E2", "#EDE3F4", "#FEF3CD"], colors: ["pastel", "multicolor"], tags: ["diy", "pastel"], sold: 72, variants: [{ name: "Pack of 6", qty: 35 }], short: "Six mix-and-match pastel bead charms." },
  { slug: "seashell-summer-anklet", name: "Seashell Summer Anklet", cat: "anklets", price: 379, art: "anklet", palette: ["#8EC3E6", "#FFFFFF", "#F8D26B", "#F58FB0"], colors: ["blue", "white", "yellow"], tags: ["summer", "beach"], sold: 33, variants: [{ name: "Adjustable", qty: 22 }], short: "Beachy blues and sunshine yellow." },
  { slug: "best-friends-gift-set", name: "Best Friends Gift Set", cat: "gift-sets", price: 799, sale: 699, art: "giftset", palette: ["#F58FB0", "#C5A9DB", "#F8D26B", "#98C99A"], colors: ["pastel", "multicolor"], tags: ["gift", "set", "sale"], featured: true, sold: 95, variants: [{ name: "Set of 2 bracelets", qty: 18 }, { name: "Set of 3 bracelets", qty: 12 }], short: "Matching bracelets, gift-wrapped and ready to share." },
  { slug: "birthday-bead-box", name: "Birthday Bead Box", cat: "gift-sets", price: 999, art: "giftset", palette: ["#F8D26B", "#F58FB0", "#8EC3E6", "#FFFFFF"], colors: ["rainbow", "multicolor"], tags: ["gift", "set", "birthday"], sold: 22, variants: [{ name: "Standard box", qty: 0 }], short: "Bracelet, keychain and a handwritten note." },
];

const REVIEWS = [
  { rating: 5, title: "So cute!", body: "The colours are even prettier in person and it fits perfectly. Got lots of compliments." },
  { rating: 4, title: "Lovely gift", body: "Bought it for my sister and she loved it. Packaging was adorable." },
  { rating: 5, title: "Great quality", body: "Beads are smooth and the cord feels sturdy. Will order again." },
];

async function main() {
  // Categories
  const cats = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await db.category.upsert({ where: { slug: c.slug }, update: { name: c.name, description: c.description, sortOrder: c.sortOrder }, create: c });
    cats.set(c.slug, row.id);
  }

  // Coupon
  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", description: "10% off your first order", type: "PERCENTAGE", value: 10, maxDiscountCents: 20000, minOrderCents: 29900, perUserLimit: 1, isActive: true },
  });

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters.");
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN", passwordHash },
      create: { email: adminEmail, name: "Beadsy Admin", passwordHash, role: "ADMIN" },
    });
    console.log(`✔ Admin user ready: ${adminEmail}`);
  } else {
    console.log("• ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user.");
  }

  if (process.env.SEED_DEMO !== "true") {
    console.log("• SEED_DEMO is not \"true\" — skipping demo products.");
    return;
  }

  // Demo products
  const productIds: string[] = [];
  for (const [i, d] of DEMO.entries()) {
    const priceCents = d.price * 100;
    const salePriceCents = d.sale ? d.sale * 100 : null;
    const totalQty = d.variants.reduce((s, v) => s + v.qty, 0);
    const data = {
      name: d.name,
      shortDescription: d.short,
      description: `${d.short}\n\nHandmade in small batches with smooth, colour-matched beads on durable stretch cord. Each piece arrives in a Beadsy pouch, ready to gift.`,
      categoryId: cats.get(d.cat)!,
      priceCents,
      salePriceCents,
      currentPriceCents: salePriceCents ?? priceCents,
      tags: d.tags,
      colors: d.colors,
      palette: d.palette,
      artKind: d.art,
      material: "Acrylic & glass beads, elastic cord",
      dimensions: "See variant",
      care: "Keep dry. Avoid pulling or over-stretching. Store flat.",
      isFeatured: !!d.featured,
      isActive: true,
      inStock: totalQty > 0,
      soldCount: d.sold,
    };
    const p = await db.product.upsert({
      where: { slug: d.slug },
      update: {},
      create: { slug: d.slug, sku: `BD-${String(i + 1).padStart(3, "0")}`, ...data },
    });
    productIds.push(p.id);
    for (const [j, v] of d.variants.entries()) {
      const sku = `BD-${String(i + 1).padStart(3, "0")}-${j + 1}`;
      await db.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: p.id,
          name: v.name,
          sku,
          color: v.color ?? null,
          sortOrder: j,
          inventory: { create: { quantity: v.qty, lowStockThreshold: 5 } },
        },
      });
    }
  }

  // Sample reviews from demo customers (approved) + aggregate ratings
  const demoPassword = await bcrypt.hash(`demo-${Math.random().toString(36).slice(2)}-${Date.now()}`, 12); // random: demo accounts can't be logged into
  const reviewers = [];
  for (const n of ["Aarav", "Meera", "Isha"]) {
    reviewers.push(
      await db.user.upsert({
        where: { email: `${n.toLowerCase()}@demo.beadsy.invalid` },
        update: {},
        create: { email: `${n.toLowerCase()}@demo.beadsy.invalid`, name: n, passwordHash: demoPassword },
      }),
    );
  }
  for (const pid of productIds.slice(0, 6)) {
    for (const [k, r] of REVIEWS.entries()) {
      await db.review.upsert({
        where: { productId_userId: { productId: pid, userId: reviewers[k]!.id } },
        update: {},
        create: { productId: pid, userId: reviewers[k]!.id, ...r, status: "APPROVED", verifiedPurchase: false },
      });
    }
    const agg = await db.review.aggregate({ where: { productId: pid, status: "APPROVED" }, _avg: { rating: true }, _count: true });
    await db.product.update({ where: { id: pid }, data: { avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count } });
  }

  console.log(`✔ Seeded ${CATEGORIES.length} categories, ${DEMO.length} demo products, WELCOME10 coupon.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
