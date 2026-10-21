---
name: breakdown
description: Analyze a Jira task, plan the work, and create subtasks (≤4h each) inside it — without touching code. Use when the user says "breakdown <TICKET-ID>" or "plan task <TICKET-ID>" or "criar subtasks".
---

# breakdown — Jira task planner (meros-admin)

Given a Jira ticket ID (e.g. `MER-42`):

This repo is `meros-admin`, the Next.js admin dashboard. Most work here depends on the
admin API in the sibling backend repo `meros-app` (`../meros-app`, integration branch
`origin/dev`), which this skill reads but never modifies.

## Steps

### 1. Resolve Atlassian context

Call `mcp__claude_ai_Atlassian__getAccessibleAtlassianResources` to get the correct
`cloudId`. Store it — required for all subsequent Atlassian calls.

### 2. Validate git state

Run the following Bash commands (fetch first, then check in parallel) to verify the
codebase reflects the current `main` state before reading anything:

```bash
git fetch origin --quiet
```

Then in parallel:

```bash
git branch --show-current
git status --short
git log origin/main..HEAD --oneline
```

If the current branch is NOT `main`, or if there are uncommitted changes, or if the branch
is ahead of `origin/main`, warn the user:

```
Warning: your working directory is not clean / not on main.
The breakdown reads the codebase to plan work. For an accurate plan, the codebase
should reflect the latest main state.

Current branch: <branch>
Uncommitted changes: <yes/no>

Recommended:
  git checkout main && git pull

Proceed with breakdown anyway? (yes / no)
```

Wait for user confirmation before continuing.

Also refresh the backend refs, without touching its working tree:

```bash
git -C ../meros-app fetch origin --quiet
```

If `../meros-app` does not exist, warn the user that backend endpoints cannot be
verified and ask whether to proceed.

### 3. Fetch the ticket

Call `mcp__claude_ai_Atlassian__getJiraIssue` with the provided issue key.

Extract and note:

- Summary, description, acceptance criteria
- Story points / original estimate
- Priority, labels, components
- **Current sprint** — store the full sprint object (id, name) for inheritance
- Linked issues and existing subtasks
- Parent epic (e.g. `MER-260 — Admin Dashboard`)

If the description is blank or fewer than 20 words, **stop and ask the user for more
context** before proceeding.

### 4. Re-run guard

If the ticket already has subtasks:

1. List them in a table (key, summary, status).
2. Ask the user:

   ```
   MER-XX already has N subtask(s):
   | Key     | Summary          | Status      |
   |---------|-----------------|-------------|
   | MER-101 | ...             | To Do       |

   How do you want to proceed?
   (a) Add new subtasks alongside the existing ones
   (b) Ignore existing — plan only work not yet covered by them
   (c) Cancel
   ```

3. Wait for the user's choice before continuing.
4. If (b): treat all existing subtasks as out-of-scope regardless of their status —
   do not recreate or duplicate them.
5. If (c): stop entirely.

A subtask marked Done is not proof the work exists — step 6 checks the code.

### 5. Load project docs context

Grep this repo's docs for the ticket key and for the screen or feature name:

- `docs/plano-execucao-cards-mer-admin.md` — execution plan per card (gaps, decisions,
  suggested subtasks)
- `docs/superpowers/specs/` — design specs per screen (scope, out-of-scope, decisions)
- `docs/superpowers/plans/` — implementation plans already written

This surfaces acceptance criteria, pending PO decisions and scope limits that may not be
in Jira. If a pending decision blocks the plan, list it under "Risks / blockers" in step 9.

### 6. Understand the codebase (read-only)

Do NOT modify any file in either repo. Only read to gain context.

**Admin (`meros-admin`, this repo):**

- Screens: `src/app/(admin)/<area>/page.tsx` and their `__tests__/`.
- Proxies to the backend: `src/app/api/admin/**/route.ts`. They follow one pattern:
  `isProxyEnabled(<flag>)` first (404 when off) → `getProxyEnv()` →
  `Authorization: Bearer MEROS_ADMIN_API_KEY`, `cache: 'no-store'` → zod-validate the
  upstream body → generic 502 on failure. Write actions send `X-Admin-Actor` from
  `MEROS_ADMIN_ACTOR`, injected server-side, never from the browser.
- Proxy flags and env: `src/lib/server/proxy-env.ts` (`ProxyFlag`) and `.env.example`.
- Client API libs, zod schemas and adapters: `src/lib/admin/*.ts`.
- Components: `src/components/admin/**`; shared drawer blocks in
  `src/components/admin/drawer/DrawerBlocks.tsx`; UI primitives in `src/components/ui/`.
- Mock data still in use: `src/lib/mocks/admin/*.ts` and `src/store/atoms/*.ts` —
  replacing these with real data is usually the point of the ticket.
- Navigation: `src/components/admin/nav-config.ts` (`ENABLED_NAV_KEYS`).
- i18n: `src/locales/ptBR.json`, `enUS.json`, `esES.json`;
  `src/locales/__tests__/locales.test.ts`.

