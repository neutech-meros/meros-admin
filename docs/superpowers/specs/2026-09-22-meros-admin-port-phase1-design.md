# Meros Admin — Port Phase 1: Shell + Overview

Date: 2026-09-22

## Context

`Meros Admin (standalone).html` is a Claude "DC" artifact export (not plain
HTML/JS): a static HTML skeleton with `{{ }}`/`sc-if`/`sc-for` placeholders,
plus a `renderVals()` class method (~1200 lines) that computes the data those
placeholders bind to. It is not portable mechanically — every screen has to
be rewritten as a real React/Next component, using the skeleton as the exact
visual/behavioral spec and `renderVals()`/helper methods as the exact data
shape and interaction spec.

The artifact defines the full **Meros Admin** back office for a travel
marketplace/creator platform: ~17 screens with bespoke layouts plus ~30
sub-screens that share one generic table template, all inside a persistent
shell (collapsible sidebar, header with Cmd-K/notifications/theme/profile)
with overlays (detail drawer, confirm dialogs, command palette, toasts).
Full catalog (screen list, line ranges, component mapping) is preserved in
this conversation's exploration and should be re-derived by reading
`Meros Admin (standalone).html` directly during implementation — see
"Extracting the source" below.

This repo (`meros-admin`) is currently a generic Next.js boilerplate (demo
pages, generic shadcn colors, no real product code). The whole repo becomes
the Meros Admin product; boilerplate demo content is removed, not kept
alongside.

**Decomposition:** the full port (~47 screens) is too large for one spec.
This spec covers **Phase 1 only**: the persistent shell (Sidebar + Header)
and the Overview/Dashboard screen. Each subsequent screen or screen-group
gets its own spec/plan, built on the patterns established here. Do not
implement anything beyond Phase 1's scope under this spec.

## Fidelity requirement

The port must be **100% faithful** to the reference HTML: exact colors,
spacing, typography, copy, layout dimensions, and interaction/animation
behavior — not a loose reinterpretation. Concretely:

- Use the exact design tokens (CSS custom properties) defined in the
  artifact's `<head>` (lines 1–189 of the extracted template — see below):
  color scales (`primary`, `grey`, `red`, `green`, `tulip`), semantic tokens
  (`bg-canvas`, `bg-surface`, `bg-elevated`, `border-subtle`, `border-strong`,
  `text-primary/secondary/disabled`, `success/warning/danger/info` +
  their `-bg` pairs), spacing scale, radii, shadows, `--header-h`.
- Exact pixel dimensions (sidebar 72px collapsed / 264px expanded, header
  64px, etc.), exact copy/labels, exact chart colors and curve/legend
  styling, exact sparkline point shapes, exact hover/expand/collapse
  animation behavior (group max-height animation, flyout submenu on
  collapsed hover, sticky/blurred header, skeleton loading state).
- Implementation must re-read the relevant source line ranges directly
  from `Meros Admin (standalone).html` (via the extraction method below)
  for every value used — not approximate from memory or from generic
  Tailwind defaults.

**Two known gaps where literal fidelity is impossible** (data not present in
this file, confirmed with the user):

1. **Icons** — `icon(name, size)` looks up SVG path data from
   `window.MEROS.ICONS`, which is not embedded in this file. Resolution:
   map each icon name used in Phase 1 to the closest `lucide-react` icon
   (already a project dependency). Not pixel-identical to the original,
   but consistent in meaning/style.
2. **Data content** — table rows, KPI numbers, chart series come from
   `window.MEROS` / `MEROS_GEO` / `MEROS_SYS`, not embedded in this file;
   only the field names/shapes are inferable from the code that consumes
   them. Resolution: mock data using the exact field names/types/formatting
   the code expects, with plausible fictional values for the travel
   marketplace domain. Layout/logic stay 100% faithful; only the sample
   values are invented.

Everything else (layout, styling, tokens, copy, behavior) must match the
source exactly.

## Extracting the source

`Meros Admin (standalone).html` is a bundler wrapper. The real content is
JSON-encoded on specific lines and must be extracted before reading:

```js
const fs = require('fs');
const lines = fs.readFileSync('Meros Admin (standalone).html', 'utf8').split('\n');
const template = JSON.parse(lines[390]); // line 391, the `__bundler/template` script body
fs.writeFileSync('<scratch>/template_extracted.html', template);
```

The extracted file (~6419 lines) breaks down as:

- 1–189: `<head>` — font-face + global CSS + design token custom properties.
- 191–3231 (inside `<x-dc>`): static HTML skeleton (wireframe) for every
  screen, using pseudo-elements `sc-if`/`sc-for`/`sc-raw-table` etc. and
  `{{ expr }}` placeholders.
  - Shell: sidebar 195–362, header 364–426.
  - Overview/Dashboard screen: 443–695.
  - Overlays (drawer, dialogs, cmdk, toasts): 2836–3229 (not all needed in
    Phase 1 — see Scope below).
- 3232 onward: `<script type="text/x-dc">` — the component class. Relevant
  to Phase 1:
  - state/lifecycle/theme: 3233–3372
  - chart sync (dashboard revenue/subs/growth charts): ~3337–3371
  - `NAV` config: 4971–5001
  - nav helpers (`labelFor`, `navigate`, `icon`): 5003–5029
  - `renderVals()` (master view-model, incl. the dashboard `sparks` array
    around line 5212): 5207–6416

