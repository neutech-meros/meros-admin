# MER-796 — UI: Reported content screen

Parent story: MER-777 (Admin – Review Reported Content). Siblings: MER-795 (API, **not
started**), MER-797 (QA, separate).

> MER-796 itself has no description in Jira. Scope derives from MER-777's AC and from the
> "Meros Admin (standalone).html" mockup export the user provided (a bundled prototype of
> the full admin app; the Moderation & Trust → Reported content screen and its detail
> drawer are fully designed there, driven by `window.MEROS.MODERATION_QUEUE`, which is
> undefined in that particular export — so the queue table renders empty in the mockup
> itself, but every column, badge, empty/loading state, and the detail-drawer's field
> layout and copy are all present in the mockup's source and are what this ticket ports).

## Decisions from the user

- **Base branch:** fresh branch off `feature/admin-dashboard-sidebar`, not stacked on the
  Users & Creators PR chain (#2→#3→#4). Those PRs are still under review/unmerged, and this
  screen doesn't depend on anything they added. Trade-off accepted: `DrawerBlocks` and
  `badge-tone` (built for that stack) aren't available here and won't be imported — see
  "New shared pieces" below for what this ticket adds instead.
- **Data source:** mock data only, matching every prior screen's first iteration (Users &
  Creators, Dashboard). Wiring to MER-795's real endpoints is that ticket's own follow-up,
  once MER-795 actually ships a contract — same split as MER-780/781.

## Goal

Add the "Reported content" screen (`Moderation & Trust → Reported content` in the sidebar,
already present in `nav-config.ts` as `moderation-reported`, unrouted today) at
`/moderation/reported`, so an admin can:

- See reported content in a **Queue** (open reports) with a **Reviewed** tab (past decisions).
- Open a report to see full context: the content, who reported it and why, the account's
  history, and the account it belongs to.
- **Keep** or **Remove** the content from the detail drawer (or directly from the queue row).
  Both actions move the item from Queue to Reviewed and record who decided and when.

This covers 3 of MER-777's 5 AC bullets (queue listing, detail view, action + status update)
with mock data. The remaining two (notifying the reported party, audit-logging to a real
store) need MER-795's backend and are out of scope here — see "Out of scope."

## Design reference (from the mockup)

**Queue tab** — table columns: *Item sinalizado* (title + content-kind subtitle), *Reason*,
*Account* (avatar + owner name + handle), *Origem* (report count, e.g. "2 reports", falling
back to a raw source label like "Automatic flagging" when there's no reporter detail), *
Severidade* (badge: High/Average/Low → danger/warning/neutral), a **Review** button per row
(opens the detail drawer). No pagination in the mockup (queues are expected to be short;
matches MER-777's AC of "newest first" with no page-size mentioned).

**Reviewed tab** — table columns: *Item*, *Account*, *Reports* (count text), *Decision*
(badge: Kept=success / Removed=danger), *Reviewed by*, *When*. Empty state: "Nothing
reviewed yet."

Tab pill shows a live count next to "Queue" / "Reviewed" (`{{ count }}` badge).

**Detail drawer** (opens on row click or Review button):

- Header: title = `"{kind} reported"` (e.g. "Travel list reported"), subtitle = the
  content's own title, a severity badge.
- Blocks, in order:
  1. Cover/title restatement of the flagged content's title.
  2. "Reported content" — the flagged excerpt/snippet itself.
  3. "Content type" (kind: Travel list / Comment / Profile / …).
  4. "Where it lives" (e.g. "Travel list · 14 stops · published 12/08/2026").
  5. "Account" — owner name · handle · account type · account status.
  6. "Reason" — the queue row's top-line reason.
  7. A sub-heading "Reported by N users" (or "N user"), followed by one row per reporter:
     name, handle (or "AI moderation" for automatic detection), their specific reason, and
     the date they reported it. (Automatic detection appears as a "reporter" with handle
     "AI moderation" and a reason like "Offensive language · score 0.91" — modeled as data,
     not a special-cased UI element.)
  8. "Account history" — free-text prior-moderation-action summary for that account (e.g.
     "1 warning issued in June 2026." / "No prior moderation actions on this account.").
- Actions: **Remove content** (danger-outlined) and **Keep content** (primary). Both close
  the drawer, toast a confirmation, and move the item to Reviewed. The mockup also has an
  "Open account" button that deep-links to the Users & Creators screen — **not built here**,
  since that screen doesn't exist on this branch (see "Out of scope").

**Idle/loading states in the mockup:** a "Moderation queue not loaded" idle screen with a
"Check queue" button, and a loading skeleton — but the mockup's own state wiring hardcodes
the idle state to never show (`modIdleDisplay: 'none'`), i.e. the real prototype always
treats the queue as already loaded. This ticket follows that: the mock data is available
synchronously on mount, same as Dashboard and the Users screen's original mock-data cut, no
idle "check queue" gate.

## Mock data model

New file `src/lib/mocks/admin/moderation.ts`:

```ts
export type ReportSeverity = 'High' | 'Average' | 'Low';
export type ReportDecision = 'Kept' | 'Removed';

export interface Reporter {
  name: string; // "Automatic detection" for AI-flagged reports
  handle: string; // "AI moderation" for AI-flagged reports
  reason: string;
  date: string; // display string, e.g. "12 Aug 2026, 09:14"
}

export interface ReportedItem {
  id: string;
  title: string; // the flagged content's own title
  kind: string; // "Travel list" | "Comment" | "Profile" | …
  reason: string; // top-line reason shown in the queue row
  severity: ReportSeverity;
  excerpt: string; // the flagged content/snippet itself
  where: string; // "Travel list · 14 stops · published 12/08/2026"
  owner: string;
  handle: string;
  account: string; // "Creator · Verified" | "Traveler" | …
  accountStatus: string; // "Active" | "Under review" | …
  priorAction: string; // account-history free text
  reporters: Reporter[];
  initials: string;
  avatarColor: string;
}

export interface ReviewedItem {
  id: string;
  title: string;
  owner: string;
  reportsLabel: string; // "3 user reports" / "1 user report"
  decision: ReportDecision;
  reviewedBy: string;
  reviewedAt: string; // display string
}

export function getReportedQueue(): ReportedItem[];
export function getReviewedReports(): ReviewedItem[]; // seed, pre-populated (2 entries, ported from the mockup)
```

Seed `getReportedQueue()` with the mockup's exact 3 entries (travel-list GPS/illegal-access
case, AI-flagged harassing comment, duplicate-profile impersonation case) — real, specific
scenarios read far better in review/demo than generic placeholders, and they exercise every
field (automatic vs. human reporter, single vs. multiple reporters, every severity level).

State for Keep/Remove lives in the page component (`useState`), not the mock module: calling
`getReportedQueue()`/`getReviewedReports()` again always returns the original seed — the page
keeps its own `resolved: Set<string>` and `reviewed: ReviewedItem[]` state, exactly like
`resolveReport` in the mockup keeps `modResolved`/`modReviewed` in component state rather than
mutating the seed arrays. A page refresh resets to the seed, same as every other mock-backed
screen in this app today.

## New shared pieces (since DrawerBlocks/badge-tone aren't on this branch)

- **`statusStyle`/`typeStyle` in `lib/admin/status-styles.ts`**: extend `STATUS_MAP` with
  `High`/`Average`/`Low` (severity) and `Kept` (success, alongside the existing `Removed`→
  danger, which the map already covers via `Deleted`'s pattern — add `Removed` explicitly
  rather than relying on `Deleted`'s copy reading correctly by coincidence).
- **No generic `DrawerBlocks`.** The detail drawer's block list (kv rows, the reporters
  list, free-text blocks) is specific enough to this one screen that a reusable block-kind
  system would be speculative generality for a single consumer. Build a single
  `ReportDetailDrawer` component (`components/admin/moderation/ReportDetailDrawer.tsx`)
  using `Sheet`/`SheetContent` (already in `components/ui/sheet.tsx`) directly, with plain
  JSX per section — same level of abstraction as `dashboard/page.tsx`'s cards, not a new
  mini-framework.
- **`Tabs`** (`components/ui/tabs.tsx`, already present) for the Queue/Reviewed switcher —
  same primitive the mockup's own tab styling implies (underline + count pill), built as
  plain buttons with conditional styling (matching `dashboard/page.tsx`'s revenue-period
  toggle, not Radix `Tabs`, since there's no existing Radix-tabs usage on this branch to
  follow and the mockup's own markup for this is two plain clickable divs, not an ARIA
  tablist).

## Scope

- `src/lib/mocks/admin/moderation.ts` — mock data + types, as above.
- `src/app/(admin)/moderation/reported/page.tsx` — the screen: header, Queue/Reviewed tabs
  with live counts, both tables, empty state for Reviewed, row click opens the drawer.
- `src/components/admin/moderation/ReportDetailDrawer.tsx` — the detail drawer.
- `src/lib/admin/status-styles.ts` — extend `STATUS_MAP` (severity + decision tones).
- `src/locales/{enUS,ptBR,esES}.json` — every new string under `admin.moderation.*`
  (matching this repo's per-screen i18n namespacing), all 3 locales genuinely translated
  (not copied), enforced the same way as the existing locale-coverage test.
- Tests: mock-data unit test, page test (renders queue, tab switch shows/hides tables and
  counts, row click opens drawer, empty Reviewed state), drawer test (renders every block,
  reporter list, Keep/Remove call the right handler and close the drawer).

## Out of scope

- Real backend integration (MER-795 hasn't started; this is 100% mock, like every other
  screen's first cut).
- The mockup's "Open account" cross-link into Users & Creators — that screen isn't on this
  branch. Omit the button entirely rather than stub a broken link or an unexplained toast;
  nothing in MER-777's AC requires it.
- Notifying the reported user and durable audit-logging (MER-777's AC bullets 4–5) — need a
  real backend and don't make sense against mock data that resets on refresh.
- Server-side filtering/pagination/search on the queue — the mockup itself has none, and
  MER-777's AC only asks for "newest first," which the seed order already satisfies.
- Any change to `nav-config.ts` — `moderation-reported` and its label already exist there.

## Plan

1. **Mock data** (`lib/mocks/admin/moderation.ts` + test): types, seed data (3 queue items,
   2 reviewed items, ported verbatim from the mockup's `REPORT_DETAILS`/`MOD_REVIEWED_SEED`),
   `getReportedQueue()`/`getReviewedReports()`. TDD: write the data-shape test first.
2. **Status styles**: extend `STATUS_MAP` for severity + decision tones; extend
   `status-styles.test.ts`.
3. **Detail drawer component**: `ReportDetailDrawer`, receiving a `ReportedItem | null` plus
   `onKeep`/`onRemove`/`onClose` callbacks — pure presentational, no data fetching. Test
   renders every block and wires the two actions.
4. **Page**: wires mock data + drawer + tab state + Keep/Remove state transitions (queue →
   reviewed). Test covers the interactions listed under Scope.
5. **i18n**: add `admin.moderation.*` keys to all 3 locale files as work proceeds (not a
   separate pass) — same discipline as every other screen this session, so there's no
   English-only gap to catch in review.
6. Full validation: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.

## Fable unit breakdown (TDD, one agent per unit, sequential where a later unit depends on an earlier one's exports)

1. Mock data + status-styles extension (independent, first).
2. `ReportDetailDrawer` (depends on mock data's types).
3. Page (depends on both).

Each agent gets: this spec, the relevant existing file(s) to match conventions against
(`dashboard/page.tsx`, `status-styles.ts`, `components/ui/sheet.tsx`, `components/ui/tabs.tsx`),
and the hard rule that everything (code, identifiers, comments, commit messages) is in
English regardless of what language surrounds this instruction.
