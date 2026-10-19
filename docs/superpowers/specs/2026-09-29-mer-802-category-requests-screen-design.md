# MER-802 — Category Requests Screen

Date: 2026-09-29

## Context

Subtask of MER-779 ("Admin – Handle Category Requests"). Sibling MER-801
("API: endpoints to list category requests and approve/reject them") is
still in the backlog; MER-803 is QA. Same shape as MER-778/798/799/800: the
UI ships first against mock data, the real API follows as its own later
ticket.

Nav entry already exists and is unrouted: `nav-config.ts`'s `catalog` group,
leaf `catalog-requests` → label "Category requests" → `navHref()` resolves
to `/catalog/requests` automatically (no nav-config change needed). This is
the screen MER-799's spec explicitly excluded from its own scope.

## Parent story acceptance criteria (MER-779)

- Given submitted category requests, when the admin opens the queue, then
  pending requests are listed with requester, proposed name/description and
  date.
- Given a pending request, when the admin approves it, then a new category
  is created (or linked to an existing one) and the requester is notified.
- Given a pending request, when the admin rejects it with an optional
  reason, then the request is closed and the requester is notified.
- All request decisions are audit-logged with the acting admin and
  timestamp.

Real creation/linking, notification, and audit logging all need MER-801's
backend — out of scope here, same reasoning as MER-799's audit-log
deferral. What this ticket actually satisfies: the list view (requester,
proposed name, date — the first AC), and a faithful port of the reference's
own approve/reject interaction, which is fire-and-forget (see below) rather
than a real mutation, matching what the reference itself does.

## Source extraction

Same de-escaping method as MER-799's spec (`\n`→newline, `/`→`/`,
`\"`→`"` against the embedded JSON-escaped string).

- Category requests screen markup (`data-screen-label="Category requests"`):
  lines 2279–2352
- `CAT_REQUESTS` seed data: lines 4852–4864
- `reqBadge()` (status → tone map): lines ~4866–4874 (see MER-799's spec for
  the sibling `CAT_ICON_PATHS` region this sits just before)
