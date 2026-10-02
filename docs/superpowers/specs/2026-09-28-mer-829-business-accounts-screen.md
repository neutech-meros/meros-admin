# MER-829 — UI: Business accounts screen

Parent story: MER-827 (Admin – Manage Business Accounts). Siblings: MER-828 (API, **not
started at all** — no branch, commit, or spec exists for it anywhere), MER-830 (QA, separate).

> MER-829 itself has no description in Jira. Scope derives from MER-827's AC:
> - Given business accounts exist, when the admin opens Business accounts, then a
>   filterable/searchable list is shown with status and key business info.
> - Given a business account, when the admin opens its detail, then moderation actions
>   (flag/suspend/restore) are available with confirmation.
> - All moderation actions are audit-logged with actor, reason and timestamp.

## Revision — explicit user override (2026-09-28, superseding the first pass below)

The first pass at this ticket (kept below under "Original finding" for the record) deliberately
did **not** use the mockup's `moderation-business` section as a reference, on the grounds that
it renders MER-300's business-account **application/approval** flow (Pending/More info/Approved/
Rejected requests, CNPJ, documents, Approve/Reject), not MER-827's flag/suspend/restore
moderation of accounts that already have business status. That reasoning was checked directly
with the user (screenshots of the running mock-first build vs. the mockup) and **overridden**:
the user explicitly confirmed, twice, that this ticket should build the mockup's screen as it
actually is — CNPJ, documents, the Pending/Approved/Rejected pipeline, Approve/Reject/Request
info — regardless of the MER-300 boundary MER-827's own description draws. Building to that
explicit instruction from here on. The rest of this document (from "Design" onward) describes
the rebuilt version; the units already built under the first pass (`BusinessAccountFilters.tsx`
and the flag/suspend/restore shape of `BusinessAccountDetailDrawer.tsx`/`businessAccounts.ts`/
`page.tsx`) are replaced, not extended.

