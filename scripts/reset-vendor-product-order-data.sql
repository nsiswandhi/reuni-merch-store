-- Clears all Vendor, Product, ProductVariant, Order, and OrderItem rows so
-- the store can start fresh with clean data.
--
-- NOT touched (kept as-is): AdminUser (admin login accounts) and
-- AdminSettings (bank account info, flat shipping rate) — the request was
-- specifically to reset vendor/produk/order data, not admin config.
--
-- Deletes children before parents to satisfy foreign key constraints:
-- OrderItem -> Order, ProductVariant -> Product, Product -> Vendor.
--
-- Run with:
--   npx prisma db execute --file scripts/reset-vendor-product-order-data.sql --schema prisma/schema.prisma
-- (reads DATABASE_URL from your .env automatically), or paste this
-- directly into your Netlify/Neon database's SQL console.
--
-- NOTE: any payment-proof files already uploaded to Netlify Blobs for
-- existing orders are NOT deleted by this script — only the database rows
-- referencing them. The files become orphaned but harmless.

BEGIN;

DELETE FROM "OrderItem";
DELETE FROM "Order";
DELETE FROM "ProductVariant";
DELETE FROM "Product";
DELETE FROM "Vendor";

COMMIT;
