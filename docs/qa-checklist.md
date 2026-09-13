# QA Checklist — Reuni Merch Store

Run this end-to-end on the **production Netlify URL** before announcing the site live.

## Storefront
- [ ] Katalog loads and shows all active products with correct prices
- [ ] Product detail page: variant dropdown shows correct labels/prices; qty input rejects 0/negative
- [ ] Add to cart, then check cart page shows correct items grouped by vendor
- [ ] Checkout with delivery method PICKUP: total = subtotal, no shipping cost
- [ ] Checkout with delivery method SHIPPING: address required, total = subtotal + flat shipping rate
- [ ] After checkout, redirected to /order/[token] with correct order number and totals
- [ ] Order confirmation email received by buyer with correct bank info and working link
- [ ] Admin notification email received for the new order

## Payment flow
- [ ] Upload a valid JPG/PNG proof: status becomes "Menunggu Konfirmasi Admin"
- [ ] Admin receives "bukti baru" email
- [ ] Uploading a .txt or >5MB file is rejected with a clear error, order stays PENDING_PAYMENT
- [ ] Admin confirms payment: order status becomes PAID, buyer gets confirmation email, correct vendor(s) get "order baru" email
- [ ] Admin rejects proof: order reverts to PENDING_PAYMENT, upload form reappears on the public order page, buyer gets "upload ulang" email

## Admin panel
- [ ] Non-logged-in visit to /admin redirects to /login
- [ ] Create/deactivate product and variant works and reflects on the public katalog immediately
- [ ] Create vendor account, log in as that vendor successfully
- [ ] Reset vendor password, log in with the new password successfully, old password no longer works
- [ ] Order list filters (search text, vendor, status) each narrow results correctly
- [ ] Excel export downloads and opens with correct data, respecting the active filter

## Vendor panel
- [ ] Vendor sees only orders containing their own products
- [ ] Vendor cannot see another vendor's items within a shared multi-vendor order
- [ ] Vendor updates fulfillment status; change reflected immediately and does not affect other vendors' items in the same order

## Cron
- [ ] Manually confirm (via Netlify dashboard Functions tab) that daily-order-check is scheduled
- [ ] Backdate a real (non-critical) test order 25h+ and confirm a reminder email arrives after manually invoking the function
- [ ] Backdate a test order 73h+ and confirm it becomes EXPIRED with an email, after manually invoking the function

## General
- [ ] Test on a phone-width browser window — no horizontal scrolling, forms usable
- [ ] All SESSION_SECRET / RESEND_API_KEY / DATABASE_URL / SITE_URL env vars are set in Netlify production (not just local .env)
