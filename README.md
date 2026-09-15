# Reuni Merch Store

Multi-vendor merchandise store for **Reuni Akbar IA Lima InVnity 2026**.
Buyers shop without an account, pay by manual bank transfer, and upload
their own payment proof; vendors and admins manage everything from
role-scoped panels.

- **Live site:** https://invnity.ialima.id
- **Repo:** `nsiswandhi/reuni-merch-store`
- **Status:** v1.0.0 — launched. See `docs/CHANGELOG.md` for the full
  build history.

This file is the entry point for anyone (human or AI) picking up
development after v1.0.0. Read it before making changes.

## Tech stack

- **Next.js** (App Router) + React, TypeScript throughout
- **Prisma** ORM 6.19.3 → **PostgreSQL** (Netlify DB, Neon-backed)
- **Netlify Blobs** — file storage (product images, QRIS image, payment
  proofs) and, since v1.0.0's security hardening, login-lockout state
- **Resend** — transactional email
- **Netlify Scheduled Functions** — daily reminder/expire cron
  (`netlify/functions/daily-order-check.mts`)
- **Tailwind CSS v4**, `@fontsource/bebas-neue` + `@fontsource/montserrat`
  for the InVnity brand look
- **zod** — all form/server-action validation
- **ExcelJS** — admin order export
- **Vitest** — unit tests (pure logic only: money math, status guards,
  date thresholds, magic-byte validation — no DB/integration tests)

No UI component library or icon library is installed on purpose — icons
are small hand-written inline SVGs (see `src/components/*-icon.tsx`) and
collapsible sections use native `<details>/<summary>`. Keep that pattern
unless there's a strong reason to add a dependency.

## Architecture

**Roles**
- **Buyer** — no account. Cart lives in `localStorage` (`src/lib/cart.ts`,
  key `reuni-cart`). Every order gets a random unguessable `token`; the
  buyer's only way back into an order is `/order/[token]`.
- **Vendor** — logs in, sees only their own products (read-only) and only
  the order *items* (not whole orders) that include their products. Can
  update per-item `fulfillmentStatus`.
- **Admin** — logs in, manages vendors, products, order confirmation, and
  site settings (bank account info, QRIS image, flat shipping rate).

Auth is a single `session` httpOnly cookie holding a signed JWT
(`src/lib/auth/session.ts`, HS256, algorithm pinned both directions) with
a `role: "ADMIN" | "VENDOR"` claim, gating `/admin/*` and `/vendor/*`.

**Order state machine** (`src/lib/order-status.ts` has the guards):
```
regular product:  PENDING_PAYMENT -> AWAITING_CONFIRMATION -> PAID
                        |                                       ^
                        v (admin rejects proof)                 |
                  PENDING_PAYMENT --------------------------------
                        |
                        v (72h no payment)
                     EXPIRED

preorder product: RESERVED (waiting on quota) -> PENDING_PAYMENT -> ... (same as above)
```
- `RESERVED`: preorder-only. No payment requested yet; the order just
  holds a slot against `Product.preorderMinQty`. Once
  `preorderReservedQty` reaches `preorderMinQty` across all RESERVED
  orders for that product, they all flip to `PENDING_PAYMENT` and
  `paymentDueStartedAt` is set (this, not `createdAt`, drives the
  24h/48h/72h reminder cron for preorder orders — see
  `src/lib/preorder-fulfillment.ts`).
- Preorder orders are always `SHIPPING` — never `PICKUP` — enforced
  server-side in `checkout/actions.ts`.
- Stock decrement and preorder-quota increment both use conditional
  `updateMany` + checking `.count`, not read-then-write, so concurrent
  checkouts can't oversell.

**Cart rules** (`src/lib/cart.ts`): a cart can hold multiple regular
items from multiple vendors, but **cannot mix preorder and regular
items**, and **cannot mix two different preorder products** — a preorder
order is tied to exactly one product's quota. Violating this throws
`CartConflictError`, which the add-to-cart UI catches and shows as a
message telling the buyer to clear their cart.

**Data model** — see `prisma/schema.prisma`, it's short and well-commented
inline. Key non-obvious fields:
- `Product.availabilityMode`: `ALWAYS | LAST_ORDER_DATE | STOCK` — mutually
  exclusive with being a preorder product (the admin form makes "regular
  vs. preorder" an explicit either/or choice; see `docs/CHANGELOG.md`
  patch 0017 for why).
- `Order.isPreorder` — denormalized onto Order (not just derivable via
  `items -> product`) purely so admin order filtering/display doesn't
  need a join.
