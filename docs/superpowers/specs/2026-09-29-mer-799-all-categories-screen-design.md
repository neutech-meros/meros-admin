# MER-799 — All Categories Screen

Date: 2026-09-29

## Context

Subtask of MER-778 ("Admin – Manage All Categories"). Sibling subtask MER-798
("API: CRUD endpoints for categories") is still in the backlog (not started),
and MER-800 ("QA: validation & test coverage") is already done against
whatever ships here. This mirrors MER-829/828's shape exactly: the UI screen
is built first against mock data, the real API follows as its own later
ticket, wired in afterward the same way MER-829 → MER-828 were.

Nav entry already exists and is unrouted: `nav-config.ts`'s `catalog` group,
leaf `catalog-categories` → label "All categories" → `navHref()` resolves to
`/catalog/categories` automatically (no nav-config change needed).

## Parent story acceptance criteria (MER-778)

- Given the Categories screen, when the admin opens it, then all existing
  categories are listed with name, status and usage count.
- Given valid data, when the admin creates or edits a category, then the
  change is saved and reflected across the platform.
- Given a duplicate category name, when the admin attempts to save it, then
  the system blocks the action with a clear error.
- Given a category in use, when the admin attempts to delete/deactivate it,
  then the system warns about the impact before confirming.
- All category changes are audit-logged with the acting admin and timestamp.

The last item (audit log) needs a real backend actor identity and persistence
— out of scope for this UI-only ticket, same reasoning MER-829 used for real
persistence before MER-828 existed. "Saved and reflected across the
platform" is satisfied at the mock-data layer (local React state mutation,
persists for the session) until MER-798 wires a real API.

## Source extraction

`Meros Admin (standalone).html` embeds the reference build as one long
JSON-escaped string (`\n`, `\"`, `/`). Line numbers below are against
that string unescaped verbatim (`\n`→newline, `/`→`/`, `\"`→`"`) and
saved to a scratch file — same de-escaping, different line numbers than
Phase 1/Users' spec citations (their extraction ran against a different
snapshot state of this same file; re-run the de-escape to reproduce these
line numbers exactly).

- Categories screen markup (`data-screen-label="Categories"`): lines
  2354–2422
- Deactivate-cascade confirm dialog markup: lines 2229–2258
- Add/edit category modal markup: lines 2259–2277
- `CATEGORY_TREE` seed data: lines 4802–4851
- `CAT_ICON_PATHS` (per-category SVG path sets): lines 4859–4870
- `defaultCatOpen`/`openAncestors`/`findCat`/`slugify`/`activeDescendants`/
  `applyCatCascade`/`saveCatModal`/`catIcon`: lines 4871–4997
- `categoryRows()` (row view-model builder): lines 4998–5045
- View-model bindings (`catTreeQuery`, `onNewParentCategory`,
  `catModalStatuses`, `cc` (cascade-confirm vm), `catModalDisplay`,
  `onCatModalSave`, `onExpandAll`/`onCollapseAll`, `catTreeCount`): lines
  5995–6050

Explicitly **not** in scope: the `showCatalog`/`catalogSpec()` generic entity
table (lines 4423+ region, a different nav leaf entirely — e.g. venues/tags,
unrelated to this ticket) and the `showCatRequests`/"Category requests"
screen (`catalog-requests` nav leaf, its own future subtask, not MER-799).

## Fidelity requirement

100% fidelity to what actually renders for the `Categories` screen-label
block, same rule Phase 1/Users used. Confirmed in scope, all real
(mutating) behavior, not stubbed toasts:

- **Tree table**: columns Category (name, indent by depth, chevron toggle,
  leading dot for leaves, per-category icon, hidden for depth-2/child rows),
  Level (`Parent`/`Subcategory`/`Child`), Slug, Children (`N subcategories`
  or `—` for leaves), Places (`{items} places`), Status badge
  (Active/Deactivated), row actions (`Add child` — hidden at depth 2 — and
  `Edit`).
