# UNI-COM Console

Internal operations console for the UNI-COM commerce API. Built for marketplace staff to manage orders, catalog, media, coupons, and customer access.

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
- **Orders** — scope switch, filterable list, detail sheet, cancel/fulfil actions
- **Products** — catalog list with search, status, category, price, and ownership filters; product creation, detail, variations, image attachment
- **Categories** — create, list, delete
- **Coupons** — create, list, toggle active, edit usage limit/expiry
- **Customers** — public user directory with role/status actions
- **Media** — upload, visibility toggle, authenticated preview and download, copy URL, delete
- **Settings** — profile, account details, session controls

Access is role-aware. The API exposes two roles: `user` and `admin`. Categories, coupons, customers, product creation, and order fulfilment require `admin`; everyone else sees only their own orders and the published catalog.

## API notes

The CMS talks directly to the live API. CORS is open, so no dev proxy is needed. Success responses are `{ success: true, data }`; failures are `{ success: false, error }`.

Key constraints:

- List endpoints return plain arrays and use `limit`/`offset`; there are no total counts.
- Refresh tokens rotate. The access token is kept in memory and the refresh token in `localStorage`.
- The user directory only exposes names, avatars, and IDs.
- Coupons cannot be deleted; only `isActive`, `maxUses`, and `endsAt` can be updated.
- Orders can only be cancelled (pending) or fulfilled; there are no refund or shipping-edit endpoints.
- Product ownership is `ownerId`. The list `category` filter takes a category slug, and `minPrice`/`maxPrice` are integer cents.
- Private media needs the session token, so the console streams those bytes and renders an object URL.
- Payment is COD only. Stripe endpoints are present but not configured.

See `AGENTS.md` for detailed engineering constraints and endpoint gaps.