**Backend (`meros-app`, read via git on `origin/dev`, never check out):**

```bash
git -C ../meros-app grep -n "'/admin/" origin/dev -- apps/api/src/modules
git -C ../meros-app show origin/dev:apps/api/src/modules/<module>/routes.ts
```

- For each endpoint the ticket needs, read `routes.ts`, `service.ts`, `repository.ts`,
  `schemas.ts` in `apps/api/src/modules/<module>/`, and `packages/shared` for shared
  zod schemas. Note the exact request and response shape, status codes and whether it
  requires `requireAdminActor`.
- Read `apps/api/prisma/schema.prisma` if DB changes are likely.
- If an endpoint or field the ticket needs does not exist on `origin/dev`, plan it as an
  `API:` subtask (step 8) — do not assume it will appear.

Scan existing tests in both repos to understand what's already covered — do not create
subtasks for work that already exists.

### 7. Discover issue type and sprint field

These two calls are **sequential** — the second requires the issue type ID from the first.

**Step 7a — Issue type:**
Call `mcp__claude_ai_Atlassian__getJiraProjectIssueTypesMetadata` for the project.
Find the exact issue type name and id for subtasks (may be "Subtask", "Sub-task", or
custom). Store both — use them verbatim when creating issues.

**Step 7b — Sprint field ID:**
Call `mcp__claude_ai_Atlassian__getJiraIssueTypeMetaWithFields` for the project using
the subtask issue type id from step 7a. Inspect the returned fields for one whose name
contains "Sprint" (case-insensitive). Store its `key` (do not assume `customfield_10020`
— use whatever the project returns). If no sprint field exists on subtasks, note that
sprint will auto-inherit from parent and skip setting it.

### 8. Plan subtasks

Break the work into subtasks following these rules:

- **Each subtask ≤ 4h** of combined human + AI agent work.
  - AI-assisted tasks (writing code, tests, migrations) count as ~1/3 of manual time.
  - Split ruthlessly if a unit exceeds 4h.
- **Every subtask must have:**
  - A concise summary (≤70 chars), prefixed by layer like the existing MER subtasks:
    `API:` (backend, `meros-app`), `UI:` (admin screen or component), `QA:` (test
    coverage and manual checks)
  - A description (what to do, files/modules involved, acceptance criteria)
  - An hour estimate (0.5h increments, max 4h)
  - `dependsOn`: list of subtask numbers that must be done first (empty if none)
  - The repo it lands in (`meros-app` or `meros-admin`)
- Order by dependency: backend (migration → shared schema → repository → service+tests →
  route+integration test) → admin proxy route + flag → admin lib (zod schema, adapter) →
  screen/component → i18n → QA.
- Common categories (use only what applies):
  - `meros-app`: DB migration / schema change; shared zod schema (`packages/shared`);
    repository; service + unit tests; route handler + integration test; BullMQ job /
    worker
  - `meros-admin`: proxy route (`src/app/api/admin/**`) + `ProxyFlag` + `.env.example`;
    client lib with zod schema and adapter (`src/lib/admin/*`); replacing a mock or atom
    seed with real data; screen / component; i18n string keys (pt, en, es); tests
  - Docs / spec update (`docs/`)
- For **admin screen / component** subtasks, always add to the acceptance criteria:
  "Design reference (the mockup, a pasted image, or an explicit spec) required before
  implementation. Reuse the primitives in `src/components/ui/` (shadcn/Radix) and the
  admin building blocks in `src/components/admin/` (e.g. `DrawerBlocks`) before adding
  new ones. Styles via Tailwind classes and the CSS variable tokens in `globals.css`
  (see `DESIGN_TOKENS.md`) — no inline hex. Every user-visible string goes through
  react-i18next with keys in all three locale files. Loading, error (with retry) and
  empty states are covered."
- For **proxy route** subtasks, always add to the acceptance criteria:
  "Follows the existing proxy pattern (flag → env → bearer key → zod-validated upstream
  → generic 502). New flag defaults off in production. The admin API key and actor never
  reach the browser."
- A subtask that depends on an `API:` subtask cannot be merged before the backend PR is
  merged into `meros-app` `dev` — state that in its `dependsOn`.

### 9. Confirmation gate — WAIT for user approval

**Do NOT create anything in Jira yet.** Present the full plan:

```
## Breakdown plan for MER-XX — <ticket summary>

Total estimated work: Xh across N subtasks

| # | Summary                   | Repo        | Est. | Depends on | Files / modules                      | Acceptance criteria |
|---|--------------------------|-------------|------|------------|--------------------------------------|---------------------|
| 1 | API: <summary>           | meros-app   | 2h   | —          | apps/api/src/modules/lists/routes.ts | ...                 |
| 2 | UI: <summary>            | meros-admin | 1h   | #1         | src/app/api/admin/categories/route.ts| ...                 |
| 3 | QA: <summary>            | meros-admin | 1h   | #2         | src/app/(admin)/catalog/...          | ...                 |

Assumptions:
- <assumption made during codebase review>

Risks / blockers:
- <anything that could block this work, including pending PO decisions>

Proceed with creating these subtasks in Jira? (yes / adjust + feedback)
```

