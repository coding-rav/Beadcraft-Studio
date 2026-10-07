# Beadsy — Small Beads. Big Vibes.

A production-oriented ecommerce store for handmade bead bracelets, necklaces, keychains, charms and gift sets. Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Prisma and PostgreSQL, with Stripe and Razorpay payments.

> ## ⚠️ Read this first — verification status
> This codebase was written in an environment where the npm registry was blocked (HTTP 403), so **`npm install`, `tsc`, `next build`, ESLint, Vitest and Playwright were never run against it.** Only these checks were possible and passed: every `.ts`/`.tsx` file parses (esbuild), every relative/`@/` import resolves, and every named import exists in its target module.
>
> Expect to spend a short session on the first `npm install && npm run typecheck && npm run build` fixing small type or lint nits. Do not treat it as deployed-and-green until you have run the checklist in [Testing](#testing). Payment flows have never been exercised against real Stripe or Razorpay test accounts.

## Features

**Storefront** — home (hero, categories, featured, best sellers, new arrivals, gift sets, reviews, FAQ, newsletter), shop with category pages, price/colour/stock filters, sorting and pagination (URL-driven), product pages (gallery, variants, stock, reviews, related, recently viewed), quick view, search with suggestions, recent searches and typo-tolerant fallback, wishlist, cart drawer and cart page, coupons, multi-step checkout (details → delivery → payment), order success page.

**Accounts** — register, login, logout, forgot/reset password, profile, saved addresses, order history and detail, wishlist. Cart and wishlist sync to the account on login.

**Admin** (`/admin`, role-checked on every request) — overview, products (create/edit/images/variants), categories, orders (status transitions, tracking, notes), customers, inventory, coupons, reviews moderation, payments, analytics, settings.

**Commerce correctness** — prices always recomputed server-side from the DB (client totals are ignored); money is integer paise; stock is reserved atomically at checkout for 35 minutes and released on cancel/expiry (Vercel cron); orders become PAID only via verified webhooks / server-verified payment (idempotent, amount and currency checked); coupon limits are enforced under row lock.

**SEO & quality** — metadata per page, Open Graph, `sitemap.xml`, `robots.txt`, JSON-LD (Organization, WebSite, Product, Breadcrumb, FAQ, ItemList), `noindex` on filtered/account/admin URLs, loading/error/not-found/empty states, skip link, focus styles, reduced-motion support, mobile-first layout.

## Tech stack

Next.js 15.5 · React 19 · TypeScript (strict) · Tailwind CSS 4 · Prisma 6 · PostgreSQL · Zod · jose (JWT sessions) · bcryptjs · Stripe · Razorpay · Vercel Blob (image uploads) · Resend (optional email) · Vitest.

> The original brief's Next.js 15.0.0 had known vulnerabilities; this project targets `^15.5.7`. Run `npm audit` after installing and bump to the latest 15.5.x patch.

## Project structure

```
prisma/            schema.prisma, seed.ts
public/brand/      logo files; public/og.png social image
src/app/           routes (storefront, account, admin, api/*), sitemap, robots
src/components/    ui, layout, cart, product, shop, checkout, account, admin
src/lib/           config, db, auth/session, pricing, coupons, inventory,
                   orders, payments/{stripe,razorpay}, webhooks, search, seo …
src/middleware.ts  cheap cookie gate for /account and /admin
tests/             Vitest unit tests (pricing, coupons, fuzzy, money, utils, signatures, sessions)
vercel.json        daily cron to release expired reservations
```

## Local development

Requirements: Node ≥ 20.9, a PostgreSQL database (local Docker, Neon, Supabase, Vercel Postgres…).

```bash
npm install
cp .env.example .env.local        # then fill in values (see below)
# for Prisma CLI, also export DATABASE_URL or copy it into .env
npx prisma migrate dev --name init   # creates the first migration + tables
npm run db:seed                       # categories, coupon, admin; demo data if SEED_DEMO=true
npm run dev                           # http://localhost:3000
```

Prisma CLI reads `.env`, Next reads `.env.local`. Easiest: put `DATABASE_URL` in both, or run `npx dotenv -e .env.local -- prisma …`.

No migration files ship with the project (they must be generated against your database). Commit the generated `prisma/migrations/` folder, and use `npx prisma migrate deploy` in production. For a throwaway database, `npm run db:push` also works.

## Environment variables

Defined and documented in `.env.example`. **Never commit real values.** Only variables prefixed `NEXT_PUBLIC_` reach the browser; none of them are secrets.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string (use a pooled URL on serverless) |
| `AUTH_SECRET` | yes | ≥32 chars; signs session cookies. `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Canonical URL for SEO, emails, Stripe return URLs |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | for cards | Stripe |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | for UPI/cards (India) | Razorpay |
| `BLOB_READ_WRITE_TOKEN` | for admin image upload | Vercel Blob |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | Transactional email (otherwise emails are logged, never sent) |
| `CRON_SECRET` | yes (prod) | Bearer token for `/api/cron/release-reservations` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for seeding | First admin account (password ≥ 10 chars) |
| `SEED_DEMO` | optional | `true` loads the demo catalogue |

A payment provider whose keys are missing is hidden/refused gracefully; the other keeps working.

## Database & Prisma

Schema is in `prisma/schema.prisma`: users, addresses, categories, products, images, variants, inventory, carts, wishlists, orders, order items, payments, webhook events, coupons, redemptions, reviews, newsletter. Indexes cover catalogue filters/sorts, order lookups and reservation expiry.

```bash
npm run db:migrate    # dev migrations
npm run db:deploy     # apply migrations in CI/production
npm run db:studio     # browse data
```

## Payments

**Stripe** (hosted Checkout)
1. Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test keys first).
2. Webhook endpoint: `https://<your-domain>/api/webhooks/stripe`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

**Razorpay** (UPI / cards / netbanking)
1. Add key id/secret (test mode first).
2. Webhook endpoint: `https://<your-domain>/api/webhooks/razorpay`, events `payment.captured`, `order.paid`, `payment.failed`; set the same secret in `RAZORPAY_WEBHOOK_SECRET`.

Both webhooks verify signatures on the raw body and are idempotent. The success page also re-verifies with the provider server-to-server, so a delayed webhook doesn't leave a paid order stuck. Test with the providers' test cards/UPI IDs and confirm: pay → order PAID → stock committed → cart cleared; cancel → stock released.

## Admin setup

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` and run `npm run db:seed`. Sign in at `/login`, then open `/admin`. Change the password afterwards in Account → Settings. To promote an existing user: `UPDATE "User" SET role='ADMIN' WHERE email='…';`.

The `WELCOME10` coupon (10% off, min ₹299, once per customer, capped ₹200) is created by the seed.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add a Postgres database and set every required variable above for Production (and Preview if you use it).
3. Build command is already `prisma generate && next build`. Apply migrations from CI or your machine: `DATABASE_URL=… npx prisma migrate deploy`, then seed once.
4. Create the Stripe/Razorpay webhooks pointing at the production domain.
5. `vercel.json` registers a daily cron; Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set. (Hobby plans only allow daily crons; checkout also opportunistically releases a few expired reservations when stock is short, so held stock isn't locked for a whole day.)
6. Set `NEXT_PUBLIC_SITE_URL` to the final domain so the sitemap, canonical URLs and OG tags are correct.

## Testing

```bash
npm run typecheck
npm run lint
npm test            # Vitest unit tests in tests/
npm run build
```

Unit tests cover the pure logic: totals/GST/shipping/discount maths, coupon rules, money helpers, fuzzy search, open-redirect protection, shop param sanitising, Razorpay signature checks, session tokens. They have **not been run yet** (see the verification note).

Manual checklist before launch: register/login/logout/reset; add to cart as guest then sign in (merge); apply coupon; checkout with each provider in test mode incl. cancel and failure; webhook retry (no double-processing); admin product/stock/order flows; mobile layout at 360px; keyboard-only pass; Lighthouse on `/`, `/shop`, a product page.

## Security notes

- Passwords: bcrypt (cost 12); login timing equalised; generic errors; rate limits on auth, search, checkout, reviews, newsletter.
- Sessions: signed JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookie; changing the password invalidates old sessions; admin role re-checked against the DB on every admin page and API call.
- CSRF: mutating API routes require same-origin requests.
- Input: every API body/query is validated with Zod; Prisma parameterises queries; raw SQL uses tagged templates only.
- Payments: server-side pricing, signature-verified webhooks, idempotency table, amount/currency checks, no card data touches the server.
- Headers: HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy and nosniff in `next.config.ts`. **No Content-Security-Policy is set yet** — add one once you know your final third-party scripts (Stripe, Razorpay checkout.js).
- Secrets: `.env*` is git-ignored; nothing secret uses `NEXT_PUBLIC_`.
- **Limitations:** rate limiting is in-memory per serverless instance — put Upstash/Redis or Vercel's WAF in front for real abuse protection. Email is logged unless Resend is configured. Run `npm audit` and keep Next.js patched.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `AUTH_SECRET is missing…` | Set a ≥32-char secret in `.env.local` |
| `@prisma/client did not initialize` | `npx prisma generate` |
| Build tries to reach the DB | Pages that read the DB are `force-dynamic`; ensure `DATABASE_URL` is set in Vercel for builds that run migrations |
| Webhook 400 | Wrong signing secret, or body altered by a proxy; use the secret for *that* endpoint |
| Order stuck PENDING | Check webhook delivery logs; the success page re-checks on load; cron releases stale reservations |
| Image upload fails | Set `BLOB_READ_WRITE_TOKEN` |
| Prisma can't find env | Prisma CLI reads `.env`, not `.env.local` |

## Brand

Logo and icons in `public/brand/` and `src/app/icon.png` are derived from the supplied *Beadsy Pastel Bracelet* logo. Palette tokens live in `src/app/globals.css`.