- `AdminSettings` is a singleton row (`id: "singleton"`).

## Environment variables

Required in both `.env` (local) and Netlify's environment settings:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma runtime connection (pooled) |
| `DIRECT_URL` | Prisma migrations connection (direct, non-pooled) |
| `SESSION_SECRET` | HMAC secret for session JWTs — no hardcoded fallback, throws if unset |
| `RESEND_API_KEY` | Transactional email |
| `SITE_URL` | Used to build absolute links in emails |

On Netlify, get `DATABASE_URL`/`DIRECT_URL` from the **Netlify Database →
Connect** panel's "Read and write" connection string, not the generic
Environment Variables page (that one masks the value).

## Local development

```bash
npm install
npx prisma generate     # regenerate the Prisma Client types from schema.prisma
npx prisma migrate deploy
npm run dev
```

**If `npx tsc --noEmit` suddenly floods with dozens of "Property X does
not exist" errors** referencing Prisma model fields that definitely exist
in `schema.prisma` — that's a stale generated Prisma Client, not a real
bug. Run `npx prisma generate` and re-check. (A leftover `LayoutProps`
error in `src/app/layout.tsx` alone is harmless — it's a Next.js-generated
ambient type that only appears after a local `next dev`/`next build` run;
Netlify's build regenerates it fresh and isn't affected.)

## Verification before shipping any change

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
```
All three should be clean (the one standing exception is a
`import/no-anonymous-default-export` warning on
`netlify/functions/daily-order-check.mts` — pre-existing, not a bug).

## Deployment

Netlify auto-builds and deploys on every push to `main`
(`@netlify/plugin-nextjs`, `netlify.toml`). No manual deploy step.
- If `prisma/schema.prisma` changed, run `npx prisma migrate deploy`
  **before** pushing (or right after — the deployed app will error on
  any query touching the new field/table until the migration runs).
- `netlify.toml` pins `publish = ".next"` explicitly (an unset publish
  dir defaults to the base dir, which collides with the Next.js plugin's
  own output and fails the build).
- `package.json` runs `prisma generate` via `postinstall` — required
  because Netlify's npm 11 install-scripts gate silently blocks a
  *dependency's* postinstall scripts (Prisma's own) unless it's the
  project's own root-level script.

## How this project is actually being developed

This repo is being built through an AI coding session that **cannot push
to GitHub directly** — it works in an isolated sandbox. The workflow, and
why you'll see a pile of `NNNN-*.patch` files sitting next to the repo:

1. Changes are made and verified (`tsc`/`eslint`/`vitest`) in the sandbox.
2. Committed locally with a `Co-Authored-By: Claude ...` trailer.
3. Packaged with `git format-patch --binary -1 HEAD --start-number N`.
4. Delivered as a file; applied locally with `git am <file>.patch`, then
   `git push origin main`.

**Lessons learned the hard way this cycle — worth knowing before you
continue this pattern:**
- **Always verify a patch actually landed** with `git log --oneline`
  after `git am`, rather than trusting "done." One patch (0019, the
  security hardening) silently failed to apply and went unnoticed for a
  full round-trip.
- **A re-sent patch with the same filename doesn't overwrite the old
  download.** Browsers commonly save it as a duplicate. Check the file
  size/timestamp (or rename it) before `git am`-ing a "fixed" patch.
- **A patch's diff is generated against the sandbox's git history, not
  necessarily what's actually on the developer's machine.** A few fixes
  earlier in this project (Netlify `publish` dir, the `postinstall`
  Prisma fix, the email `FROM_ADDRESS` domain fix, the Server Action
  `bodySizeLimit` config) were relayed as manual chat instructions rather
  than patches, so the sandbox's git history and the real deployed
  repo's history aren't identical file-for-file. If a patch fails to
  apply with a context/hunk mismatch on a file that seems unrelated to
  the current change, this kind of drift is the first thing to suspect —
  compare the live file's actual content against what the patch expects
  before assuming the patch itself is broken.
- When a patch fails this way, the safe fix is to **exclude the drifted
  file from the patch** (revert it to the parent commit's content before
  `git format-patch`) and hand it over as a plain snippet/instruction
  instead of fighting to make history match retroactively.

## What's next

No open backlog is tracked in this file on purpose — check with whoever
requested v1.0.0 for current priorities before starting new work. The
QA checklist (`docs/qa-checklist.md`) is the closest thing to a "what
must keep working" list; update it when a flow changes shape.
