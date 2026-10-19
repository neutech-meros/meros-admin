# All Categories Screen Implementation Plan

**Goal:** Build the `/catalog/categories` screen — a searchable, expandable
3-level category tree (parent → subcategory → child), with create/rename,
status toggle, and a deactivate-with-cascade-warning confirmation — faithfully
matching what actually renders in the reference artifact for the `Categories`
screen-label block.

**Architecture:** Mock tree data (`src/lib/mocks/admin/categories.ts`) feeds a
page-level state machine (`src/app/(admin)/catalog/categories/page.tsx`,
`useState<CategoryNode[]>(() => getCategoryTree())`), with pure
tree/row/validation logic factored into `src/lib/admin/categories-tree.ts`
(mirrors `src/lib/admin/users-table.ts`'s precedent of pulling business logic
out of the page). Presentational pieces: `CategoryTreeTable` (the table
itself), `CategoryFormDialog` (add/edit modal), `DeactivateCascadeDialog`
(the warning confirm). Both dialogs use the existing `@/components/ui/dialog`
Radix wrapper — no new installs.

**Tech Stack:** Next.js 15 (App Router) + TypeScript, Tailwind v4 (CSS-first,
`var(--token)` inline styles, no Tailwind color utilities for Meros tokens),
shadcn `Dialog` (already installed), `sonner` (toast, already installed),
`react-i18next`.

**Spec:** `docs/superpowers/specs/2026-09-29-mer-799-all-categories-screen-design.md`

## Global Constraints

- 100% fidelity to what renders in the `Categories` screen-label block only
  — not `showCatalog`/`catalogSpec()`, not `showCatRequests`. See spec's
  "Source extraction" section for line numbers.
- Tailwind v4, CSS-first — every Meros-specific color/spacing token already
  defined as a CSS var (`var(--bg-elevated)`, `var(--border-subtle)`,
  `var(--brand-500)`, `var(--success)`/`var(--success-bg)`,
  `var(--warning)`/`var(--warning-bg)`, `var(--text-primary)`/
  `var(--text-secondary)`/`var(--text-disabled)`, etc. — reuse existing
  tokens, confirm each exists in `globals.css` before introducing a new one).
- No new npm dependencies — `@radix-ui/react-dialog`, `sonner`, `clsx`,
  `tailwind-merge` are already installed and sufficient.
- `t()` (react-i18next) for every UI-chrome string (headings, buttons, column
  labels, toasts, modal copy, empty/count text). Category names/slugs/counts
  are mock-data values, rendered directly (not through `t()`) — same split
  every prior screen uses.
- Stage files explicitly on every commit (`git add <files>`, never `-A`/`.`)
  — the repo root's reference HTML must never be staged.
- Canonical `cn` helper: `@/lib/utils`. Don't touch `src/components/ui/*`
  unless truly necessary.
- No Fable/multi-agent orchestration for this ticket (that's meros-app's
  backend-specific workflow) — implement directly, same as Phase 1 and the
  Users & Creators screen were.

## Tasks

### 1. Icons

- [ ] Add 13 new icon exports to `src/components/admin/icons.tsx`, one per
      `CAT_ICON_PATHS` key (`food`, `food/restaurant`, `food/bars`,
      `food/cafes`, `stays`, `stays/hotels`, `stays/rentals`, `experiences`,
      `experiences/outdoor`, `experiences/culture`, `transport`,
      `transport/transfers`, `transport/rentals`), same `IconBase` pattern as
      every existing icon in that file. Naming: `IconCatFood`,
      `IconCatFoodRestaurant`, … (prefix `IconCat` to avoid clashing with any
      future unrelated `IconFood`).

### 2. Mock data layer

- [ ] `src/lib/mocks/admin/categories.ts`: `export interface CategoryNode {
      name: string; slug: string; items: number; status: 'Active' |
      'Deactivated'; children?: CategoryNode[] }`; private `SEED:
      CategoryNode[]` ported verbatim from `CATEGORY_TREE` (spec's data
      model section — all 4 parents, all subcategories/children, exact
      names/slugs/items/status incl. the pre-set `Deactivated` rows);
      `export function getCategoryTree(): CategoryNode[]` returns a fresh
      deep clone (e.g. `structuredClone(SEED)` or a manual recursive clone)
      so repeated calls (tests, re-mount) don't share mutable state.

### 3. Pure tree/row/validation logic

