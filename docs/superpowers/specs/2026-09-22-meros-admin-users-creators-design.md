# Meros Admin — Users & Creators Screen

Date: 2026-09-22

## Context

This is the next screen ported from `Meros Admin (standalone).html` into the
Next.js app, following Phase 1 (shell + Overview/Dashboard, on branch
`worktree-meros-admin-phase1`). It's the `users` NAV entry: `/users`, no
sub-items.

Same source as Phase 1 (see that phase's spec for the full extraction
method). Relevant line ranges in the extracted template
(`Meros Admin (standalone).html`'s `__bundler/template` script body,
`lines[390]`):

- Screen markup: 1291–1397 (`data-screen-label="Users &amp; Creators"`)
- Reset password dialog markup: 2877–2920
- Shared drawer markup (tab strip, stats, profile view/edit, generic
  blocks renderer): 2937–3213, specifically tabs 2964–2976, stats
  2955–2962, profile 2978–3058, generic blocks 3060–3206
- Script: `userRows`/`uCols`/`uSel`/sort logic 5386–5433; `usersColumns`
  5980–5987; `usersRows` (final row shaping) 5988–6011; `uf` filter
  view-models 5954–5959; footer/empty/pager 5952–5953, 5978–5979,
  6012–6022; `openDrawer()` 3682; user-detail branch of `drawerSpec()`
  3865–3968; `ut` tab view-models 6043–6055; `pwd` reset-password
  view-model 6303–6365

## Fidelity requirement

Same rule as Phase 1: 100% faithful to what actually **renders** in the
reference HTML — not to what the script's data model theoretically
supports. Phase 1 already established this rule is load-bearing (it's why
the Sidebar NAV tree was rebuilt to match the captured DOM instead of the
fuller script `NAV` array).

This screen has the same kind of script/markup divergence, confirmed by
direct extraction, and the resolution is the same in every case: **build
what the markup binds to, skip what the script computes but the markup
never references.**

Specifically:

- **Filters**: the markup renders exactly 3 `<sc-raw-select>` filters —
  Account, Plan, Status — each with hardcoded literal `<option>` lists
  (not driven by `uf.X.options`). The script also builds a `uf.type`
  filter view-model and a `userSortOptions` dropdown (`userSortValue`/
  `onUserSort`), but neither is referenced anywhere in the markup — the
  `<div>` where a fourth control would go (markup lines 1326–1329) is
  empty. **Do not build a type filter or a combined sort-dropdown.**
  Column-header click-to-sort (via `usersColumns`) is what the markup
  actually wires up.
- **Drawer tabs**: the script's `drawerSpec()` computes content for 11
  tabs (`perfil`, `subscriptions`, `compras`, `listas`, `followers`,
  `seguindo`, `historico`, `devices`, `sessoes`, `denuncias`, `atividade`),
  and a separate `dw.tabs` array (from external `D.USER_TABS`, not present
  in this file). But the markup's tab strip (lines 2964–2976) only binds 4
  literal tab elements: `ut.perfil` ("Profile"), `ut.subscriptions`
  ("Subscriptions"), `ut.historico` ("History"), `ut.denuncias`
  ("Reports"). **Build only these 4 tabs.** Do not build Purchases, Lists,
  Followers, Following, Devices, Sessions, or Activity tabs — they have no
  rendered entry point in the reference.
- **Pagination footer**: `usersFooterText` is a literal hardcoded string
  (`'Showing 1–' + userRows.length + ' de 3.482 accounts'` — note the
  mixed EN/PT "de", exactly as in the source) where only the first number
  is real (the filtered row count) and the total (`3.482`) is a fake,
  non-computed constant. `usersPager`'s 5 buttons (‹ 1 2 3 ›) all have
  `onClick: () => {}` — decorative, not functional. Port both exactly as
  inert/fake as they are in the source — do not wire up real pagination.