Practical consequence: `MER-828`'s eventual real endpoint contract is now expected to match an
application-review API (closer to `BusinessAccount.status: BusinessAccountStatus` — the
`INELIGIBLE|ELIGIBLE|IN_REVIEW|SETUP_REQUIRED|REJECTED|ACTIVE` pipeline already in the schema —
plus `BusinessAccountStatusLog` for the audit trail), not the `entityStatus` suspend/restore
angle the first pass proposed. Flagging that mapping for whoever picks up MER-828, not solving
it here (this ticket stays 100% mock, same as every screen's first cut in this app).

## Design — faithful port of the mockup's `moderation-business` section

Read directly from `Meros Admin (standalone).html`'s embedded app source (the `data-screen-
label="Business accounts"` block, its `bizKpis`/`bt`/`bizRows`/`bizBadge`/`rj` computed
properties, and the `d.kind === 'biz'` drawer spec). Verbatim content below; this is a "match
what actually rendered" port, same discipline already applied to `nav-config.ts`.

### Header

```
Business accounts
Every business account request lands here for document review and approval.
```
No header-right action button rendered in the captured DOM (the mockup's `onBizExport` handler
exists in script but its button slot was empty in the actual markup) — omit it, don't invent one.

### KPI row (4 cards, `grid-template-columns: repeat(4,1fr)`)

Card: `padding:24px; border-radius:14px; border:1px solid var(--border-subtle); background:
var(--bg-elevated)`, label at `font-size:13px;color:var(--text-secondary)`, value at
`font-size:28px;font-weight:700;font-variant-numeric:tabular-nums`, value color per card:

| Label | Value | Color |
|---|---|---|
| Pending review | count of `status === 'Pending'` | `var(--warning)` |
| Waiting on documents | count of `status === 'More info'` | inherit (default text color) |
| Approved (30d) | count of `status === 'Approved'` | `var(--success)` |
| Rejected (30d) | count of `status === 'Rejected'` | `var(--danger)` |

(The "(30d)" suffix is literal display copy in the mockup, not an actual 30-day window
computation — there's no timestamp filtering behind it, just a plain count. Match that.)

### Tabs (underline style, matches Reported content's existing tab pattern)

Rendered tabs, in order, each with a live count and `Pending`/`Approved`/`Rejected` filtering
`BIZ` by `status`, `All requests` showing everything:

```
Pending (N)   Approved (N)   Rejected (N)   All requests
```

Active tab: `color: var(--brand-500); border-bottom: 2px solid var(--brand-500)`. Inactive:
`color: var(--text-secondary); border-bottom: 2px solid transparent`. `More info` status rows
are **not** their own tab (the mockup computes a `moreInfo` tab state but never renders a
button for it — same "computed but unreachable" pattern the sidebar fix already established
precedent for) — they only show up under "All requests", and are counted in the "Waiting on
documents" KPI.

### Table (rendered only for the active tab's rows)

Columns, in order: **Business** (name, city on a second line) · **Tax ID** (`cnpj`, tabular-
nums, `var(--text-secondary)`) · **Category** · **Requested by** (`requester`, `email` on a
second line) · **Documents** (`docs`, e.g. `"3 of 3"`; colored `var(--text-secondary)` when it's
exactly `"3 of 3"`, else `var(--warning)`) · **Status** (badge, colors below) · a trailing
unlabeled column with a **Review**/**View** button (`"Review"` for `Pending`/`More info`,
`"View"` otherwise) that opens the drawer. Row itself is also clickable (same interaction as
every other admin table in this app).

`bizBadge(status)` colors:

| Status | Color | Background |
|---|---|---|
| Pending | `var(--warning)` | `var(--warning-bg)` |
| Approved | `var(--success)` | `var(--success-bg)` |
| Rejected | `var(--danger)` | `var(--danger-bg)` |
| More info | `var(--brand-600)` | `var(--brand-100)` |

Empty state (per active tab, when it has zero rows): heading "No requests in this status",
body "Switch tabs to see requests in another review stage."

### Detail drawer (`Sheet`, plain JSX per section — no generic block-renderer, same
architectural call MER-796 already made for this exact kind of `drawerSpec()`-shaped mockup
source: "a reusable block-kind system would be speculative generality for a single consumer")

Header: title = business name, sub = city, badge = status (via `bizBadge`).

Info rows (label → value), in order:; `Tax ID` (mono/tabular) · `Category` · `Requested plan`
(`plan`) · `Requested by` (`requester`) · `Contact email` (`email`) · `Submitted on` (mono) ·
`Documents received` (`docs`) · `Review note` (`note`, free text) · `Checklist` — **this one is
static literal text in the mockup, identical for every row, not per-account data**:
`"Tax ID validated · Company name matches · Address proof · Bank account owner"`.

Actions:
- When `status` is `Pending` or `More info`: three buttons — **Request info** (outline),
  **Reject** (danger outline), **Approve** (solid brand).
- Otherwise (`Approved`/`Rejected`): one button — **Close**.

Action behavior:
- **Request info** — no dialog. Immediately toasts info `"Information requested"` /
  `"{requester} was notified about the missing documents."` and closes the drawer. (In the
  mockup this doesn't change `status`; matching that — "More info" isn't itself a request-info
  target transition, it's already a distinct status a row can start in.)
- **Approve** — no dialog. Immediately toasts success `"Business account approved"` /
  `"{name} now has a verified business profile."`, closes the drawer, **and** (a real behavior
  this mock adds beyond the static mockup, matching every other screen in this app where
  actions actually mutate state) transitions that row's `status` to `Approved`.
- **Reject** — opens a confirmation dialog (see below). On send: toasts error
  `"Request rejected"` / `"{name} was rejected — {reason, lowercased}. Email sent to {email}."`,
  closes both the dialog and the drawer, and transitions the row's `status` to `Rejected`
  (again, a real mutation the static mockup skips but this build performs, consistent with
  every other screen's actions actually working).
- **Close** — just closes the drawer, no side effects.

### Reject confirmation dialog (`Dialog`, matches this app's existing primitive)

Title: **"Reject business account"**. Description: `"{requester} receives an email explaining
the decision. {name} stays on a personal account."`

Fields:
- **Reason** — a required select, default `"Documents don't match the company"`, options
  (verbatim, in order): `"Documents don't match the company"`, `"Tax ID could not be
  validated"`, `"Business not eligible for the platform"`, `"Suspected fraudulent request"`,
  `"Other"`.
- **Additional details** (label suffixed "optional") — a textarea, placeholder `"Add anything
  that helps the requester fix and resubmit..."`, helper text below it: `"This text is included
  in the email, word for word."`

Info banner (small, `var(--bg-surface)` background, envelope icon): `"Sending to {email}"`.

Footer: **Cancel** (outline) / **"Reject and send email"** (danger solid, the confirm action).

Unlike the flag/suspend/restore drawer from the discarded first pass, the reason **is** required
here (it has a real default and is always one of 5 fixed values, matching the mockup's own
`<select>` — there is no "leave it blank" state) — the optional field is "Additional details"
only, matching the mockup's own "optional" label exactly.

## Mock data model

Rewrite `src/lib/mocks/admin/businessAccounts.ts` (replaces the discarded flag/suspend/restore
shape entirely):

```ts
export type BusinessAccountRequestStatus = 'Pending' | 'More info' | 'Approved' | 'Rejected';

export interface BusinessAccountRequest {
  id: string;
  name: string;
  city: string;
  cnpj: string;
  category: string;
  requester: string;
  email: string;
  docs: string; // e.g. "3 of 3"
  submitted: string; // display date, e.g. "24/08/2026" — matches the mockup's own format
  status: BusinessAccountRequestStatus;
  plan: string;
  note: string;
  initials: string;
  avatarColor: string;
}

export function getBusinessAccountRequests(): BusinessAccountRequest[];
```

Seed **verbatim** from the mockup's `BIZ` array (6 rows, exact strings — same "port real,
specific scenarios" precedent MER-796 used for its own seed data):

```ts
[
  { name: 'Pousada Vista Azul', city: 'Paraty, RJ', cnpj: '12.345.678/0001-90', category: 'Accommodation', requester: 'Marina Alves', email: 'marina@vistaazul.com.br', docs: '3 of 3', submitted: '24/08/2026', status: 'Pending', plan: 'Business Pro', note: 'Requested to sell hosted stays and list experiences.' },
  { name: 'Trilhas do Sul Turismo', city: 'Gramado, RS', cnpj: '98.765.432/0001-21', category: 'Tour operator', requester: 'Diego Ramos', email: 'diego@trilhasdosul.com', docs: '2 of 3', submitted: '23/08/2026', status: 'Pending', plan: 'Business', note: 'Missing operating licence (Cadastur).' },
  { name: 'Sabor da Ilha Restaurante', city: 'Florianópolis, SC', cnpj: '45.612.789/0001-33', category: 'Food & drink', requester: 'Carla Menezes', email: 'contato@sabordailha.com.br', docs: '3 of 3', submitted: '22/08/2026', status: 'Approved', plan: 'Business', note: 'Verified by the trust team.' },
  { name: 'Rota Norte Transfers', city: 'Natal, RN', cnpj: '33.221.554/0001-77', category: 'Transport', requester: 'Fábio Lima', email: 'fabio@rotanorte.com', docs: '1 of 3', submitted: '21/08/2026', status: 'More info', plan: 'Business', note: 'Tax ID does not match the submitted company name.' },
  { name: 'Casa Mar Aluguéis', city: 'Búzios, RJ', cnpj: '77.884.221/0001-05', category: 'Accommodation', requester: 'Renata Pires', email: 'renata@casamar.com.br', docs: '3 of 3', submitted: '19/08/2026', status: 'Rejected', plan: 'Business Pro', note: 'Duplicate of an existing business account.' },
  { name: 'Serra Bike Experience', city: 'Campos do Jordão, SP', cnpj: '10.559.334/0001-18', category: 'Experiences', requester: 'Thiago Costa', email: 'thiago@serrabike.com', docs: '3 of 3', submitted: '18/08/2026', status: 'Approved', plan: 'Business', note: 'Approved with commission tier 12%.' },
]
```
(`id`/`initials`/`avatarColor` are derived, not part of the literal seed above — same pattern
as every other mock module in this app: `id` a stable slug or index-based string, `initials`/
`avatarColor` via the same local helper `businessAccounts.ts` already had in the discarded
first pass, or copy `dashboard.ts`'s `AVATAR_COLORS`/`initialsOf`.)

## Scope

- `src/lib/mocks/admin/businessAccounts.ts` — full rewrite per "Mock data model" above.
- `src/app/(admin)/moderation/business/page.tsx` — full rewrite: header, KPI row, tabs, table,
  empty state, opens the drawer on row/button click. Delete the discarded
  `BusinessAccountFilters.tsx` component and its test — tabs replace filters entirely, built
  inline in the page like Reported content's own tab strip (plain buttons with conditional
  styling), not a separate exported component.
- `src/components/admin/moderation/BusinessAccountDetailDrawer.tsx` — full rewrite: info rows +
  static checklist text + the 3-or-1 action buttons + the Reject confirmation dialog.
- `src/locales/{enUS,ptBR,esES}.json` — replace the discarded `admin.businessAccounts.filters.*`
  /`admin.businessAccounts.drawer.*` (flag/suspend/restore wording) with new keys matching this
  design (KPI labels, tab labels, column headers, drawer info labels + the static checklist
  string, the 3 action labels + their toast copy, the Reject dialog's title/description/reason
  options/placeholders/buttons), all genuinely translated in all 3 locales.
- Tests: mock-data shape test, page test (KPI counts, tab switching + counts, table columns,
  Review/View label per status, empty-state per tab, row/button opens drawer), drawer test
  (renders every info row + the static checklist, correct action set per status, Request info
  and Approve fire immediately with a toast and no dialog, Reject opens the dialog with the
  right default reason and email, confirming rejects+transitions+toasts+closes, cancelling
  does nothing).

## Out of scope

- Wiring to a real backend — MER-828 hasn't started; 100% mock.
- `Profile`/`Users & Creators` cross-linking from a business account's `requester` — that
  screen isn't on this branch (same reasoning the discarded first pass already gave).
- Anything about the flag/suspend/restore/already-active-account angle from MER-827's literal
  AC wording — superseded by the "Revision" section above; if that angle is still wanted
  separately, it needs its own ticket/spec, not folded into this rebuild.
- Any change to `nav-config.ts` — `moderation-business` already exists there.

## Plan

1. **Mock data** (`lib/mocks/admin/businessAccounts.ts` + test): rewrite types, verbatim 6-row
   seed, `getBusinessAccountRequests()`. TDD: data-shape test first.
2. **Drawer + Reject dialog** (`BusinessAccountDetailDrawer.tsx` + test): rewrite per the
   "Detail drawer"/"Reject confirmation dialog" sections above.
3. **Page** (`page.tsx` + test): rewrite per "Header"/"KPI row"/"Tabs"/"Table" above, wired to
   the drawer; delete `BusinessAccountFilters.tsx` + its test.
4. **i18n**: new keys across all 3 locales, replacing the discarded ones.
5. Full validation: `npx tsc --noEmit`, `npm run lint`, `npx jest`, `npm run build`.

## Fable unit breakdown

1. Mock data (independent, first).
2. Drawer + Reject dialog (depends on mock data's types).
3. Page (depends on 1 and 2; also deletes the old filters component/test).

---

## Original finding (superseded — kept for the record, see "Revision" above)

`Meros Admin (standalone).html` has a `moderation-business` section already, reachable from
the same "Moderation & Trust" nav group this ticket targets. It is **not** what MER-829
needs: it renders a business-account **application/approval queue** — Pending / More info /
Approved / Rejected requests, each with a CNPJ, uploaded documents, a requester, and a
Reject/Approve flow with a rejection-reason dialog. MER-827's own description explicitly
calls this out: *"Distinct from MER-300 (business-account application review, apps/web):
this story is the moderation list/detail screen inside the unified admin dashboard for
accounts that **already have** business status."* The mockup section is MER-300's screen,
not this one — porting it here would build the wrong feature entirely.

Checked `apps/api/prisma/schema.prisma` in `meros-app`: `BusinessAccount` (keyed off `User`,
1:1) has `status: BusinessAccountStatus` (`INELIGIBLE|ELIGIBLE|IN_REVIEW|SETUP_REQUIRED|
REJECTED|ACTIVE` — the application pipeline), `entityStatus: EntityStatus` (`ACTIVE|INACTIVE|
SUSPENDED|DELETED` — the moderation-status enum used elsewhere for suspend/restore),
`businessType: String?` (free text, no CNPJ/category/documents fields at all),
`verifiedBusiness: Boolean`, `activatedAt`/`createdAt`. `BusinessAccountStatusLog` already
audits the application pipeline's transitions (`actorId`/`actorType`/`reason`/`createdAt`) but
is typed to `BusinessAccountStatus`, not `EntityStatus` — it can't record a suspend/restore/flag
action as-is. No "flag" concept exists anywhere in the schema.

This led to a first build (mock data, filters, drawer, page) implementing flag/suspend/restore
against accounts with `status: 'ACTIVE'`. That build is discarded per the "Revision" above.
