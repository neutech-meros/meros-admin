# MER-829 — UI: Business accounts screen

Parent story: MER-827 (Admin – Manage Business Accounts). Siblings: MER-828 (API, **not
started at all** — no branch, commit, or spec exists for it anywhere), MER-830 (QA, separate).

> MER-829 itself has no description in Jira. Scope derives from MER-827's AC:
> - Given business accounts exist, when the admin opens Business accounts, then a
>   filterable/searchable list is shown with status and key business info.
> - Given a business account, when the admin opens its detail, then moderation actions
>   (flag/suspend/restore) are available with confirmation.
> - All moderation actions are audit-logged with actor, reason and timestamp.

## Finding: the mockup's "Business accounts" screen is the WRONG ticket's scope

`Meros Admin (standalone).html` has a `moderation-business` section already, reachable from
the same "Moderation & Trust" nav group this ticket targets. It is **not** what MER-829
needs: it renders a business-account **application/approval queue** — Pending / More info /
Approved / Rejected requests, each with a CNPJ, uploaded documents, a requester, and a
Reject/Approve flow with a rejection-reason dialog. MER-827's own description explicitly
calls this out: *"Distinct from MER-300 (business-account application review, apps/web):
this story is the moderation list/detail screen inside the unified admin dashboard for
accounts that **already have** business status."* The mockup section is MER-300's screen,
not this one — porting it here would build the wrong feature entirely (this is the same
class of mismatch as MER-795/796's "Comment" report scenario that the real schema couldn't
support). **This spec does not use that mockup section as a design reference** — the layout
below is designed fresh from MER-827's AC and this app's existing table/drawer conventions
(Users & Creators, Reported content).

## Real domain model (read, not created by this ticket)