- [ ] `src/lib/admin/categories-tree.ts`:
  - `export interface CategoryRow` — flattened per-row view-model: `slug,
    name, depth, level ('Parent'|'Subcategory'|'Child'), items, itemsLabel,
    childCount, childCountLabel, status, hasChildren, isOpen, icon
    (ComponentType | null)`.
  - `export function buildCategoryRows(tree: CategoryNode[], open:
    Record<string, boolean>, query: string): CategoryRow[]` — depth-first
    walk; `matches(node)` recurses into children (name/slug substring,
    case-insensitive); when `query` is non-empty every matched node's row is
    forced open; default open set is `{ food: true, 'food/restaurant': true
    }` when `open` is empty/undefined (mirrors `defaultCatOpen()`).
  - `export function findCategoryNode(tree, slug): { node: CategoryNode;
    parent: CategoryNode | null; depth: number } | null` (mirrors `findCat`).
  - `export function slugify(name: string): string` (mirrors the source's
    normalize/strip-diacritics/kebab-case function, `'category'` fallback for
    an all-symbol input).
  - `export function activeDescendantNames(node: CategoryNode): string[]`
    (mirrors `activeDescendants`).
  - `export function expandAll(tree): Record<string, boolean>` /
    `collapseAll(): Record<string, boolean>` (the second is just `{}`).
  - `export function countLabel(tree): string` — `"{p} parents · {c}
    subcategories · {l} child categories"` (mirrors `catTreeCount`).
  - `export function iconForSlug(slug: string): ComponentType | null` —
    exact slug → first two segments → first segment → `null` fallback,
    reading from a local `Record<string, ComponentType>` built from the
    icons added in Task 1.
- [ ] `src/lib/admin/categories-tree.test.ts` — unit tests for every
      function above: search matching (direct + ancestor-of-match), depth
      labels, slugify edge cases (diacritics, symbols-only → `'category'`),
      activeDescendantNames (nested, mixed status), expandAll/collapseAll,
      countLabel arithmetic, iconForSlug fallback chain.

### 4. Presentational components

- [ ] `src/components/admin/categories/CategoryTreeTable.tsx` — props:
      `rows: CategoryRow[]`, `onToggle(slug)`, `onAddChild(slug, name)`,
      `onEdit(slug, name, status)`. Renders the bordered card + raw
      `<table>` per spec (indent via `padLeft = 16 + depth*28`px, chevron
      rotated 90deg when open, dot for leaf rows, icon hidden at depth 2,
      status badge, "Add child" hidden at depth 2, "Edit" always shown).
