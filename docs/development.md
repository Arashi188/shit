# Development setup

## Requirements

- Node.js 22.12+ and npm 10+
- PostgreSQL 15+ for Prisma migrations

## Setup

1. Copy `.env.example` to `.env` and replace `AGE_GATE_SECRET` with at least 32 random characters.
2. Start PostgreSQL and set `DATABASE_URL` to the local database.
3. Run `npm install`.
4. Run `npm run db:generate`, `npm run db:migrate`, then `npm run db:seed`.
5. Run `npm run dev`.

To seed sample products, explicitly set `CATALOG_SEED_CURRENCY` to the market currency code and `CATALOG_SEED_CURRENCY_EXPONENT` to its minor-unit exponent before running `npm run db:seed`. If omitted, the seed creates categories only. Cloudinary settings are optional until image upload is enabled; never expose its API secret to the client.

Registration sends an email-verification link through the development console mailer. Open the printed `[dev verification link]` in the browser to verify the address. The development mailer also prints password-reset links. Configure a production mail adapter before deployment; real Google sign-in is intentionally omitted.

The API binds to `127.0.0.1:4000`; Vite binds to `127.0.0.1:5173` and proxies `/api` requests to the API over IPv4 loopback. Vite fails with a clear port-in-use error instead of silently switching ports, so run only one `npm run dev` instance. The age gate and catalogue UI use the API. Catalog endpoints require the database and migrations to be available.

## Verification

- `npm test` — age-gate, catalog query/service, Cloudinary signing, and mock-payment unit tests.
- `npm run typecheck` — strict TypeScript check for server and client.
- `npm run build` — compile/build both workspaces.
- `GET http://localhost:4000/api/v1/health` — API health response.
- `GET http://localhost:4000/api/v1/age-gate/status` — gate status.
- `GET http://localhost:4000/api/v1/categories` — visible categories (requires migrated database).
- `GET http://localhost:4000/api/v1/currencies` — enabled currencies (requires migrated database).
- `GET http://localhost:4000/api/v1/products?q=wellness` — paginated catalog search (requires migrated database).
- `POST http://localhost:4000/api/v1/auth/register` and `/api/v1/auth/login` — customer registration and login.
- `GET http://localhost:4000/api/v1/auth/me` — current session identity and permissions.
- `POST http://localhost:4000/api/v1/age-gate/accept` with `{"confirmedAdult":true}` — receives signed HTTP-only age cookie.

The health and age-gate endpoints do not query PostgreSQL; category, currency, and product endpoints do.