- `catreq` drawer spec (`drawerSpec()`'s `d.kind === 'catreq'` branch):
  lines 4159–4185
- View-model bindings (`catReqKpis`, `catReqTabs`, `catReqRows`,
  `catReqEmptyDisplay`): lines 5955–5994

## Fidelity requirement

100% fidelity to what renders for the `Category requests` screen-label
block. Confirmed in scope:

- **KPI row** (4 cards): Pending review, Waiting on requester, Approved,
  Rejected — plain counts over `CAT_REQUESTS`. The reference labels the
  last two "Approved (30d)"/"Rejected (30d)" but computes them as
  all-time counts with no date filter, the exact same "(30d)" mislabeling
  MER-829's Business Accounts screen shipped with and had to fix after
  review. Fixing it proactively here: labels read "Approved"/"Rejected"
  (no "(30d)"), matching what the numbers actually are.
- **Tabs**: Pending / Waiting on requester (`More info`) / Approved /
  Rejected / All requests, each with a live count in parens (`all` has
  none). Default tab: Pending.
- **Table columns**: Proposed category (name + level, stacked), Parent
  path, Requested by (avatar + name + handle, stacked), Votes, Requested
  (date), Status (badge), row actions.
- **Row actions are status-gated, and differ from the drawer's gating**:
  a row shows "Create"/"Reject" buttons only when `status === 'Pending'`
  (not `More info` — that only gets "View"). The drawer's own action set
  is gated more broadly (`Pending` OR `More info` get the 3 action
  buttons; `Approved`/`Rejected` get only "Close"). Port both gates
  exactly as different — this is not a bug to "fix" for consistency, the
  reference genuinely treats list-row actions and drawer actions with
  different open-conditions.
- **Row click / "View" opens a detail drawer** (no tabs inside it, unlike
  the Users drawer): avatar + proposed name + status badge, subtitle
  "Proposed under {parent}", then KV rows (Proposed name, Parent path,
  Level, Requested by, Account, Requested on, Community votes) followed by
  two free-text blocks ("Why they need it", "Overlap check").
- **Actions are toast-only, not a real mutation** — confirmed by reading
  the reference's own handlers: `onApprove`/`onReject` (row-level) and
  the drawer's "Ask for details"/"Reject"/"Create category" buttons all
  call `this.toast(...)` and (for the drawer) `this.setState({drawer:
  null})` — none of them ever touch `CAT_REQUESTS[i].status`. This is a
  deliberate, verified difference from MER-799's Categories screen, whose
  own `saveCatModal`/`applyCatCascade` methods **do** mutate
  `this.CATEGORY_TREE` directly. Port each screen's actual behavior, not
  an assumed-consistent one: this screen's approve/reject/ask-for-details
  toast and close, and do not move the row to a different tab or change
  its status. (MER-801's real API is exactly what would make this real.)
- **Empty state**: "No requests in this status" / "Switch tabs to see
  requests in another review stage." when the active tab has zero rows.
- **No search box** on this screen (confirmed absent from the markup,
  unlike Users and Categories) — nothing to port.

## Data model (mock layer)

`CategoryRequest`: `{ id: string; name: string; parent: string; level:
string; requester: string; handle: string; role: string; date: string;
votes: number; status: 'Pending' | 'More info' | 'Approved' | 'Rejected';
why: string; similar: string }`. Seeded 1:1 from `CAT_REQUESTS` (6 rows:
Vegan food, Glamping, Wellness — Pending; Pet friendly — More info; Street
food — Approved; Instagrammable spots — Rejected). `id` is a slug of `name`
(no id in the source — it's addressed by array index there — added here for
stable React keys and because a real id is what MER-801 would actually key
on). `initials`/`avatarColor` computed via the existing
`initialsOf`/`avatarColorForIndex` helpers (`src/lib/mocks/admin/avatar.ts`),
same as `users.ts`.

## Status tone

`reqBadge()`'s map (`Pending` → warning, `Approved` → success, `Rejected` →
danger, `More info` → `var(--brand-600)`/`var(--brand-100)`) is its own
small module, not a reuse of `src/lib/admin/badge-tone.ts` — that shared
map has no `Rejected`/`More info` entries and adding screen-specific
semantics to a shared map risks bleeding into other screens that use the
same status words differently. Same "port this screen's map as its own
module" precedent as Phase 1's Users screen badge tones.

## Reusable pieces

- `Sheet`/`SheetContent`/`SheetTitle`/`SheetDescription` from
  `@/components/ui/sheet` for the drawer shell (`UserDetailDrawer`'s header
  pattern: avatar circle + title + badge + subtitle, no tabs needed here).
- `DrawerBlocks` (`@/components/admin/drawer/DrawerBlocks`) for the body —
  needs one new block kind, `{ kind: 'text'; label: string; value: string
  }`, for the "Why they need it"/"Overlap check" free-text sections (KV
  rows are right-aligned single-line values; these are left-aligned
  paragraphs). This is a genuine small extension to a shared component,
  not a screen-specific one-off.
- No `Dialog` needed — this screen has no modal (no create/edit form).

## i18n

New top-level `admin.categoryRequests` key (screen-flat, matching
`admin.categories`/`admin.users`). Real translations in en/pt/es. No new
`locales.test.ts` parity block, same reasoning as MER-799 (that test only
covers `admin.users`; neither Business Accounts nor Categories added their
own block, staying consistent rather than introducing a one-off pattern).

## Out of scope

- Real category creation/linking on approve, real notification, real
  audit log — all need MER-801.
- Making the row/drawer actions mutate local state — the reference itself
  doesn't, so this UI-only port doesn't either (see "Actions are
  toast-only" above).
- Search — not present in the reference for this screen.
- The `catalog-categories` ("All categories") screen — already shipped in
  MER-799 (PR #8).