Checked `apps/api/prisma/schema.prisma` in `meros-app` (the base repo, not a worktree —
MER-828 hasn't branched, so this is simply current `dev`):

- `BusinessAccount` (keyed off `User`, 1:1): `status: BusinessAccountStatus` (`INELIGIBLE |
  ELIGIBLE | IN_REVIEW | SETUP_REQUIRED | REJECTED | ACTIVE` — the *application* pipeline;
  `ACTIVE` here means "has a live business account," which is this screen's population
  filter), `entityStatus: EntityStatus` (`ACTIVE | INACTIVE | SUSPENDED | DELETED` — the
  same moderation-status enum `Profile`/`List`/`ListItem` already use for suspend/restore
  elsewhere in this codebase, e.g. MER-795's Reported-content moderation), `businessType:
  String?` (free text, no fixed category enum — unlike the mockup's "Accommodation" style
  categories, which don't exist in the real schema), `verifiedBusiness: Boolean`,
  `activatedAt`/`createdAt: DateTime`. The business's display name/handle live on the linked
  `Profile` (`name`, `nickname`), not on `BusinessAccount` itself.
- `BusinessAccountStatusLog`: `fromStatus`/`toStatus: BusinessAccountStatus?`, `actorId`,
  `actorType: BusinessAccountActorType (USER|ADMIN|SYSTEM)`, `reason: String?`, `createdAt`.
  This already tracks the *application* pipeline's transitions — it is typed to
  `BusinessAccountStatus`, not `EntityStatus`, so it cannot record a suspend/restore/flag
  action as-is. **MER-828 will need its own audit mechanism** for this ticket's moderation
  actions (extending this log's shape, or a parallel one) — flagged here as an open question
  for that ticket, not solved by this one.
- **No "flag" concept exists anywhere in the schema.** `entityStatus` has no `FLAGGED` value,
  and there's no boolean marker for it either. This is real, uncovered scope for MER-828.

## Decisions from the user

- **Base branch:** fresh off `main`. Two things needed to line up first, both now done:
  local `main` was stale (missing `24c759e`, the Phase-1 admin shell/sidebar/`nav-config.ts`
  merge) — synced via fast-forward before branching, per the user's explicit reminder to
  make sure the sidebar is on the correct version. `moderation-business` already exists in
  `nav-config.ts` (added speculatively alongside `moderation-reported` in that same Phase-1
  merge) — no nav change needed, this ticket just builds the screen at the route it already
  points to (`/moderation/business`). Not stacked on the Users & Creators or Reported-content
  PR chains (both still open/unmerged) — this screen doesn't depend on either, same
  reasoning MER-796 used for the same choice.
- **Data source: mock only.** MER-828 hasn't started (confirmed: no branch, commit, or spec
  anywhere for it). Same precedent as every other screen in this app (Dashboard,
  Users & Creators, Reported content) — build the screen against a realistic mock module,
  let MER-828's own follow-up wire in the real contract once it exists.
- **"Flag" modeled as an orthogonal boolean, not a status value.** Since `entityStatus` has
  no room for it and the AC lists flag/suspend/restore as related-but-distinct actions, the
  mock models `flagged: boolean` + `flagReason: string | null` separately from `status:
  'ACTIVE' | 'SUSPENDED'` — an account can be flagged and still active (a soft warning that
  doesn't block anything), or suspended without ever having been flagged. This is a real
  design proposal MER-828 should either confirm or push back on, not a guess to hide.
- **`reviewedBy`/actor stays optional, free text.** Same reasoning as MER-795/796: there is
  still no real per-admin identity in this app (MER-717, not done). Every confirmation
  dialog has an optional "Your name" field; leaving it blank is allowed and does not fabricate
  a name. This keeps the new screen consistent with the two sibling moderation screens
  instead of quietly reintroducing the fabricated-identity anti-pattern one of them was
  already reviewed for.
- **DELETED accounts are excluded from the list entirely** (not just unactionable) — matches
  this app's existing convention elsewhere of not surfacing hard-deleted rows in an
  active-management screen.

## Design (fresh — no mockup reference for this screen)

**List** (`/moderation/business`), Table columns:

- **Business** — avatar (initials/color, same pattern as Users & Creators and Reported
  content) + name + handle (two-line cell).
- **Type** — `businessType`, or an em dash when null.
- **Verified** — a small badge/check icon when `verifiedBusiness` is true, otherwise blank
  (not a red "unverified" badge — absence of the check is enough, avoids a wall of
  danger-toned badges for the common case).
- **Status** — badge: Active (success) / Suspended (danger). `Suspended` and `Flagged`
  tones are new entries this ticket adds to `status-styles.ts`'s `STATUS_MAP` (currently
  has `Active`→success already; `Suspended`→danger and `Flagged`→warning are missing).
- **Flagged** — a small warning badge when `flagged` is true, otherwise blank (same
  absence-is-enough treatment as Verified).
- **Since** — `activatedAt`, formatted display string.
- Row click (or a "Review" button, matching Reported content's row-action convention) opens
  the detail drawer.

**Filters** (above the table, matching Users & Creators' filter bar level of complexity):
free-text search (matches name/handle/email), a status select (All / Active / Suspended), a
"Flagged only" toggle.

**Detail drawer** (`Sheet`/`SheetContent`, same primitive as Reported content's drawer):

- Header: business name, handle, current Status + Flagged badges.
- Business info block: type, verified, email, activated/created dates.
- **Moderation history** — a new list pattern for this app (Reported content's drawer has no
  equivalent; Users & Creators' subscription/deactivation tabs are the closest precedent for
  "a chronological list of past events"): one row per `ModerationHistoryEntry` — action
  label (Flagged / Unflagged / Suspended / Restored), actor (or "—" when none was given),
  reason (or "—"), date. Newest first. Directly satisfies the AC's audit-log requirement at
  the UI layer (mock-only for now; MER-828 supplies the real trail).
- Actions, each opening a `Dialog` (already in `components/ui`, no new primitive needed)
  confirmation with an optional reason + optional actor-name field before executing:
  - **Flag** / **Unflag** — toggles `flagged`, independent of `status`.
  - **Suspend** / **Restore** — toggles `status` between `ACTIVE` and `SUSPENDED`.
  Both actions append a new `ModerationHistoryEntry` and toast a confirmation, matching
  Reported content's Keep/Remove interaction shape (state lives in the page component, mock
  module always returns the original seed — refresh resets to seed, same as every other
  mock-backed screen here).

## Mock data model

New file `src/lib/mocks/admin/businessAccounts.ts`:

```ts
export type BusinessAccountStatus = 'ACTIVE' | 'SUSPENDED';
export type ModerationAction = 'FLAGGED' | 'UNFLAGGED' | 'SUSPENDED' | 'RESTORED';

export interface ModerationHistoryEntry {
  id: string;
  action: ModerationAction;
  actor: string | null; // free text, optional — no real admin identity yet (MER-717)
  reason: string | null;
  at: string; // display string
}

export interface BusinessAccountItem {
  id: string;
  name: string; // Profile.name
  handle: string | null; // Profile.nickname
  email: string | null;
  businessType: string | null;
  verifiedBusiness: boolean;
  status: BusinessAccountStatus;
  flagged: boolean;
  flagReason: string | null;
  activatedAt: string; // display string
  createdAt: string; // display string
  initials: string;
  avatarColor: string;
  history: ModerationHistoryEntry[]; // newest first
}

export function getBusinessAccounts(): BusinessAccountItem[];
```

Seed with ~6 realistic entries covering every state combination the UI needs to exercise:
active+verified+clean, active+unverified, active+flagged, suspended (with a history entry
recording why), suspended+flagged, and one with a multi-entry history (flagged, then later
suspended) to prove the drawer's history list orders and renders more than one action.

## New shared pieces

- **`status-styles.ts`**: add `Suspended` (danger) and `Flagged` (warning) to `STATUS_MAP`.
- **No new confirmation-dialog primitive** — `components/ui/dialog.tsx` already exists on
  this base and is generic enough (`Dialog`/`DialogContent`/`DialogHeader`/`DialogFooter`)
  for a title + optional-reason-input + confirm/cancel shape. Reported content's branch adds
  its own `AlertDialog` primitive, but that branch is unmerged and this one doesn't need a
  second confirmation-dialog abstraction to duplicate what `Dialog` already covers.

## Scope

- `src/lib/mocks/admin/businessAccounts.ts` — mock data + types, as above.
- `src/app/(admin)/moderation/business/page.tsx` — the screen: filters, table, row click
  opens the drawer.
- `src/components/admin/moderation/BusinessAccountFilters.tsx` — search + status + flagged
  filter controls (mirrors `UsersFilters`'s role from the Users & Creators screen, but that
  component isn't available on this branch — building fresh, same as MER-796 did for its
  own pieces).
- `src/components/admin/moderation/BusinessAccountDetailDrawer.tsx` — the detail drawer +
  the four moderation actions and their confirmation dialogs.
- `src/lib/admin/status-styles.ts` — extend `STATUS_MAP` (`Suspended`, `Flagged`).
- `src/locales/{enUS,ptBR,esES}.json` — every new string under `admin.businessAccounts.*`,
  all 3 locales genuinely translated (enforced by this repo's existing locale-coverage test
  pattern, e.g. `admin.moderation.drawer` in the Reported content screen's tests).
- Tests: mock-data test, filters test, table/page test (search, status filter, flagged
  toggle, row click opens drawer, empty-results state), drawer test (renders business info +
  history, all 4 actions call through with the right state transition and history entry,
  confirmation dialogs work, optional actor/reason fields).

## Out of scope

- Real backend integration (MER-828 hasn't started; 100% mock, like every screen's first
  cut in this app).
- The application/eligibility review screen (Pending/Approved/Rejected requests, CNPJ,
  documents) — that is MER-300's screen, explicitly out of scope per MER-827's own
  description, and not what this ticket's mockup section actually is despite living at the
  same nav key.
- Deciding MER-828's real audit-log schema (extending `BusinessAccountStatusLog` vs. a new
  model) — flagged as an open question for that ticket, not this one's to answer.
- Bulk actions, pagination/server-side filtering — AC doesn't ask for either, and no
  existing screen in this app has them yet.
- Any change to `nav-config.ts` — `moderation-business` and its label already exist there.

## Plan

1. **Mock data** (`lib/mocks/admin/businessAccounts.ts` + test): types, seed (6 entries),
   `getBusinessAccounts()`. TDD: data-shape test first.
2. **Status styles**: add `Suspended`/`Flagged` to `STATUS_MAP`; extend
   `status-styles.test.ts`.
3. **Filters component**: `BusinessAccountFilters` — pure presentational + a small
   client-side filter-predicate helper (search/status/flagged), unit-tested directly.
4. **Detail drawer component**: `BusinessAccountDetailDrawer` — receives a
   `BusinessAccountItem | null` plus the 4 action callbacks; renders info + history; owns
   its own confirmation-dialog open/close state. Pure presentational otherwise, no data
   fetching.
5. **Page**: wires mock data + filters + table + drawer + the 4 state transitions
   (flag/unflag/suspend/restore), each appending a history entry. Test covers filtering,
   drawer open/close, and all 4 actions end-to-end.
6. **i18n**: add `admin.businessAccounts.*` keys to all 3 locale files as work proceeds.
7. Full validation: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.

## Fable unit breakdown (TDD, one agent per unit, sequential where a later unit depends on an earlier one's exports)

1. Mock data + status-styles extension (independent, first).
2. Filters component (depends on mock data's types only).
3. Detail drawer (depends on mock data's types only — can run in parallel with unit 2).
4. Page (depends on 1, 2, and 3).

Each agent gets: this spec, the relevant existing file(s) to match conventions against
(`src/app/(admin)/dashboard/page.tsx`, `status-styles.ts`, `components/ui/{sheet,dialog,
table,tabs}.tsx`, `src/locales/enUS.json` for the i18n namespacing convention), and the hard
rule that everything (code, identifiers, comments, commit messages) is in English regardless
of what language surrounds this instruction.
