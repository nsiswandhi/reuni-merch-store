# Changelog

## v1.0.0 — 2026-09-15

First public release, launched for Reuni Akbar IA Lima InVnity 2026 at
https://invnity.ialima.id. Below is the complete build history: every
patch applied through the AI-assisted development workflow (see
`README.md`'s "How this project is actually being developed"), in order.
Patch numbers correspond to `NNNN-*.patch` files delivered during the
build; only 0001 onward were delivered this way — everything before that
(project scaffold, data model, auth, storefront, checkout, admin/vendor
panels, email) was built in the same sandbox but delivered as full
repository snapshots before the incremental-patch workflow started.

### Foundation (pre-0001, delivered as snapshots)
- Next.js + Prisma + Postgres scaffold; InVnity brand colors/fonts/header
- Data model: `AdminUser`, `Vendor`, `Product`, `ProductVariant`,
  `AdminSettings`, `Order`, `OrderItem`
- JWT session auth (HS256, algorithm pinned) for `ADMIN`/`VENDOR` roles
- Storefront: katalog → product detail → cart (`localStorage`) → checkout
  → `/order/[token]` detail page
- Checkout server action with server-side price recomputation (never
  trusts client-submitted prices)
- Payment-proof upload via Netlify Blobs
- Full admin panel: dashboard, vendor CRUD, product/variant CRUD, order
  list/detail/confirm/reject, settings
- Full vendor panel: scoped order list, fulfillment status updates
- Resend email integration for all order-lifecycle notifications
- Order token/number generation, order-status guards, reminder/expiry
  date math — all with unit tests
- A handful of production-discovered fixes relayed as direct chat
  instructions rather than patches (see README's drift-history note):
  Netlify `publish` directory, `postinstall` Prisma generate, verified
  email sending domain, Server Action `bodySizeLimit`

### Incremental patches
| # | Change |
|---|---|
| 0001 | UI/UX polish — header logo, pointer cursors, styled file inputs, proof lightbox |
| 0002 | Add logout to the admin sidebar |
| 0003 | Move logout from admin sidebar to the shared header |
| 0004 | Add "back to all orders" link on order detail pages |
| 0005 | Add by-product summary table to the vendor dashboard |
| 0006 | Replace quantity inputs with a tap +/- stepper |
| 0007 | Fix quantity stepper +/- spacing (CSS-drawn bars) |
| 0008 | Per-product availability: always / last-order-date / stock-limited |
| 0009 | Fix quantity stepper stretching to parent's full width |
| 0010 | Full CRUD for vendor, product, and order data (admin) |
| 0011 | SQL script to reset vendor/product/order data for a fresh test round |
| 0012 | Optional QRIS image as a payment method |
| 0013 | Let vendors restrict fulfillment to shipping-only (no pickup) |
| 0014 | Sort options on the storefront catalog |
| 0015 | Preorder / group-buy flow: quota-triggered payment, `RESERVED` status |
| 0016 | Show vendor owner name and angkatan on product cards; footer spacing |
| 0017 | Make product type (regular vs. preorder) an explicit either/or choice; preorder note field; force shipping for preorder orders |
| 0018 | Show ongkir before checkout; vendor filter on catalog; collapsible admin product list |
| 0019 | **Security hardening** (full list below) |
| 0020 | Cart icon in header with live item-count badge; hide title text on mobile |
| — | Manual: add CSP + security headers to `next.config.ts` (delivered as a snippet, not a patch — see README) |
| 0021 | This changelog + README rewrite |

### Patch 0019 — security hardening (pre-launch audit)
Full code audit (dependency scan, dispatched independent read-only
review, manual pass) before launch turned up several gaps, all fixed in
one patch:
1. Security headers — `X-Frame-Options`, `X-Content-Type-Options`,
   `Referrer-Policy`, `Permissions-Policy`, HSTS, and a pragmatic CSP
   (`script-src 'self' 'unsafe-inline'` — a deliberate trade-off, since a
   full nonce-based CSP conflicts with Next.js App Router's RSC-injected
   inline scripts; delivered separately, see the manual entry above)
2. Login brute-force lockout — Netlify Blobs–backed, 5 failed attempts
   locks an email out for 15 minutes (`src/lib/rate-limit.ts`)
3. Magic-byte file-signature validation on all uploads (product images,
   QRIS image, payment proofs) — client-declared `Content-Type` alone
   isn't trustworthy (`src/lib/blobs.ts`)
4. HTML-escaping of buyer-supplied `buyerName` everywhere it's
   interpolated into transactional email HTML (`src/lib/email.ts`)
5. Upper bound (100) on cart item quantity in the checkout schema
6. Real enum validation for the admin order-status filter, replacing an
   unchecked `as` cast
7. Vendor/admin password minimum raised from 6 to 10 characters

## Known operational notes carried forward

- **Testing philosophy**: lightweight unit tests only (money math, status
  guards, date-threshold math, file-signature validation) — no
  integration/E2E suite. Primary QA is the manual checklist in
  `docs/qa-checklist.md`, run against the live Netlify URL. This was a
  deliberate call given the "hitungan hari" (days, not weeks) timeline;
  revisit if the pace of change increases.
- **No icon/UI-component library** is installed anywhere in the project —
  keep using hand-written inline SVGs and native `<details>` unless
  there's a real reason to add a dependency (see README).
- **The `qa-checklist.md` file predates the preorder flow and the v1.0.0
  security hardening** — it still covers the core storefront/payment/
  admin/vendor flows correctly, but doesn't have preorder- or
  security-specific steps. Worth extending before the next big feature
  round rather than trusting it as fully exhaustive.