- **Search** (`catTreeQuery`): case-insensitive substring match against name
  or slug; a node matches if it matches directly OR any descendant matches
  (so ancestors of a matching child stay visible); while a query is active,
  every visible node renders expanded regardless of its own open/closed
  state.
- **Expand/collapse**: per-row chevron toggle (no-op toast "Leaf category —
  no subcategories." on a childless row's toggle attempt is NOT reachable
  from the UI since the chevron is hidden for childless rows via `dot`
  instead — port the row-click guard anyway for parity with the source's
  `onToggle`), "Expand all" (opens every parent/subcategory), "Collapse all"
  (closes everything), default-open state `{ food: true, 'food/restaurant':
  true }` matching the source's `defaultCatOpen()`.
- **Count line** (`catTreeCount`): `"{parents} parents · {subcategories}
  subcategories · {children} child categories"`.
- **New parent category** (top-level button): opens the add/edit modal in
  `mode: 'add'`, no parent slug, default status `Deactivated`.
- **Add child** (row action, depth 0 or 1 only): opens the same modal in
  `mode: 'add'` with the row's slug as parent.
- **Edit** (row action, any depth): opens the modal in `mode: 'edit'`,
  pre-filled with the node's current name/status.
- **Modal**: single "Category name" text input (autofocus, Enter submits,
  Escape cancels), a two-button Active/Deactivated status toggle (a plain
  toggle button pair, not a dropdown — matches the source exactly), a status
  hint line ("Visible to users as soon as it is saved." /
  "Hidden from the app until you switch it to Active."), title
  ("New category" / "Rename category"), subtitle ("It will be created under
  {parentName}." / slug-stays-unchanged copy, with an extra deactivation
  warning appended when editing status away from Active), CTA label
  ("Create category" / "Save changes").
- **Validation on save**:
  - Empty/whitespace-only name → error toast "Name required" / "Type a
    category name before saving.", modal stays open.
  - Create: slug is `slugify(name)` (add-child: `parentSlug + '/' +
    slugify(name)`); if a node with that slug already exists anywhere in the
    tree → error toast "Already exists" / "A category with this slug
    already exists." This is the mockup's actual implementation of the
    parent story's "duplicate category name" AC — it dedupes by the derived
    slug, not a separate literal-name comparison; port that as-is rather
    than inventing stricter dedup the reference doesn't have.
  - Create via Add child beyond depth 2 → error toast "Maximum depth" / "The
    tree supports three levels only." (only reachable in principle if a
    depth-2 row's "Add child" button were visible, but the mockup already
    hides that button for depth 2 rows — the depth check is still ported for
    defense-in-depth so `saveCatModal` can never silently create a depth-3
    node.)
- **Deactivate-with-cascade**: editing an `Active` node's status to
  `Deactivated` computes every currently-`Active` descendant name; if that
  list is non-empty, show the cascade-confirm dialog first (name, "N child
  category/categories will be hidden", the list of affected names) instead
  of saving immediately. Confirming applies the new status to the node AND
  every descendant (recursively, regardless of each descendant's current
  state) and shows a success toast. Cancel returns to the edit modal
  untouched. If there are no active descendants, saving an edit applies
  immediately with no cascade dialog — matches "warn about impact before
  confirming" without warning when there's nothing to warn about.
- **Rename vs status-only toasts**: editing a node distinguishes "Category
  renamed" (name changed) from "Category updated" (status-only change, no
  cascade) with different description copy — port both.
- **No empty-state markup** exists for the Categories screen specifically
  (unlike the generic `showCatalog` table, which has one) — a search with
  zero matches renders a table with zero rows and no message. Confirmed
  dead/nonexistent, not something to add.
- **No pagination** on this screen (it's a full in-memory tree, not a
  server list) — nothing to port.

## Data model (mock layer)

