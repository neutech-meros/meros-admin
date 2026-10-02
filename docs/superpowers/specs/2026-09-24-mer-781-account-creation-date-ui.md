# MER-781 — UI: display account creation date on profile & accounts list

Parent story: MER-772 (Admin – View Account Creation History). Sibling: MER-780 (API, done —
`GET /admin/accounts` in `meros-app`, branch `feat/mer-780-account-creation-timestamp-api`,
PR #237), MER-782 (QA, separate).

> MER-781 has no description in Jira. Scope derives from MER-772's AC and from what MER-780
> actually shipped.

## Goal

Replace the Users & Creators screen's mock data source with real accounts from MER-780's
endpoint, so the admin sees real creation dates — as the existing "Joined" table column, the
existing "Joined on" field in the profile drawer, and a new "Account created" entry in the
drawer's History tab (explicitly requested, format: title "Account created", date as
`D MMM YYYY`, e.g. "12 Mar 2025").

## Why this isn't just "add a field"

The screen's data is 100% fabricated mock records (`src/lib/mocks/admin/users.ts`, ids `u1`–
`u10`) with no relationship to real accounts. There is no way to attach a real creation date to
a fictional row. Showing real dates requires the rows themselves to be real accounts — the whole
`getUsers()` call is what changes, not just a date field.

## Scope

- New same-origin Next.js Route Handler `GET /api/admin/accounts` (`src/app/api/admin/...`)
  that server-side calls `meros-app`'s `GET /admin/accounts` (base URL + admin key from server-
  only env vars, defaulting to the local dev values so this works out of the box against a
  locally running `meros-app`), maps each `AdminAccountRow` to this screen's existing
  `UserRecord` shape, and returns `{ items: UserRecord[] }`.
  - **Why a proxy, not a direct client fetch:** the backend's admin key is a secret and must
    never ship to the browser bundle; a same-origin route also sidesteps CORS entirely (my
    earlier local-only demo fetched directly from the browser with the key inline — that was
    fine for a throwaway visual check, never something to ship).
- `UsersPage` (`src/app/(admin)/users/page.tsx`) fetches from this route instead of importing
  `getUsers()`, with a loading state while the fetch is in flight.
- `UserRecord` gains an optional `createdAtDisplay?: string` field (the `D MMM YYYY` string).
  `getUserHistory` takes an optional second parameter, `createdAtDisplay?: string`, and returns
  `[{ title: 'Account created', time: createdAtDisplay }]` when it has no seeded mock history for
  that id — fully backward compatible with the existing mock ids and their tests (unaffected: no
  seeded id ever passes a `createdAtDisplay`, so behavior for `u1`–`u10` is unchanged).
- Field mapping for data MER-780 doesn't provide (`plan`, `followers`, `following`, `bio`,
  `location`): kept as placeholders (`'Freemium'`, `'0'`, `''`), same as the local demo. A real
  account's Subscriptions/Reports tabs will show their existing empty state, since that data
  isn't sourced from anywhere real yet — expected, not a bug.
- Row actions (reset password, deactivate, delete) stay exactly as they are today — toast-only,
  no real mutation (MER-805/806/807's job, not this ticket's).
- Existing `page.test.tsx` gets rewritten to mock the fetch instead of asserting on the old
  hardcoded mock names — the requirement changed (real data, async), so the test changing is the
  deliberate point of this work, not a weakening of it.

## Out of scope

- Server-side pagination/sorting/filtering wired to the real endpoint's query params — the table
  keeps doing local (client-side) filter/sort/the existing decorative pager over one fetched
  page (`limit=100`), unchanged from today's mock behavior. Wiring real pagination is a
  reasonable follow-up, not required to satisfy MER-772's AC.
- Any other tab's real data (Subscriptions, Reports) — separate, not-yet-existing backend
  capabilities.
- Any account-action mutation (MER-805/806/807).

## Env vars (new, server-only, never `NEXT_PUBLIC_*`)

- `MEROS_API_URL` — default `http://localhost:3005`.
- `MEROS_ADMIN_API_KEY` — default `dev-admin-key` (matches `meros-app`'s own dev default).
- `ADMIN_ACCOUNTS_PROXY_ENABLED` — added post-review, see below.

## Post-review updates

What actually shipped differs from this doc in a few places, after two rounds of review:

- The route returns `{ items: DomainAccountRow[], total: number }` (raw upstream-shaped rows
  plus the real server total), not pre-mapped `{ items: UserRecord[] }` — `toUserRecord` (in
  `src/lib/admin/accounts.ts`) does the `DomainAccountRow` → `UserRecord` mapping client-side,
  and the route reuses `domainAccountRowSchema`/`accountsResponseSchema` from that same file
  instead of re-declaring an equivalent schema, so the two trust boundaries can't drift apart.
- `UserRecord` gained `createdAtIso?: string` (the raw ISO timestamp), not `createdAtDisplay`.
  Formatting to the viewer's locale/timezone happens client-side in `UserDetailDrawer`, per the
  review's warning that server-side UTC formatting was wrong for non-UTC viewers.
- Plan/followers/following show `'—'` (a real "no data" placeholder), not the originally-planned
  fake `'Freemium'`/`'0'` values — those would have looked like real data for a real account.
- The Subscriptions and Reports tabs no longer just fall through to the mock "no subscription" /
  "no reports" empty state for real accounts (contrary to what this doc originally said was fine):
  that reads as a fact ("this user has no reports") when it's really "we don't have this data
  wired up yet." Real accounts (detected via `createdAtIso` being set) now get an honest
  "Not available yet" empty state instead.
- **Unauthenticated PII proxy stop-gap:** `(admin)` has no session/auth enforcement (a real
  session gate was built and then reverted as out of scope for this ticket — see the PR's review
  thread). Until that's tracked and resolved as its own piece of work, `/api/admin/accounts` is
  gated by `ADMIN_ACCOUNTS_PROXY_ENABLED`, a server-only flag defaulting to `true` in development
  and **`false` in production** (`src/lib/server/proxy-env.ts`) — the route 404s when it's off.
  This is explicitly a stop-gap, not a fix: real admin auth still needs to land before this ever
  serves real PII in production.
