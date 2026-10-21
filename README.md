# UNI-COM Console

Internal operations console for the UNI-COM commerce API. Built for marketplace staff and sellers to manage orders, catalog, media, coupons, and customer access.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 with shadcn/ui (`radix-nova` style)
- React Router, TanStack Query, Zustand
- React Hook Form + Zod
- Bun and oxlint

## Getting started

```bash
bun install
cp .env.example .env
bun dev
```

`VITE_API_URL` is optional. It defaults to `https://uni-com.devusimple.workers.dev`.

Other commands:

```bash
bun run lint      # oxlint
bun run build     # tsc -b && vite build
bun run preview   # preview production build
```

There is no test suite or formatter configured yet.

## Screens

- **Login** — staff sign-in, password reset request
- **Overview** — setup checklist plus recent orders and products
- **Orders** — filterable-by-scope list, detail sheet, cancel/fulfil actions
- **Products** — catalog list, product creation (seller accounts), detail, variations, image attachment
- **Categories** — create, list, delete
- **Coupons** — create, list, toggle active, edit usage limit/expiry
- **Customers** — public user directory with role/status actions
- **Media** — upload, visibility toggle, copy URL, delete
- **Settings** — profile, account details, session controls

Access is role-aware. Categories and coupons require `admin`; customers requires `admin` or `moderator`. Product creation is restricted to `seller` accounts by the API.

## API notes

The CMS talks directly to the live API. CORS is open, so no dev proxy is needed. Success responses are `{ success: true, data }`; failures are `{ success: false, error }`.

Key constraints:

- List endpoints return plain arrays and use `limit`/`offset`; there are no total counts.
- Refresh tokens rotate. The access token is kept in memory and the refresh token in `localStorage`.
- The user directory only exposes names, avatars, and IDs.
- Coupons cannot be deleted; only `isActive`, `maxUses`, and `endsAt` can be updated.
- Orders can only be cancelled (pending) or fulfilled; there are no refund or shipping-edit endpoints.
- Payment is COD only. Stripe endpoints are present but not configured.

See `AGENTS.md` for detailed engineering constraints and endpoint gaps.
