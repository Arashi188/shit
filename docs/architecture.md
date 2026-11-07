# Architecture — Serein

## Steps 1–2 boundaries

This repository is an npm-workspaces monorepo with a React/Vite client, Express/TypeScript API, Prisma/PostgreSQL schema, and shared product documentation. The REST API is rooted at `/api/v1`. Runtime secrets are loaded from environment variables; `.env.example` is development-only.

The server is the authority for age acceptance, prices, inventory, discounts, shipping, and order totals. Client work should submit identifiers and quantities only. All amounts in later domain models must be integer minor units plus an explicit ISO currency code. Market and currency are intentionally unset.

## Integration seams

- `AgeGate`: signed self-declaration cookie for development, checked on the server. Replaceable by an ID-verification adapter after market review.
- `PaymentProvider`: `initiate`, `verify`, `refund`, and `handleWebhook`; development implementation only. Real gateway work requires written product-category approval.
- `Mailer`: console development adapter; production adapter is deferred.
- `Cloudinary`: server-side signed-upload helper is implemented. No signing endpoint is exposed until admin authentication and RBAC can protect it.

## Security boundaries

- Passwords, payment secrets, and provider tokens must never be returned through API DTOs.
- Age proof is HMAC-signed server-side and stored in an HTTP-only, SameSite=Lax cookie; production cookies are Secure.
- Checkout routes must mount `requireAgeVerified` before business handlers.
- Admin writes must go through permission checks and create audit records.
- No client-supplied price, currency, tax, discount, shipping, or total is authoritative.

## Data model

Steps 1 and 2 commit identity/RBAC and catalog migrations. Catalog prices use integer minor units and reference an explicitly configured currency with its minor-unit exponent. Categories support parent/child relationships; products may belong to multiple categories and have image metadata records. Image files are not stored in PostgreSQL. Cart, order, coupon, review, content, and audit models are introduced with their owning feature steps so each schema change can be reviewed and tested.
