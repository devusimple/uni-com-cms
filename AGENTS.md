# AGENTS.md

UNI-COM Console is an internal operations SPA for the UNI-COM commerce API. It covers authentication, the guarded shell, dashboard, orders, products, categories, coupons, customers, media, and settings.

- Live spec (source of truth): https://uni-com.devusimple.workers.dev/openapi.json
- Re-fetch the spec before adding endpoints; if it conflicts with this file, the spec wins.
- Snapshot verified 2026-10-22. The API now exposes only two roles: `user` and `admin`.

## Commands

- Bun only. `bun install`, `bun dev`, `bun run lint` (oxlint), `bun run build` (`tsc -b && vite build`), `bun run preview`.
- No test suite, formatter, or CI exists. Do not claim commands that are not defined in `package.json`.
- shadcn CLI: `bunx --bun shadcn@latest add <component>`. `components.json` uses the `radix-nova` style. Generated primitives live in `src/components/ui` and import `cn` from the npm `cn` package; leave those files alone unless a generated file is broken.
- Env: copy `.env.example` to `.env`. `VITE_API_URL` defaults to production, so the app works without a local env file. Remember that a `VITE_*` value already present in the shell environment wins over `.env` files.
- TypeScript 6 rejects `baseUrl`. The `@/*` alias is declared through `paths` in `tsconfig.app.json`/`tsconfig.json` and mirrored in `vite.config.ts`; do not reintroduce `baseUrl`.

## Structure

- `src/app/`: providers, router, auth guards, shell, sidebar, breadcrumbs.
- `src/pages/`: one file per resource. Product form pages and the detail screen live under `src/pages/products/`.
- `src/lib/api/`: typed client, resource modules, and types mirroring the OpenAPI schemas. `client.ts` owns envelope unwrapping, bearer auth, 401 refresh, and the binary `apiBlob` helper. Never call `fetch` from components.
- `src/lib/auth-store.ts`: Zustand session store. Access token stays in memory; refresh token persists to `localStorage`.
- `src/components/ui/`: generated shadcn primitives. App-specific components belong in `src/components/`.
- `src/components/media-preview.tsx` and `src/hooks/use-media-object-url.ts` render media, including private files that need the bearer token.
- Product descriptions use the minimal WYSIWYG in `src/components/rich-text-editor.tsx` (`react-simple-wysiwyg`). Sanitize HTML with `src/lib/product-description.ts` before saving and render it through `ProductDescription`; never inject raw description HTML.
- `src/hooks/`: shared hooks such as `useAuth` and `useDebouncedValue`.

## Routing and access

- `/login` sits outside the shell. Every other route is under `RequireAuth` + `AppShell`.
- Roles are `user | admin` only. `seller` and `moderator` no longer exist; the API rejects them with `VALIDATION_ERROR`.
- Admin-only routes: `/products/new`, `/categories/*`, `/coupons/*`, `/customers`. The sidebar hides the matching items.
- `POST /api/products` is admin-only. `PATCH`/`DELETE /api/products/{id}` is owner-or-admin; ownership is `ownerId` (the field was renamed from `sellerId`).
- `GET /api/orders?scope=all` and `PATCH /api/orders/{id}/fulfill` are admin-only. Everyone else uses `scope=mine` and cannot fulfil orders.
- Multi-field forms are routes, not dialogs: `/products/new`, `/products/:id/edit`, `/products/:id/variations/new`, `/products/:id/variations/:variationId/edit`, `/categories/new`, `/coupons/new`, and `/coupons/:id/edit`. Edit routes enforce ownership in the page.
- Keep filters and pagination in the URL; the screens already do this. The orders scope lives in `?scope=`, the product filters in `?status=`, `?category=`, `?minPrice=`, `?maxPrice=`, `?mine=`, `?sort=`, and `?search=`.

## API contract

