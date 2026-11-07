# Production readiness checklist

This project is now configured for provider selection by environment, but it still requires operational sign-off before a live launch. Treat the remaining work as a release gate, not a code-completion issue.

## 1. Provider approval and legal review

Before switching from the default mock/console adapters to a live provider, complete the following approvals:

- Written sign-off that the product category is lawful for adult wellness commerce in the target market.
- Payment provider approval for age-gated wellness products and any refund/cancellation policy that applies.
- Merchant account review for the selected payment provider, including compliance requirements and chargeback handling.
- Confirmation that the shipping, returns, and privacy copy match the market and the expected transaction flows.
- Validation that the app’s age-gate wording and consent messaging are appropriate for the jurisdiction.

Recommended production providers:
- Payment: Stripe for card processing, billing, and webhook handling.
- Email: Resend or similar transactional email provider.
- Media: Cloudinary if product images are required in production.

## 2. Required environment variables

Use a production `.env` (or platform secret store) with at least:

- `NODE_ENV=production`
- `PORT`
- `WEB_ORIGIN`
- `AGE_GATE_SECRET` (32+ random characters)
- `DATABASE_URL`
- `PAYMENT_PROVIDER=stripe` or `disabled`
- `MAILER_PROVIDER=resend` or `disabled`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `MAILER_FROM`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_FOLDER`

The server now fails fast in production if a real provider is not configured, which prevents accidental live deployments on mock/mock defaults.

## 3. Deployment architecture

Recommended production setup:

- Application server: Node.js process behind a TLS-enabled reverse proxy.
- API: hosted separately from the Vite client or behind a single domain with `/api` proxying.
- Database: managed PostgreSQL with backups and point-in-time recovery.
- Secrets: injected from a platform secret manager, not checked into source control.
- Webhooks: Stripe webhook endpoint should verify the signature and update payment state from the provider.
- Email: transactional mail should be sent through the provider API rather than console logs.
- Static assets: Cloudinary or a CDN for product images.

## 4. Operational runbook

### Deploy

1. Confirm secrets are present in the target environment.
2. Run Prisma migrations against the production database.
3. Verify the app boots in production mode.
4. Check `/api/v1/health` and admin routes with a real session.
5. Verify the payment webhook route and a mock or test payment flow in the provider sandbox.
6. Run a smoke test for register/login, checkout, and order status update.

### Roll back

- Keep the previous application build ready to redeploy.
- Remove new provider configuration if a rollout is unsafe.
- Restore the database from the last known-good snapshot if a migration issue is discovered.
- Disable mail or payment provider routes in the platform config if they are causing incidents.

### Monitoring

- Alert on 5xx responses, failed migrations, payment failures, and webhook validation errors.
- Log admin actions with user identifiers and timestamps.
- Monitor mail delivery and refund/manual-override workflows.

## 5. Release gate before launch

Do not ship to production until:

- legal/provider approval is documented
- a secure environment config has been reviewed
- payment and email flows are tested in a non-production provider account
- domain, TLS, and cookie configuration are validated
- staging mirrors the production environment closely enough to trust checkout behavior

This project is not yet a full production commerce launch without these checks, even though the feature set is functionally advanced for a staged build.
