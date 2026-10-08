# Admin Panel — Gap Analysis & Roadmap

Stack: Express 5 + Mongoose (MongoDB Atlas), React 19 + Vite (storefront and admin), Razorpay, Supabase Storage.
MongoDB has no migrations; schema changes are additive fields with defaults, and startup seeding (`services/bootstrap.js`) is idempotent.

## What existed before

| Area | State found | Reused / changed |
|---|---|---|
| Admin | `Admin` model (email, password), login, **public** `/api/admin/seed` | Extended model (name, role, active, lockout, last login, tokenVersion, 2FA flag). Public seed route removed; bootstrap seeds the first admin from env. |
| Products | `food` model (name, description, price, image, category). Add/remove routes **had no auth** | Kept the model; added `imageProvider`, `imageKey`, timestamps. Routes now need `products.*` permissions. |
| Orders | `Order` model with `items` array snapshot, `status`, `payment` bool. List/status routes **had no auth**. Stripe verify endpoint could delete any order without auth | Kept the model and existing statuses; added order number, subtotal/fee, payment status/method, Razorpay IDs, timeline. Stripe replaced by Razorpay. |
| Customers | `user` model with embedded `cartData` | Kept; added timestamps (older users fall back to their ObjectId time for analytics). |
| Cart | Embedded in user (`cartData`) | Unchanged. Now cleared only after a verified payment. |
| `single-product` model | Unused (single orders already write to `Order`) | Left in place; candidate for removal. |
| DB credentials | Mongo URI with password **hardcoded in `config/db.js` and committed** | Moved to `MONGODB_URI` in `.env`. **Rotate the password.** It is still in git history. |

## Done in this pass (Phase 1 + payments + storage)

- **Auth:** JWT with an admin claim (customer tokens are rejected on admin routes). Remember-me sets 7 days, otherwise 12 hours. Rate-limited login. The account locks for 15 minutes after 5 failures. Change password revokes the admin's other sessions.
- **Roles and permissions:** 8 built-in roles. Custom roles get any mix of permissions. Every admin endpoint checks a permission, and the sidebar and routes hide pages the admin can't use.
- **Audit log:** logins, failed logins, product create/delete, order status changes, admin and role changes. Secrets are scrubbed before saving.
- **Dashboard:** KPIs, revenue/orders over time, status mix, top products and categories, payment methods, new vs returning buyers. Ranges: today, yesterday, 7d, 30d, this month, last month, this year, custom. Times use the store timezone.
- **Razorpay:** the server prices every order from the database. Payments are verified by HMAC signature and the paid update is idempotent. A closed checkout marks the order failed rather than confirmed. An optional signed webhook at `/api/order/razorpay/webhook` uses event-ID idempotency.
- **Storage:** provider abstraction. Supabase Storage is used when configured, local disk otherwise. Uploads are type- and size-validated. Images are deleted when their product is removed.
- **Settings:** public `deliveryFee` and currency settings, used by both the storefront display and the server charge.

## Remaining modules (by phase)

| Phase | Modules | Notes / new collections |
|---|---|---|
| 1 (rest) | Forgot/reset password, email verification | Needs SMTP (Phase 9) |
| 2 | Products v2: SKU, slug, variants, gallery, SEO, status; Categories (nested), Brands, Attributes; Inventory + stock history; Warehouses | `categories`, `brands`, `attributes`, `inventory_transactions`, `warehouses`. Migrate the `food.category` string to a category ref. Low/out-of-stock KPIs plug into the dashboard (currently `null`). |
| 3 | Customer list/profile, addresses, wishlist, cart analytics | `addresses`, `wishlists`. Move `cartData` to a `carts` collection to enable abandoned-cart tracking. |
| 4 | Order create/edit, invoices (PDF), payment transactions list | `invoices`, `payment_transactions` |
| 5 | Shipping methods/zones/shipments, tax classes (GST/CGST/SGST/IGST), returns, refunds (Razorpay refund API) | `shipments`, `tax_rates`, `returns`, `refunds` |
| 6 | Coupons + usage, promotions, segments | `coupons`, `coupon_usages`, `promotions` |
| 7 | Reviews, CMS pages, banners, FAQ, blog | |
| 8 | Reports + CSV/PDF export (queued) | Orders CSV export exists client-side already |
| 9 | Email/SMS/WhatsApp templates and notifications | Needs a job queue (e.g. BullMQ + Redis or Agenda on Mongo) |
| 10 | Integrations UI (encrypted secrets, test connection), webhook log viewer | `webhookevents` already exists |
| 11 | System logs, security hardening (CORS allow-list, CSP), broader tests | |
