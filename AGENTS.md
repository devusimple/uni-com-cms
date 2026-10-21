# AGENTS.md

UNI-COM Console is an internal admin/seller SPA for the UNI-COM commerce API. The scaffold includes authentication, the guarded admin shell, dashboard, orders, products, categories, coupons, customers, media, and settings.

- Live spec (source of truth): https://uni-com.devusimple.workers.dev/openapi.json
- Re-fetch the spec before adding endpoints; if it conflicts with this file, the spec wins.
- Snapshot verified 2026-10-21.

## Commands

- Bun only. `bun install`, `bun dev`, `bun run lint` (oxlint), `bun run build` (`tsc -b && vite build`), `bun run preview`.
- No test suite, formatter, or CI exists. Do not claim commands that are not defined in `package.json`.
- shadcn CLI: `bunx --bun shadcn@latest add <component>`. `components.json` uses the `radix-nova` style. Generated primitives live in `src/components/ui` and import `cn` from the npm `cn` package; leave those files alone unless a generated file is broken.
- Env: copy `.env.example` to `.env`. `VITE_API_URL` defaults to production, so the app works without a local env file.
- TypeScript 6 rejects `baseUrl`. The `@/*` alias is declared through `paths` in `tsconfig.app.json`/`tsconfig.json` and mirrored in `vite.config.ts`; do not reintroduce `baseUrl`.

## Structure

- `src/app/`: providers, router, auth guards, shell, sidebar, breadcrumbs.
- `src/pages/`: one file per resource. Product form pages and the detail screen live under `src/pages/products/`.
- `src/lib/api/`: typed client, resource modules, and types mirroring the OpenAPI schemas. `client.ts` owns envelope unwrapping, bearer auth, and 401 refresh. Never call `fetch` from components.
- `src/lib/auth-store.ts`: Zustand session store. Access token stays in memory; refresh token persists to `localStorage`.
- `src/components/ui/`: generated shadcn primitives. App-specific components belong in `src/components/`.
- Product descriptions use the minimal WYSIWYG in `src/components/rich-text-editor.tsx` (`react-simple-wysiwyg`). Sanitize HTML with `src/lib/product-description.ts` before saving and render it through `ProductDescription`; never inject raw description HTML.
- `src/hooks/`: shared hooks such as `useAuth` and `useDebouncedValue`.

## Routing and access

- `/login` sits outside the shell. Every other route is under `RequireAuth` + `AppShell`.
- Role guards: categories and coupons are `admin`; customers is `admin`/`moderator`. Sidebar items are filtered to match.
- Product creation is seller-only per the API. Admins can view published products and edit/delete existing ones, but cannot create products. Do not remove this restriction without confirming the API allows it.
- Multi-field forms are routes, not dialogs: `/products/new`, `/products/:id/edit`, `/products/:id/variations/new`, `/products/:id/variations/:variationId/edit`, `/categories/new`, `/coupons/new`, and `/coupons/:id/edit`. `/products/new` is seller-guarded; category and coupon form routes are admin-guarded. Edit routes enforce ownership in the page.
- Orders use `?scope=all` for admin/moderator and `?scope=sold` for sellers.
- Keep filters and pagination in the URL; the screens already do this.

## API contract

- Base: `import.meta.env.VITE_API_URL` or `https://uni-com.devusimple.workers.dev`; all paths start with `/api/`. CORS is `Access-Control-Allow-Origin: *` (verified), so no Vite proxy.
- Success: `{ success: true, data }`. Failure: `{ success: false, error: { code, message, details? } }`. `data` may be an entity, an array, or a wrapper (`/auth/me` → `data.user`).
- Lists are plain arrays, never `{ items, total }`. Paginated endpoints use `limit`/`offset` (default 20, max 100); infer "has more" from `data.length === limit`. Categories and coupons return the full list.
- Auth: login returns `{ user, accessToken, refreshToken }`; refresh rotates both; logout needs `{ refreshToken }` in the body, logout-all uses the bearer. On 401, refresh once with a single shared promise and retry once. Never refresh on 403 and never retry-loop.
- Money is integer cents (`*Cents`). Format through `src/lib/format.ts`; right-align and use `tabular-nums`.
- Timestamps are numeric with an undocumented unit. Reads use a helper that accepts seconds or milliseconds. Coupon expiry writes currently assume Unix seconds — verify against the backend before relying on date editing.
- Roles: `user | seller | moderator | admin`. `POST /products` is seller-only; `PATCH`/`DELETE /products/{id}` is owner-or-admin. Media must be uploaded by the user who attaches it.
- Upload is multipart with field `file`; attach with `POST /products/{id}/images { mediaId }`, which marks the media public. There is no reorder endpoint.

## API gaps — do not invent endpoints

- **Users:** `/api/users` is a public directory returning only `{ id, name, avatarUrl }` (optional `role` filter); `/api/auth/me` is self. No admin user list, email search, or role/status in list data. Role/status mutations require an ID you already have; status is moderator+ and cannot target self or admins-by-moderator.
- **Categories:** list/create/delete only. No get-one, no update.
- **Coupons:** list/create plus PATCH of `isActive`, `maxUses`, `endsAt` only. No delete; `code`, `type`, and `value` are immutable.
- **Orders:** list via `scope=mine|all|sold` plus `limit`/`offset`. No status or search filter. Actions are cancel (pending) and fulfill; no refunds or shipping edits. `status` has no enum — render defensively.
- **Products:** list returns `ProductCard` (no categories); detail has attributes, variations, and images but no categories, so edit forms cannot prefill categories. Create requires at least one attribute; variations are separate calls and options must cover every attribute. `?mine=true` shows own drafts; an "all sellers' drafts" view is not documented — verify with an admin token before building moderation. Product descriptions are stored as sanitized HTML; legacy plain-text descriptions still render with preserved line breaks.
- **No dashboard/analytics endpoint.** Compute KPIs from fetched lists or omit them; do not add `/api/stats`.
- Stripe pay/webhook endpoints are marked "not configured"; COD is the only payment method.

## UI rules

- shadcn/ui is the only component source. Add with the CLI; do not hand-roll Button, Dialog, Table, Form, Select, or Toast equivalents.
- Real admin patterns: persistent sidebar/topbar, breadcrumbs, page headers with one primary action, dense tables, row action menus, filter bars, URL pagination, skeletons, empty/error states, `AlertDialog` confirmations, and `sonner` toasts.
- Multi-field create/edit forms belong on dedicated routes with their own page header and sections. Do not put product, variation, category, or coupon forms in dialogs or sheets. Reserve dialogs/sheets for confirmations, single-field prompts, read-only detail, and selection pickers such as attaching an image.
- Semantic tokens only (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`). No raw palette colors, gradients, glassmorphism, emoji icons, or fake charts.
- The live database is empty. Design for empty data; never seed fake rows, fake customers, or fake KPIs.
- Login only. Do not expose self-registration or marketing pages.

## Before finishing

- Run `bun run lint` then `bun run build`.
- Smoke-test login, a hard refresh (session restore), each list's empty state, a failed mutation, role guards, and logout.
- Update this file when the live spec or toolchain changes.
