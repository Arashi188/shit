# Build queue

## Step 1 — Foundation (complete)
- [x] Monorepo, strict TypeScript, API versioning, CSS design tokens.
- [x] Development interfaces and stubs for age gate, payments, and mail.
- [x] Persisted, signed self-declared 18+ cookie enforced by server middleware.
- [x] Initial identity/RBAC PostgreSQL migration and business-logic tests for the foundation.

## Step 2 — Product catalogue (ready for review)
- [x] Currency-configured relational schema for brands, categories, products, product categories and images.
- [x] Development seed data is optional and requires an explicitly configured currency and minor-unit exponent.
- [x] Product listing/search/filter/sort/pagination, product detail, category and enabled-currency API endpoints.
- [x] Storefront catalogue UI with API-backed search, filters, product details and pagination.
- [x] Cloudinary signed upload helper with no public signing endpoint until admin authentication/RBAC is in place.
- [x] Catalog and upload-signature business-logic tests.

## Step 3 — Customer authentication (implemented, review)
- [x] Email/password registration and login with scrypt password hashing.
- [x] Opaque, hashed, expiring server sessions; HTTP-only SameSite cookie; logout and session revocation.
- [x] Email verification tokens with single-use expiry, resend flow, and blocked unverified login.
- [x] Password reset token flow and session invalidation.
- [x] Authenticated identity endpoint and permission-check middleware.
- [x] Customer registration, login, verification, and sign-out controls in the storefront; Google sign-in omitted per owner direction.
- [x] Auth business logic tests.

## Next steps (partially complete)
- [x] Review Step 2 catalogue.
- [x] Cart/pricing/discount/shipping calculation and tests.
- [x] Checkout, stock reservation guardrails, mock payment lifecycle, order state machine, and order-confirmation mail notifications.
- [ ] Customer account dashboard.
- [ ] Admin catalog, categories, orders, customers, coupons, reviews, content, and audit log UI/APIs.
- [x] Production hardening baseline: environment-driven provider configuration, fail-fast production checks, and real provider hooks for Stripe/Resend when configured.
- [x] Provider approvals, deployment and operational documentation.

## Configuration required later
- [ ] Primary market, display currency, tax/VAT rules, shipping zones and legal age/privacy copy.
- [ ] PostgreSQL instance and production secrets.
- [ ] Google OAuth credentials, Cloudinary account, and transactional email provider.
- [ ] Written payment-provider approval for adult wellness before selecting a real gateway.