`CategoryNode`: `{ name: string; slug: string; items: number; status:
'Active' | 'Deactivated'; children?: CategoryNode[] }`. Seeded 1:1 from
`CATEGORY_TREE` (4 parents: Food, Stays, Experiences, Transport; each with
2–3 subcategories; each subcategory with 2–4 child categories — full data
ported verbatim, including the pre-set `Deactivated` rows, e.g. `Steakhouse`,
`Cabins`, `Private driver`, and the `Transport/Rentals` subcategory itself).

Per the established `src/lib/mocks/admin/*` convention: a private module
constant holds the literal seed, an exported `getCategoryTree(): CategoryNode[]`
factory returns a **fresh deep clone** on every call (this screen's edits
mutate the returned tree in local component state — unlike Users'
deactivate/delete, which only toast, this screen's source actually mutates
`this.CATEGORY_TREE`, so persisting the edit in React state for the session
is the correct fidelity port, not a toast-only stub).

## Reusable pieces (from the 2026-09-29 conventions research)

- `Dialog`/`DialogContent`/`DialogTitle`/`DialogDescription`/`DialogFooter`
  from `@/components/ui/dialog` (Radix-backed, already installed) for both
  the add/edit modal and the cascade-confirm dialog. Follow
  `ResetPasswordDialog`'s controlled-by-nullable-target shape (`target: T |
  null`, render `<Dialog open={false}><DialogContent /></Dialog>` when null
  rather than `null`).
- No generic drawer/table shell fits this screen (it's a single bordered
  card with one raw table, not a KV/table/timeline drawer) — build the tree
  table directly, following the Business Accounts / Catalog table's raw
  `<table>` + inline `var(--token)` styling convention (Tailwind v4,
  CSS-first, no `tailwind.config.ts`, every Meros-specific color is
  `var(--token)` in an inline `style`, never a Tailwind color utility).
- Icons: `src/components/admin/icons.tsx` has no per-category icon registry
  yet — add 13 new `IconXxx` exports there (flat, same `IconBase` pattern as
  every existing icon: `IconFood`, `IconFoodRestaurant`, `IconFoodBars`,
  `IconFoodCafes`, `IconStays`, `IconStaysHotels`, `IconStaysRentals`,
  `IconExperiences`, `IconExperiencesOutdoor`, `IconExperiencesCulture`,
  `IconTransport`, `IconTransportTransfers`, `IconTransportRentals`), ported
  verbatim from `CAT_ICON_PATHS`. A small local lookup (in the new
  `categories-tree.ts` helper, not a generic registry — none exists yet)
  resolves a slug to its icon component with the same fallback order as
  `catIcon()`: exact slug → first two segments → first segment → none.

## i18n

New top-level `admin.categories` key (screen-flat, matching
`admin.businessAccounts`/`admin.users` — not nested under `admin.catalog`,
per the established convention: screens are flat regardless of which nav
group they sit under). Real translations in en/pt/es, no leftover English in
pt/es. Following the Business Accounts precedent, **no new
`locales.test.ts` parity block** is added for this namespace (that test file
currently only enforces `admin.users` parity; Business Accounts didn't add
its own block either, so this stays consistent rather than introducing a
one-off pattern) — care is taken manually instead when writing the three
locale files.

## Out of scope

- Real backend / persistence beyond the browser session (MER-798).
- Real audit log (acting admin + timestamp) — needs MER-798's real actor
  identity infrastructure.
- The `catalog-requests` ("Category requests") nav leaf — separate future
  subtask.
- The generic `showCatalog`/`catalogSpec()` entity-table nav leaves under
  `catalog` (none of them map to `catalog-categories`).
- A `locales.test.ts` parity block for `admin.categories` (see i18n section).
- Drag-to-reorder (the generic `showCatalog` table has a drag handle column;
  the Categories tree table does not — confirmed by the markup, no drag
  affordance in the tree's row cells).