- **Kebab row menu**: the markup shows exactly 4 actions — "View profile",
  "Reset password", "Deactivate account" (label flips to "Reactivate
  account" when `status === 'Deactivated'`), "Delete account". The script
  also has an `mMessage` handler ("Message sent" toast) — skip it, it has
  no corresponding markup row (the gap between "View profile" and "Reset
  password" at markup line 1371 is empty, matching the dead-code pattern).
  Deactivate/Delete are **instant toasts, no confirmation dialog, no real
  data mutation** — matches the source exactly, don't add a confirmation
  step that isn't there.
- **Reset password dialog**: build faithfully — channel picker (Email/SMS)
  with inline pencil-icon edit, validation (email regex
  `/^[^@\s]+@[^@\s.]+\.[^@\s]+$/`, phone valid at ≥8 digits), and a
  simulated send (toast only, no real network call) — this part of the
  script has a real, complete, markup-bound implementation, unlike the
  dead code above.

## Scope

**In scope:**

- `/users` page: search input, 3 filters (Account/Plan/Status), sortable
  6-column table + kebab-action column, decorative footer/pager, empty
  state.
- Row kebab menu: View profile (opens drawer), Reset password (opens
  dialog), Deactivate/Reactivate account (toast), Delete account (toast).
- User detail drawer (right-side `Sheet`, first real use of the
  drawer/Sheet pattern Phase 1 deferred): header (avatar, name, email,
  type badge), 4 stat tiles (Plan/Followers/Following/Status), 4 tabs
  (Profile, Subscriptions, History, Reports) — Profile has view + edit
  modes; Subscriptions/History/Reports render their respective block
  types (key-value rows / timeline / table) against mock data, each with
  a faithful empty state when there's nothing to show.
- Reset password dialog (shadcn `Dialog`, first real use of that
  component Phase 1 installed but never used).
- Mock data module: user records (see field list below), plus per-user
  subscriptions/history/reports needed by the 3 non-Profile tabs.

**Explicitly out of scope** (per the fidelity rule above, or general Phase
1 boundaries):

- The Type filter, the combined sort dropdown, functional pagination —
  none of these render in the reference.
- The 7 unbound drawer tabs (Purchases, Lists, Followers, Following,
  Devices, Sessions, Activity).
- Any confirmation dialog for Deactivate/Delete (the reference has none).
- Any other NAV screen. Non-`/users` links still 404 as established in
  Phase 1.
- Real backend mutation of any kind — everything stays mock/toast-only,
  consistent with the rest of this port so far.

## Data model

Inferred from every usage site in the script (see extraction above);
`window.MEROS.USERS` itself is not in the source file, so records are
invented mock data using this exact shape:

```ts
interface UserRecord {
  name: string;
  email: string;
  phone: string;
  location: string;
  bio?: string; // falls back to 'No bio added.' in the drawer
  account?: 'Personal' | 'Business'; // defaults to 'Personal'
  plan: 'Free trial' | 'Freemium' | 'Premium';
  followers: string; // e.g. "12.3k" — parsed by a followersNum()-equivalent for sorting
  following: string; // same string format, drawer-stat only
  joined: string; // date string, parsed via Date.parse() for sorting
  status: 'Active' | 'Deactivated' | 'Deleted';
  type: 'User' | 'Creator';
}
```

Note the source has two independent "Creator" signals — port both as
independent, don't reconcile them: the table's **Account** column badge
is `account === 'Business' ? 'Creator' : 'User'` (derived from `account`,
not `type`); the drawer's **title badge** is `badge(type)` directly
(`Creator` → info color, `User` → neutral). Mock records may have `type`
and `account` disagree, matching the source's data model (they're
independently settable there too). The script's `listas` (Lists) tab,
which gates on `type === 'Creator'`, is one of the 7 unbound tabs this
screen doesn't build — not relevant here beyond noting where `type` would
otherwise matter.

**Badge coloring — this screen uses a different helper than Phase 1's,
confirmed by reading the source directly.** Phase 1's
`src/lib/admin/status-styles.ts` (`statusStyle`/`typeStyle`) ports a
Dashboard-specific function (script lines 5101–5118) with its own status
set. This screen's markup is driven by `cellHelpers().badge()` (script
lines 3595–3609), a general-purpose helper used across most of the
reference's generic/table screens, with a genuinely different tone map:

```js
const map = {
  success: ['var(--success)', 'var(--success-bg)'],
  warning: ['var(--warning)', 'var(--warning-bg)'],
  danger: ['var(--danger)', 'var(--danger-bg)'],
  info: ['var(--info)', 'var(--info-bg)'],
  neutral: ['var(--text-secondary)', 'var(--bg-surface-hover)'],
};
const auto = {
  Published: 'success', Active: 'success', Paid: 'success', Completed: 'success', Approved: 'success', Won: 'success',
  'In review': 'warning', Pending: 'warning', Processing: 'warning', Requested: 'warning', 'In dispute': 'warning',
  Reported: 'danger', Failed: 'danger', Denied: 'danger', Blocked: 'danger', Lost: 'danger', Received: 'danger',
  Creator: 'info', 'Session atual': 'info',
};
// tone = explicit override, else auto[status], else 'neutral'
```

Note this map has **no entry for `Deleted`** (Phase 1's dashboard-specific
map colors it danger; this general helper falls through to neutral for
it) — port the map above exactly, don't merge it with Phase 1's. Add a
new `src/lib/admin/badge-tone.ts` (or similar) rather than extending
`status-styles.ts` — they're two distinct, independently-faithful ports of
two different source functions, and conflating them would silently change
one screen's colors to match the other's.

