# Serein

Premium intimate wellness commerce platform. This is a staged build: Steps 1 and 2 establish the application foundation and product catalogue; later commerce flows are added after each step is reviewed.

## Brand direction

- Mood: bold, playful, inclusive, discreet, body-positive.
- Primary: vivid pink `#e6007a`.
- Deep neutrals: plum `#2a1422` and near-black `#1d0d18`.
- Soft neutrals: blush `#fff4f9`, cream `#fdf8f5`, warm line `#f0e2e8`.
- Accent: gold `#f4b400` for ratings.
- Type: geometric display headings in Outfit with Plus Jakarta Sans interface/body text.
- Tokens live in `client/src/styles/tokens.css`.

The brand name is a working name and has not been legally cleared.

## Stack

Node.js + Express 5 + TypeScript; PostgreSQL + Prisma 7; React 19 + Vite 8 + TypeScript + Tailwind CSS 4; Zod validation. The app is a monorepo under `/server`, `/client`, `/docs`.

See [docs/development.md](docs/development.md) for setup and verification; see [TODO.md](TODO.md) for scope and deferred items.

## Current status

Steps 1–3 are implemented: the API health check, server-verified age gate, authentication, and catalogue all work, and the storefront includes cart pricing plus a basic order/checkout flow backed by the mock payment provider. The payment interface remains a development mock and cannot move money. Customer accounts and admin management remain later steps.

The catalogue requires a running PostgreSQL database and its migrations. Development sample products are seeded only when `CATALOG_SEED_CURRENCY` and `CATALOG_SEED_CURRENCY_EXPONENT` are explicitly set; otherwise only categories are seeded. Payment and mail providers are now selected by environment configuration (`PAYMENT_PROVIDER`, `MAILER_PROVIDER`, and provider-specific keys such as `STRIPE_SECRET_KEY` or `RESEND_API_KEY`); the default development configuration falls back to mock payment and console mail, while production fails fast unless a provider is explicitly configured. See [docs/development.md](docs/development.md) for setup and [docs/production-readiness.md](docs/production-readiness.md) for the release checklist, deployment runbook, and provider approval gate.
