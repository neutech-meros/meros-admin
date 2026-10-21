# Architecture rules (meros-admin)

## What this app is

`meros-admin` is the Next.js (App Router) admin dashboard for Meros. It owns **no data**:
every real value comes from the admin API of the backend monorepo `meros-app`
(`apps/api`, integration branch `dev`). The admin never talks to a database, Redis, a
queue or a paid external API directly.

## Request path — always through a same-origin proxy (hard rule)

```
browser (client component) → /api/admin/** (Next.js route handler, server) → meros-app /admin/**
```

- Screens never call `meros-app` directly. They call a same-origin route under
  `src/app/api/admin/**`, which forwards to `${MEROS_API_URL}/admin/**`.
- The admin API key (`MEROS_ADMIN_API_KEY`) and the actor (`MEROS_ADMIN_ACTOR`) exist
  **only on the server**. They are never sent to, read by, or accepted from the browser.
- Every proxy follows the same pattern:
  1. `isProxyEnabled(<flag>)` first — 404 when off.
  2. `getProxyEnv()` for URL, key and actor.
  3. `fetch` upstream with `Authorization: Bearer <key>` and `cache: 'no-store'`; path ids
     encoded with `encodeURIComponent`.
  4. Validate the upstream body with zod (`safeParse`); undeclared fields are stripped.
  5. Any failure → generic 502 body, details only in the server log, never secrets.
  6. Status codes the screen relies on (400/404/409) are passed through deliberately.
  7. Write actions send `X-Admin-Actor` (or the backend's `actorLabel`/`reviewedBy`) set
     from `MEROS_ADMIN_ACTOR` on the server.
- Reference implementations: GET `src/app/api/admin/moderation/reports/route.ts`; POST
  with body and actor `src/app/api/admin/business-accounts/[id]/reject/route.ts`;
  per-user GET via `src/lib/server/admin-user-proxy.ts`.

## Proxy flags and env (hard rule)

- One flag per screen in `ProxyFlag` (`src/lib/server/proxy-env.ts`). Flags default **on in
  development/test and off in production**; only the literal `true` enables them.
- This is a stop-gap: the admin has **no authentication yet**. Flags stay off in
  production until the admin-auth work lands (MER-690 web gate, MER-717 API side). Every
  flag is documented, commented out, in `.env.example` with that reference.
- `process.env` is read **only** in `src/lib/server/proxy-env.ts`.

## Layout

- Screens: `src/app/(admin)/<area>/page.tsx` (client components) + `__tests__/`.
- Proxy routes: `src/app/api/admin/**/route.ts` + co-located tests.
- Server-only helpers: `src/lib/server/**`.
- Client libs (fetch the proxy, zod schemas, adapters to view models):
  `src/lib/admin/*.ts` + `src/lib/admin/__tests__/`.
- Components: `src/components/admin/**` (admin building blocks such as
  `drawer/DrawerBlocks.tsx`), primitives in `src/components/ui/` (shadcn/Radix).
- Mock data: `src/lib/mocks/admin/*` and atom seeds in `src/store/atoms/*` are legacy from
  the reference port. New code must not read mocks at runtime; mocks are allowed only as
  test fixtures. A screen backed by mocks must not claim real behaviour (no "saved" toast
  for something that was not saved).
- Navigation: `src/components/admin/nav-config.ts`; only keys in `ENABLED_NAV_KEYS` are
  navigable.

## Backend contract is the source of truth

- The shape of every upstream response comes from `meros-app` `origin/dev`
  (`apps/api/src/modules/<module>/{routes,service,schemas}.ts`, `packages/shared`).
  Admin zod schemas mirror it; they do not invent fields.
- A field the API does not provide is shown as unavailable (`—`), never fabricated.
- A capability the API lacks is backend work (an `API:` subtask in `meros-app`), not
  something the admin simulates.

## i18n

Three locales: `pt` (default and fallback), `en`, `es` — `src/locales/ptBR.json`,
`enUS.json`, `esES.json`, loaded by `src/i18n/index.ts`. No hardcoded user-facing
strings (see conventions.md).