- Base: `import.meta.env.VITE_API_URL` or `https://uni-com.devusimple.workers.dev`; all paths start with `/api/`. CORS is `Access-Control-Allow-Origin: *` (verified), so no Vite proxy.
- Success: `{ success: true, data }`. Failure: `{ success: false, error: { code, message, details? } }`. `data` may be an entity, an array, or a wrapper (`/auth/me` → `data.user`).
- Lists are plain arrays, never `{ items, total }`. Paginated endpoints use `limit`/`offset` (default 20, max 100); infer "has more" from `data.length === limit`. Categories and coupons return the full list.
- Auth: login returns `{ user, accessToken, refreshToken }`; refresh rotates both; logout needs `{ refreshToken }` in the body, logout-all uses the bearer. On 401, refresh once with a single shared promise and retry once. Never refresh on 403 and never retry-loop.
- Money is integer cents (`*Cents`). Format through `src/lib/format.ts`; right-align and use `tabular-nums`. The product list `minPrice`/`maxPrice` filters are also integer cents — the console accepts dollars and converts.
- Timestamps are numeric with an undocumented unit. Reads use a helper that accepts seconds or milliseconds. Coupon expiry writes currently assume Unix seconds — verify against the backend before relying on date editing.
- Upload is multipart with field `file` (max 10 MB, `415` for a bad MIME type). Attach with `POST /products/{id}/images { mediaId }`, which marks the media public. There is no reorder endpoint, but `DELETE /products/{id}/images/{mid}` detaches a single image.
- Media visibility: `PATCH /media/{id} { isPublic }`. Private files are served by `GET /media/{id}/file` and need the bearer token, so the console streams them through `apiBlob` and renders an object URL. Never point an `<img>`/`<a>` straight at a private file URL.

## API gaps — do not invent endpoints

- **Users:** `/api/users` is a public directory returning only `{ id, name, avatarUrl }` (optional `role` filter of `user|admin`); `/api/users/{id}` is a public profile; `/api/auth/me` is self. There is no admin user list with email, role, or status in list data. Role/status mutations require an ID you already have; status is admin-only and cannot target self.
- **Categories:** list/create/delete only. No get-one, no update.
- **Coupons:** list/create plus PATCH of `isActive`, `maxUses`, `endsAt` only. No delete; `code`, `type`, `value`, and `startsAt` are immutable after creation. `POST /api/coupons/preview` quotes a code for cart items but needs `variationId`/`quantity`, so it is not wired into the console.
- **Orders:** list via `scope=mine|all` plus `limit`/`offset`, and `GET /orders/{id}` for details. No status or search filter. Actions are cancel (pending) and fulfil (admin); no refunds or shipping edits. `status` has no enum — render defensively.
- **Products:** list returns `ProductCard` (no categories); detail has attributes, variations, and images but no categories, so the edit form cannot prefill them. Create requires at least one attribute (max 20 attributes, max 100 values each) and accepts `categoryIds` (max 10). `PATCH` also accepts `categoryIds`, so the edit form can set them but not show them — it only sends the field once the admin touches the list. The list filter `category` matches a category **slug**, not an id. `?mine=true` returns only the caller's own products. Observed 2026-10-22: the `status` filter is accepted but currently returns the same rows for every value, so treat it as unreliable server-side. Product descriptions are stored as sanitized HTML; legacy plain-text descriptions still render with preserved line breaks.
- **Buyer-side surfaces** (`/api/cart*`, `/api/addresses*`, `POST /api/orders`, `POST /api/orders/checkout`, `POST /api/auth/register`) exist in the spec but are storefront features. Keep them out of the console.
- **No dashboard/analytics endpoint.** Compute KPIs from fetched lists or omit them; do not add `/api/stats`.
- Stripe pay/webhook endpoints are marked "not configured"; COD is the only payment method, and `PATCH /orders/{id}/pay` answers `501`.

## UI rules

- shadcn/ui is the only component source. Add with the CLI; do not hand-roll Button, Dialog, Table, Form, Select, or Toast equivalents.
- Real admin patterns: persistent sidebar/topbar, breadcrumbs, page headers with one primary action, dense tables, row action menus, filter bars, URL pagination, skeletons, empty/error states, `AlertDialog` confirmations, and `sonner` toasts.
- Multi-field create/edit forms belong on dedicated routes with their own page header and sections. Do not put product, variation, category, or coupon forms in dialogs or sheets. Reserve dialogs/sheets for confirmations, single-field prompts, read-only detail, and selection pickers such as attaching an image.
- Semantic tokens only (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`). No raw palette colors, gradients, glassmorphism, emoji icons, or fake charts.
- Design for empty data; never seed fake rows, fake customers, or fake KPIs.
- Login only. Do not expose self-registration or marketing pages.

## Before finishing

- Run `bun run lint` then `bun run build`.
- Smoke-test login, a hard refresh (session restore), each list's empty state, a failed mutation, role guards, and logout.
- Update this file when the live spec or toolchain changes.
