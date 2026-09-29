# Category Requests Screen Implementation Plan

**Goal:** Build the `/catalog/requests` screen — KPI row, status tabs, a
table of category requests with status-gated row actions, and a read-only
detail drawer — faithfully matching what renders and behaves in the
reference for the `Category requests` screen-label block.

**Architecture:** Mock data (`src/lib/mocks/admin/category-requests.ts`)
feeds a page-level state machine (`src/app/(admin)/catalog/requests/page.tsx`,
`useState(() => getCategoryRequests())`, `useState` for the active tab),
with pure filter/count/tone logic in `src/lib/admin/category-requests.ts`.
Presentational: `CategoryRequestsTable` and `CategoryRequestDetailDrawer`
(the latter built on `Sheet` + `DrawerBlocks`, with a new `'text'` block
kind added to `DrawerBlocks`).

**Tech Stack:** Next.js 15 (App Router) + TypeScript, Tailwind v4
(CSS-first, `var(--token)` inline styles), shadcn `Sheet` (already
installed), `sonner` (toast), `react-i18next`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-29-mer-802-category-requests-screen-design.md`

## Global Constraints

- 100% fidelity to what renders/behaves in the `Category requests`
  screen-label block only. See spec's "Source extraction" for line
  numbers.
- Actions (row-level Create/Reject, drawer's Ask for details/Reject/Create
  category) are **toast-only** — do not mutate the request's status or
  move it between tabs. This is a verified difference from MER-799's
  Categories screen; don't "fix" it toward consistency.
- KPI labels read "Approved"/"Rejected" with no "(30d)" suffix (the
  reference's own labels are misleading here — see spec) — apply the same
  fix MER-829's Business Accounts screen needed after review, proactively.
- `t()` for every UI-chrome string; request field values (names, dates,
  free text) render directly, same split every prior screen uses.
- Stage files explicitly on every commit (`git add <files>`, never
  `-A`/`.`).
- Canonical `cn` helper: `@/lib/utils`. Don't touch `src/components/ui/*`
  except the one planned `DrawerBlocks` addition.
- No Fable/multi-agent orchestration — direct implementation, same as
  every prior screen this session.

## Tasks

### 1. Mock data layer

- [ ] `src/lib/mocks/admin/category-requests.ts`: `export type
      CategoryRequestStatus = 'Pending' | 'More info' | 'Approved' |
      'Rejected'`; `export interface CategoryRequest { id, name, parent,
      level, requester, handle, role, date, votes, status, why, similar,
      initials, avatarColor }`; private `SEED` (6 rows, ported verbatim
      from `CAT_REQUESTS`, `id` slugified from `name`); `export function
      getCategoryRequests(): CategoryRequest[]` returns a fresh array each
      call (map over `SEED`, compute `initials`/`avatarColor` via
      `initialsOf`/`avatarColorForIndex`), same freshness contract as
      `users.ts`.

### 2. Pure logic

- [ ] `src/lib/admin/category-requests.ts`:
  - `export const TAB_KEYS: Array<CategoryRequestStatus | 'all'>` —
    `['Pending', 'More info', 'Approved', 'Rejected', 'all']`.
  - `export function filterByTab(requests, tab): CategoryRequest[]`.
  - `export function countByStatus(requests, status): number`.
  - `export function requestStatusTone(status): { color: string;
    background: string }` (the `reqBadge()` port).
- [ ] `src/lib/admin/__tests__/category-requests.test.ts`: filterByTab for
      each tab incl. `all`, countByStatus per status, requestStatusTone
      for all 4 statuses.

### 3. `DrawerBlocks` extension

- [ ] Add `{ kind: 'text'; label: string; value: string }` to the
      `DrawerBlock` union in `src/components/admin/drawer/DrawerBlocks.tsx`
      and a `TextBlock` renderer (label above, paragraph below, left
      aligned — distinct from `kv`'s right-aligned single-line value).
      Existing block kinds/consumers untouched.
- [ ] Extend `src/components/admin/drawer/__tests__/DrawerBlocks.test.tsx`
      with a case for the new `'text'` kind.

### 4. Presentational components

- [ ] `src/components/admin/category-requests/CategoryRequestsTable.tsx`
      — props: `requests: CategoryRequest[]`, `onRowClick`, `onApprove`,
      `onReject`. Columns per spec; "Create"/"Reject" buttons shown only
      when `status === 'Pending'`, else a "View" button; empty state when
      `requests.length === 0`.
- [ ] `src/components/admin/category-requests/CategoryRequestDetailDrawer.tsx`
      — props: `request: CategoryRequest | null`, `onClose`,
      `onAskForDetails`, `onReject`, `onApprove`. `Sheet`/`SheetContent`
      shell (avatar + name + status badge + "Proposed under {parent}"),
      `DrawerBlocks` body (7 `kv` + 2 `text` blocks per spec), footer
      actions gated on `status === 'Pending' || status === 'More info'`
      (3 buttons) vs. else (`Close` only).

### 5. Page

- [ ] `src/app/(admin)/catalog/requests/page.tsx` — `'use client'`;
      `useState<CategoryRequest[]>(() => getCategoryRequests())`,
      `useState<CategoryRequestStatus | 'all'>('Pending')` for the tab,
      `useState<CategoryRequest | null>(null)` for the drawer target.
  - Header: title + subtitle (spec's exact copy, no create button — this
    screen has none in the reference).
  - KPI row: 4 cards (Pending review / Waiting on requester /
    Approved / Rejected), plain counts, no "(30d)".
  - Tab row with live counts, `all` unsuffixed.
  - `CategoryRequestsTable` fed by `filterByTab(requests, tab)`.
  - Handlers call `toast.success`/`toast.error`/`toast.info` per spec's
    exact copy (interpolating `requester`/`name`/`parent`) and, for the
    drawer's three action handlers, also close the drawer — matching
    `this.setState({ drawer: null })`. None of them call `setRequests`.
  - `CategoryRequestDetailDrawer` wired to the same handlers.

### 6. i18n

- [ ] Add `admin.categoryRequests.*` to `enUS.json`/`ptBR.json`/`esES.json`:
      `title`, `subtitle`, `kpiPending`, `kpiMoreInfo`, `kpiApproved`,
      `kpiRejected`, `tabPending`, `tabMoreInfo`, `tabApproved`,
      `tabRejected`, `tabAll` (`{{count}}` where applicable, `tabAll` has
      none), `table.category`, `table.parentPath`, `table.requestedBy`,
      `table.votes`, `table.requested`, `table.status`, `table.create`,
      `table.reject`, `table.view`, `emptyTitle`, `emptyDescription`,
      `drawer.subtitle` (`{{parent}}`), `drawer.proposedName`,
      `drawer.parentPath`, `drawer.level`, `drawer.requestedBy`
      (`{{requester}}`, `{{handle}}`), `drawer.account`, `drawer.requestedOn`,
      `drawer.communityVotes` (`{{count}}`), `drawer.whyTheyNeedIt`,
      `drawer.overlapCheck`, `drawer.askForDetails`, `drawer.reject`,
      `drawer.createCategory`, `drawer.close`, `toasts.detailsRequestedTitle`,
      `toasts.detailsRequestedDescription` (`{{requester}}`),
      `toasts.rejectedTitle`, `toasts.rejectedDescription` (`{{requester}}`),
      `toasts.createdTitle`, `toasts.createdDescription` (`{{name}}`,
      `{{parent}}`).
  - Real translations in pt/es, matching interpolation tokens, no
    leftover English (manual check, same as prior screens — no automated
    parity test added, see spec).

### 7. Tests

- [ ] `src/app/(admin)/catalog/requests/__tests__/page.test.tsx`:
  - Default tab is Pending; KPI counts and tab counts match the seed.
  - Switching tabs filters the table; `all` shows every row.
  - Empty state when a tab (if any) has zero rows — if the seed doesn't
    naturally produce one, seed-mutate in the test the same way prior
    page tests do.
  - Row-level Create/Reject only present for Pending rows; other statuses
    show "View" instead.
  - Clicking Create/Reject/View/row opens the right thing and fires the
    right toast, and **does not** move the row to a different tab or
    change the displayed status — this is the one behavior most likely to
    get "fixed" by habit from the Categories screen, so assert it
    explicitly.
  - Drawer: opens with the right title/subtitle/badge/KV values/free-text
    blocks; action set differs for Pending/More info (3 buttons) vs.
    Approved/Rejected (Close only); each action toasts with the exact
    copy and closes the drawer.

## Review Focus

- **Toast-only fidelity** — the single most likely regression is
  "helpfully" making approve/reject actually move the row, by analogy with
  the Categories screen shipped in the same PR series. Verify against the
  spec's evidence (the reference's own handlers) before trusting instinct
  here.
- **Row-action vs. drawer-action gating mismatch** — `More info` rows show
  "View" in the table (not Create/Reject) but the drawer opened from that
  same row DOES offer all 3 actions. Confirm both gates are implemented
  independently, not accidentally unified.
- **KPI/tab count consistency** — tab counts, KPI counts and
  `filterByTab`'s actual filtering must all agree with each other and with
  the seed data; a common way to get this wrong is computing one of them
  from a stale/filtered list instead of the full `requests` array.