- [ ] `src/components/admin/categories/CategoryFormDialog.tsx` — props:
      `state: { mode: 'add'|'edit'; slug: string | null; parentName?:
      string; name: string; status: 'Active'|'Deactivated' } | null`,
      `onNameChange`, `onStatusChange`, `onCancel`, `onSave`. Follows
      `ResetPasswordDialog`'s controlled-by-nullable-state shape (`<Dialog
      open={false}><DialogContent /></Dialog>` when `state` is null). Enter
      key → save, Escape → cancel, autofocus the name input.
- [ ] `src/components/admin/categories/DeactivateCascadeDialog.tsx` —
      props: `state: { name: string; names: string[] } | null`, `onCancel`,
      `onConfirm`. Renders the warning icon, "Deactivate {name}?" title, the
      count-label body copy, the scrollable "Also deactivated" list, Cancel
      / "Deactivate all" buttons.

### 5. Page

- [ ] `src/app/(admin)/catalog/categories/page.tsx` — `'use client'`;
      `useState<CategoryNode[]>(() => getCategoryTree())` for the tree,
      `useState<Record<string,boolean>>` for `open` (default `{}`, resolved
      to `defaultCatOpen()`'s equivalent inside `buildCategoryRows` when
      empty — match spec exactly, don't duplicate the default), `useState`
      for `query`, `useState` for the form-dialog state, `useState` for the
      cascade-dialog state.
  - Header: title + subtitle (spec's exact copy) + "New parent category"
    button → opens form dialog in `add` mode, `slug: null`.
  - Toolbar: search input, "Expand all"/"Collapse all" buttons, count label.
  - `CategoryTreeTable` fed by `buildCategoryRows(tree, open, query)`.
  - `handleSave`: empty-name check → toast; slug/depth/duplicate checks per
    spec → toast + keep dialog open; on edit-with-active-descendants →
    open cascade dialog instead of saving; otherwise mutate `tree` in state
    (immutable update — build a new tree via a recursive map/clone, don't
    mutate in place) and toast success (rename vs update vs created vs
    parent-created copy, matching spec).
  - `handleCascadeConfirm`: apply status to the node + every descendant
    (new tree), toast success, close both dialogs.
  - All toast title/description strings via `t('admin.categories...')`.

### 6. i18n

- [ ] Add `admin.categories.*` to `src/locales/enUS.json`, `ptBR.json`,
      `esES.json`: `title`, `subtitle`, `newParentCategory`, `searchPlaceholder`,
      `expandAll`, `collapseAll`, `countLabel` (with `{{parents}}`/
      `{{subcategories}}`/`{{children}}` placeholders — build the string in
      code via `t(key, { parents, subcategories, children })`, not string
      concatenation, so translators control word order), `table.category`,
      `table.level`, `table.slug`, `table.children`, `table.places`,
      `table.status`, `table.addChild`, `table.edit`,
      `level.parent`/`level.subcategory`/`level.child`,
      `childCount.subcategories` (`{{count}}` interpolation, `—` for zero —
      decide: literal `—` isn't translated text, keep it a plain constant
      like other screens' `EMPTY` dash), `itemsLabel` (`{{count}} places`),
      `modal.newTitle`, `modal.editTitle`, `modal.subCreateUnderParent`
      (`{{parentName}}`), `modal.subEditSlugUnchanged`,
      `modal.subEditSlugUnchangedDeactivating`, `modal.nameLabel`,
      `modal.namePlaceholder`, `modal.statusLabel`, `modal.statusActive`,
      `modal.statusDeactivated`, `modal.hintActive`, `modal.hintDeactivated`,
      `modal.cancel`, `modal.createCta`, `modal.saveCta`, `cascade.title`
      (`{{name}}`), `cascade.body` (`{{countLabel}}`), `cascade.alsoDeactivated`,
      `cascade.cancel`, `cascade.confirm`,
      `toasts.nameRequiredTitle`/`toasts.nameRequiredDescription`,
      `toasts.alreadyExistsTitle`/`toasts.alreadyExistsDescription`,
      `toasts.maxDepthTitle`/`toasts.maxDepthDescription`,
      `toasts.renamedTitle`/`toasts.renamedDescription` (`{{oldName}}`,
      `{{newName}}`), `toasts.updatedTitle`/`toasts.updatedDescription`
      (`{{name}}`, `{{status}}`), `toasts.createdTitle`/`toasts.createdDescription`
      (`{{name}}`, `{{parentName}}`), `toasts.parentCreatedTitle`/
      `toasts.parentCreatedDescription` (`{{name}}`),
      `toasts.deactivatedTitle`/`toasts.deactivatedDescription` (`{{name}}`,
      `{{countLabel}}`).
  - Real translations in pt/es (no leftover English copy-paste), matching
    interpolation tokens across all three files.
  - No new `locales.test.ts` describe block (see spec's i18n section) —
    manually double-check key parity across the three files before
    committing.

### 7. Page tests

- [ ] `src/app/(admin)/catalog/categories/__tests__/page.test.tsx`:
  - Initial render shows the seeded tree with `food`/`food/restaurant`
    expanded by default and others collapsed.
  - Search filters to matching nodes + their ancestors, force-expanded.
  - Expand all / Collapse all.
  - "New parent category" → dialog opens in add mode → save creates a new
    top-level row, success toast.
  - Row "Add child" → dialog opens in add mode with parent context → save
    adds a child under the right parent.
  - Row "Edit" → rename → success toast, row reflects new name.
  - Duplicate-slug save → error toast, dialog stays open, tree unchanged.
  - Empty-name save → error toast, dialog stays open.
  - Deactivating a node with active descendants → cascade dialog appears
    with the correct name list; Cancel leaves everything unchanged; Confirm
    deactivates the node and every descendant, success toast.
  - Deactivating a node with **no** active descendants → saves immediately,
    no cascade dialog.
  - Depth guard: attempting to add a child under a depth-2 (child-level)
    node is not reachable via the UI (button hidden) — assert the button is
    absent on a child row rather than asserting a toast.

## Review Focus

- **Search-forces-expand vs. manual toggle interaction** — while a query is
  active every matched branch renders expanded regardless of `open` state,
  but clearing the query must restore whatever the `open` map already held
  (not reset it) — a reasonable person expects clearing search to go back to
  where they left the tree, not collapse everything.
- **Cascade dialog only fires when it should** — deactivating a node with
  zero currently-active descendants must save immediately with no dialog;
  the reverse (a node with active descendants) must never save without it.
  Off-by-one here (e.g. counting the node itself, or missing a
  grandchild two levels down) is the most likely place for a subtle bug,
  since `activeDescendantNames` must walk the full subtree, not just direct
  children.
- **Duplicate-slug check scope** — must search the **entire** tree, not just
  siblings under the same parent (a subcategory added under `Food` with the
  same slug as one already under `Stays` should still collide if their full
  slugs happen to match — in practice full slugs are parent-prefixed so this
  is unlikely to false-positive, but the check must walk everything, not
  short-circuit at the immediate parent's children).
- **Immutable tree updates** — every mutation (rename, status change,
  cascade, add) must produce a new tree object for React state (`setTree`),
  not mutate the existing `CategoryNode` objects in place — easy to get
  wrong by porting the source's direct-mutation style (`hit.node.name =
  name`) too literally, which would work visually in the class-based
  reference but silently break memoization/re-render assumptions in a React
  function-component port.