Read these ranges directly out of the extracted file while implementing —
do not rely solely on a prior summary.

## Scope (Phase 1)

**In scope:**

- `AdminShell` layout: Sidebar (collapsible, grouped nav, flyout submenus on
  collapsed hover, active-item highlighting) + Header (breadcrumb, Cmd-K
  search trigger with a working palette scoped to NAV items only,
  notifications bell with dropdown — mock/static content, theme toggle
  reusing the existing `useTheme`/`ThemeToggleButton`, profile menu).
  A mounted `<Toaster />` (shadcn `sonner`) for future phases to use.
- Overview/Dashboard screen: KPI cards with sparklines, revenue trend
  chart, subscriptions breakdown chart, latest-sales table, latest-users
  table — matching the source exactly in layout/data-shape/styling.
- Design tokens ported into `globals.css` + `tailwind.config.ts`.
- Removal of current boilerplate demo: `Navigation.tsx`, `DemoForm.tsx`,
  routes `/config`, `/atoms`, `/forms`, and the demo content of the root
  `/dashboard` page.
- `/` redirects to `/dashboard`. `/login` stays as a route (outside the
  `(admin)` shell) but its content/logic is untouched in this phase.
- All visible strings go through `react-i18next` (`t()`), with new keys
  added to `src/locales/{ptBR,enUS,esES}.json` under an `admin` section.
  The `ptBR` copy should match the source's literal text; `enUS`/`esES`
  are translations of it.

**Explicitly out of scope for Phase 1** (belongs to later screen-specific
specs): the detail drawer, confirm dialogs (reject account, reset
password), the plan editor, full Cmd-K entity indexing (users/orders/etc.
don't exist yet), world map, any screen other than Overview/Dashboard, any
real authentication logic.

## Architecture

**Routing**

- `src/app/(admin)/layout.tsx` — new route group rendering `AdminShell`
  around `children`. All current and future admin screens live under this
  group.
- `src/app/(admin)/dashboard/page.tsx` — the Overview screen (replaces the
  current demo `/dashboard` page).
- `src/app/page.tsx` — redirects to `/dashboard` (`redirect()` from
  `next/navigation`).
- `src/app/login/page.tsx` — kept, outside `(admin)`, untouched content.
- Root `src/app/layout.tsx` — stripped down to fonts + `Providers`, no
  global `Navigation`.

**Components** (`src/components/admin/`)

- `AdminShell.tsx` — composes Sidebar + Header + main content area +
  `Toaster`.
- `Sidebar.tsx` — collapsible sidebar, consumes `nav-config.ts`.
- `Header.tsx` — breadcrumb, search (Cmd-K), notifications, theme toggle,
  profile menu.
- `nav-config.ts` — the ported `NAV` tree (group keys, i18n label keys,
  icon names, hrefs), source of truth for both Sidebar and Cmd-K.
- Dashboard-specific components under `src/components/admin/dashboard/`
  (KPI card w/ sparkline, revenue chart, subs chart, latest-sales table,
  latest-users table) — kept separate from the shell so later phases don't
  bloat one file.

**shadcn/ui additions** (`npx shadcn add …`): `avatar`, `table`, `command`,
`sonner`. Existing primitives (`button`, `card`, `badge`, `dropdown-menu`,
`sheet`, `separator`) are reused as-is.

**Charts:** new dependency `recharts`, replacing the artifact's imperative
Chart.js usage with declarative React chart components, matching colors/
styling from the source tokens. Sparklines stay hand-drawn inline SVG
(as in the source) since they're trivial and library-free there too.

**Data:** `src/lib/mocks/admin/dashboard.ts` exporting accessor functions
(e.g. `getDashboardKpis()`, `getRevenueTrend()`, `getSubscriptionsBreakdown()`,
`getLatestSales()`, `getLatestUsers()`) returning mock data shaped exactly
like what `renderVals()` expects. Page/components call these functions
directly (no fetch/query layer yet); the function boundary is what later
phases replace with real API calls, without touching consumers.

**Design tokens:** extend `:root`/`.dark` in `globals.css` with the ported
scales/semantic tokens (see Fidelity requirement), and extend
`tailwind.config.ts` `theme.extend.colors` so they're usable as Tailwind
utilities (`bg-[var(--bg-surface)]` or a named utility, whichever reads
better applied consistently). Poppins replaces Geist via
`next/font/google`.

## Testing

No existing test files/conventions in this repo (Jest is configured but
unused so far). For Phase 1, add focused tests for behavior, not visual
snapshots:

- Sidebar: collapse/expand toggles width and flyout behavior; active nav
  item reflects current route.
- Header: Cmd-K opens/closes and filters NAV items by query.
- Mock data accessors: return data matching the expected shape.

No test coverage requirement for pure-visual layout — that's verified by
running the app and comparing against the source screen-by-screen.

## Verification

Before calling Phase 1 done: run `npm run dev`, open `/dashboard`, and
visually compare against the extracted reference (sidebar collapsed/
expanded, light/dark theme, header interactions, dashboard content) plus
`npm run lint` and `npm test` passing.