Subscriptions/history/reports tab data is fully invented mock data (no
extraction possible — `D.getUserSubscriptions`/`getUserHistory`/
`getUserReports` are external functions not in this file) — shape it to
match exactly what `drawerSpec()`'s blocks expect: subscriptions as
key-value rows (Plan/Amount/Subscriber since/Status), history/reports as
the generic block renderer's timeline/table block types already
identified in Phase 1's drawer-block vocabulary (`isKv`, `isTimeline`,
`isTable`, `isEmpty`).

## Architecture

**Mock data** — `src/lib/mocks/admin/users.ts`:
- `getUsers(): UserRecord[]` — a handful (8–10) of invented records
  covering the full value space (mix of Personal/Business,
  User/Creator, all 3 plans, all 3 statuses) so the filters/sort/empty
  state are all exercisable.
- `getUserSubscriptions(user)`, `getUserHistory(user)`,
  `getUserReports(user)` — small invented per-tab datasets, empty for at
  least one mock user (to exercise each tab's empty state).
- A shared `initialsOf`/avatar-color helper — reuse or extract the one
  already written in `src/lib/mocks/admin/dashboard.ts` rather than
  duplicating it (move it to a shared location if reused, e.g.
  `src/lib/mocks/admin/shared.ts`, since this is exactly the kind of
  chrome-adjacent duplication Phase 1's final review flagged once
  already).

**Filtering/sorting logic** — ported as pure functions (mirrors the
script's `userRows`/`uCols`/sort-comparator logic) in
`src/lib/admin/users-table.ts` or colocated in the page — controller's
call at plan-writing time; keep it unit-testable either way (search by
name/email, filter by account/plan/status, sort by any of the 6 sortable
keys with the exact comparator rules: `followers` parsed via a
k/m-suffix-aware numeric parse, `joined` via `Date.parse`, everything
else via case-insensitive string compare, toggling asc/desc on repeat
clicks of the same column).

**Components** (`src/components/admin/users/`):
- `UsersFilters.tsx` — search input + 3 selects + "Clear filters" button
  (shown only when any filter/search/sort is active, matching
  `usersClearDisplay`'s condition).
- `UsersTable.tsx` — sortable header row + body rows + kebab menu
  (`DropdownMenu`, matching Header's existing usage pattern) + footer +
  empty state, built on the shadcn `Table` primitives already installed
  in Phase 1.
- `UserDetailDrawer.tsx` — the `Sheet`-based drawer: header, stats,
  4-tab strip, Profile view/edit panel, and a small
  `DrawerBlocks.tsx` (or similar) renderer for the 3 non-Profile tabs'
  block types (kv/timeline/table/empty) — reusable by future screens'
  drawers too, so give it a clean, documented interface now.
- `ResetPasswordDialog.tsx` — the shadcn `Dialog`-based channel-picker
  dialog.

**Page** (`src/app/(admin)/users/page.tsx`) — owns the page-level state
(query, filters, sort key/dir, drawer open state + active tab, profile
edit mode + draft, reset-password dialog state) and composes the pieces
above, following the same pattern Phase 1's Dashboard page already
established (state + mock-data calls in the page, presentational
components underneath).

**Toasts** — Deactivate/Delete/Reset-password/Profile-save all fire a
toast via the existing `sonner` `Toaster` Phase 1 already mounted in
`AdminShell` but never used — this is that component's first real
consumer. Use the `toast()` function from `sonner` directly (or however
the existing `ui/sonner.tsx` wrapper expects to be called — check its
current export shape before assuming).

**i18n** — same split as Phase 1: UI chrome (headings, column labels,
filter labels, button text, dialog copy, empty-state copy) through
`t()`, mock-data record values (names, emails, plans, statuses as data,
not labels) rendered directly. Status/type/account **badge text** itself
is data-driven (e.g. "Active", "Creator") and follows the same
not-i18n-required rule as Phase 1's status badges.

## Testing

Follow Phase 1's established pattern: focused behavior tests, not
exhaustive visual snapshots.

- Mock data accessors: shape/count assertions.
- Filter/sort pure functions: one test per filter dimension, one per sort
  key, one for the search-then-filter-then-sort combination.
- `UsersTable`: renders rows, column-header click toggles sort
  (asc→desc→asc), kebab menu opens and its 4 actions are present.
- `UserDetailDrawer`: opens with the right user's data, tab click
  switches content, Profile edit mode toggles and Save exits edit mode.
- `ResetPasswordDialog`: channel switch, inline edit + validation (invalid
  email/phone blocks send with an error path), successful send closes
  the dialog.
- Page-level test: search narrows visible rows, clicking a row opens the
  drawer with that user's name, "Clear filters" appears only when a
  filter/search/sort is active and resets everything when clicked.

## Verification

Same as Phase 1: `npm test && npx tsc --noEmit && npm run lint`, plus a
manual pass against the running dev server comparing table/filters/
drawer/dialog to the reference screen-by-screen, in both themes.