Wait for explicit user confirmation. If adjustments are requested, revise and show the
updated table again before asking for confirmation once more.

### 10. Create subtasks in Jira

Iterate over each approved subtask. For each one:

1. Build the description in **Atlassian Document Format (ADF)**. Use `bulletList` nodes
   for files and acceptance criteria — never dump multiple items into a single paragraph.
   Repeat one `listItem` object per file and per criterion — do not compress multiple
   items into one string. Name the repo in the "Files involved" items (e.g.
   `meros-admin: src/app/api/admin/categories/route.ts`):

   ```json
   {
     "type": "doc",
     "version": 1,
     "content": [
       {
         "type": "heading",
         "attrs": { "level": 3 },
         "content": [{ "type": "text", "text": "What to do" }]
       },
       {
         "type": "paragraph",
         "content": [
           { "type": "text", "text": "<one sentence describing the task>" }
         ]
       },
       {
         "type": "heading",
         "attrs": { "level": 3 },
         "content": [{ "type": "text", "text": "Files involved" }]
       },
       {
         "type": "bulletList",
         "content": [
           {
             "type": "listItem",
             "content": [
               {
                 "type": "paragraph",
                 "content": [{ "type": "text", "text": "<file 1>" }]
               }
             ]
           },
           {
             "type": "listItem",
             "content": [
               {
                 "type": "paragraph",
                 "content": [{ "type": "text", "text": "<file 2>" }]
               }
             ]
           }
         ]
       },
       {
         "type": "heading",
         "attrs": { "level": 3 },
         "content": [{ "type": "text", "text": "Acceptance criteria" }]
       },
       {
         "type": "bulletList",
         "content": [
           {
             "type": "listItem",
             "content": [
               {
                 "type": "paragraph",
                 "content": [{ "type": "text", "text": "<criterion 1>" }]
               }
             ]
           },
           {
             "type": "listItem",
             "content": [
               {
                 "type": "paragraph",
                 "content": [{ "type": "text", "text": "<criterion 2>" }]
               }
             ]
           }
         ]
       }
     ]
   }
   ```

2. Call `mcp__claude_ai_Atlassian__createJiraIssue` with:
   - `issuetype`: exact type id/name from step 7
   - `parent`: original ticket key
   - `summary`: approved summary
   - `description`: ADF object above
   - `priority`: inherited from parent
   - `labels`: inherited from parent
   - `components`: inherited from parent
   - `timetracking`: `{ "originalEstimate": "<Xh>" }` — use the subtask's hour
     estimate from step 8 (e.g. `"2h"`, `"1.5h"`). If the field is read-only or
     not present on subtasks, skip silently and continue; never abort.
   - sprint field key (discovered in step 7): parent's sprint id — if field is
     read-only or missing on subtasks, skip silently and continue; never abort

3. **Track result per subtask:**
   - Success → store the new key (e.g. `MER-101`)
   - Failure → store the error message and continue to the next subtask

### 11. Report

After all creation attempts, output a final summary regardless of partial failures:

```
## Result for MER-XX

| # | Key      | Summary                   | Repo        | Est. | Status              |
|---|---------|--------------------------|-------------|------|---------------------|
| 1 | MER-101 | ...                      | meros-app   | 2h   | ✓ created           |
| 2 | MER-102 | ...                      | meros-admin | 1h   | ✓ created           |
| 3 | —       | ...                      | meros-admin | 3h   | ✗ failed: <reason>  |

Sprint: <sprint name>  |  Parent: MER-XX

Suggested branch names (type refined at implement time):
- MER-101 (meros-app): <feat|fix|chore>/mer-101-<short-slug>
- MER-102 (meros-admin): <feat|fix|chore>/mer-102-<short-slug>

To implement a subtask: /implement MER-101
```

If any subtask failed, list the exact error and suggest retrying with `/breakdown MER-XX`.

## Constraints

- **Never modify code** — read-only codebase access throughout, in both repos.
- **Never check out branches in `../meros-app`** — read it via `git show` / `git grep`
  on `origin/dev`.
- **Never exceed 4h per subtask** — split ruthlessly.
- **Always wait for user confirmation** (step 9) before touching Jira.
- **Always check for existing subtasks** (step 4) before planning.
- Sprint field key must be **discovered dynamically** — never assume `customfield_10020`.
- ADF descriptions must use `bulletList` for multi-item fields — never a single paragraph.
- Dependency direction is `dependsOn` (what this subtask needs first) — never "blocks".
- All text (summaries, descriptions, branch names) in **English**.
- Subtasks always inherit parent's sprint, priority, labels, and components.
- Sprint field failure on subtask creation is non-fatal — continue silently.
- A partial creation is always reported in full — never silently skip failures.
- Do not create subtasks for work already present in the codebase or as existing subtasks.
