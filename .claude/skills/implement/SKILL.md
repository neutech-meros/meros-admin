---
name: implement
description: Pick up a Jira subtask and implement it in the meros-admin dashboard following its conventions — TDD, same-origin proxy routes behind flags, zod at every boundary, i18n in three locales. Use when the user says "implement <TICKET-ID>" or "implementa <TICKET-ID>".
---

# implement — Jira subtask implementer (meros-admin)

Given a Jira subtask key (e.g. `MER-101`):

This repo is `meros-admin`, the Next.js admin dashboard. It talks to the admin API of the
sibling backend repo `meros-app` (`../meros-app`, integration branch `origin/dev`) only
through same-origin proxy routes. Backend work (`API:` subtasks) is implemented in
`meros-app` with that repo's own `/implement` — never from here.

## Steps

### 1. Resolve Atlassian context

Call `mcp__claude_ai_Atlassian__getAccessibleAtlassianResources` to get the correct
`cloudId`. Store it for all subsequent Atlassian calls.

### 2. Fetch the ticket

Call `mcp__claude_ai_Atlassian__getJiraIssue` with the provided key.

**Parent ticket guard:** if the issue has subtasks of its own, it is a parent ticket —
not a subtask. Stop and tell the user:
```
MER-XX appears to be a parent ticket with N subtask(s).
Run /breakdown MER-XX to plan the work, then /implement on a specific subtask.
```

**Repo guard:** if the subtask belongs to the backend — its summary starts with `API:` or
its "Files involved" point to `meros-app` / `apps/api` / `packages/shared` — stop and
tell the user:
```
MER-XX is backend work (meros-app).
Implement it from the meros-app repo with its /implement, then come back for the
admin subtasks that depend on it.
```

Extract from the subtask:
- Summary, description (parse ADF sections: "What to do", "Files involved",
  "Acceptance criteria")
- Parent ticket key — fetch the parent too for broader context
- Priority, labels, sprint

If the subtask has no description or acceptance criteria, **stop and ask the user**
to clarify before proceeding.

### 3. Check blockers

If the subtask description or parent lists other subtasks as dependencies, fetch each
one via `mcp__claude_ai_Atlassian__getJiraIssue` and check their status.

If any dependency is not "Done" or "Closed":
```
MER-101 depends on:
- MER-100 (<summary>) — status: In Progress

Proceed anyway? (yes / no)
```
Wait for user confirmation before continuing.

For a dependency that is an `API:` subtask, also check that the endpoint it promised
exists on the backend integration branch (read-only, never check out):
```bash
git -C ../meros-app fetch origin --quiet
git -C ../meros-app grep -n "'/admin/<path>" origin/dev -- apps/api/src/modules
```
If it is missing, tell the user the proxy cannot be built against a real contract yet.

### 4. Load project docs context

Grep this repo's docs for the subtask key, the parent key and the screen name:
- `docs/plano-execucao-cards-mer-admin.md` — execution plan per card (gaps, PO
  decisions, expected subtasks)
- `docs/superpowers/specs/` — design specs per screen (scope, out of scope)
- `docs/superpowers/plans/` — implementation plans already written

If a pending PO decision affects this subtask, raise it in the plan (step 6).

### 5. Read the relevant codebase

Read only what's needed for this subtask. Use the "Files involved" from the description
as the starting point, then expand as needed:

- Screen: `src/app/(admin)/<area>/page.tsx` and its `__tests__/`
- Proxy routes: `src/app/api/admin/**/route.ts` and their tests — copy the closest
  existing one (GET: `moderation/reports/route.ts`; POST with JSON body and actor:
  `business-accounts/[id]/reject/route.ts`; per-user GET: `users/[id]/*` via
  `src/lib/server/admin-user-proxy.ts`)
- Proxy flags and env: `src/lib/server/proxy-env.ts` and both of its tests
  (`src/lib/server/proxy-env.test.ts`, `src/lib/server/__tests__/proxy-env.test.ts`),
  `.env.example` — only if a new flag or env var is needed
- Client libs, zod schemas, adapters: `src/lib/admin/*.ts` and `src/lib/admin/__tests__/`
- Components: `src/components/admin/**`, shared `src/components/admin/drawer/DrawerBlocks.tsx`,
  UI primitives in `src/components/ui/`
- Mock data being replaced: `src/lib/mocks/admin/*.ts`, `src/store/atoms/*.ts`
- Navigation: `src/components/admin/nav-config.ts` — only if a screen is being enabled
- i18n: `src/locales/ptBR.json`, `enUS.json`, `esES.json`, `src/locales/__tests__/locales.test.ts`
- **Backend contract** for every endpoint the subtask consumes, read on `origin/dev`:
  ```bash
  git -C ../meros-app show origin/dev:apps/api/src/modules/<module>/routes.ts
  git -C ../meros-app show origin/dev:apps/api/src/modules/<module>/schemas.ts
  ```
  plus `service.ts` and `packages/shared/src/schemas/*.ts` as needed. Note the exact
  request/response shape, status codes, limits (e.g. `limit ≤ 100`) and whether it
  requires `X-Admin-Actor`.

Do not read files outside the scope of this subtask.

### 6. Plan the implementation

Before writing any code, produce a concise plan:

```
## Implementation plan for MER-101 — <summary>

Approach:
- <1–3 sentences describing the strategy>

Backend contract consumed (meros-app origin/dev):
- GET /admin/<path> → { ... }   (apps/api/src/modules/<module>/routes.ts:NN)

Files to create/modify:
- src/app/api/admin/<path>/route.ts     — proxy, flag <FLAG>
- src/lib/admin/<feature>-api.ts        — zod schema + adapter
- src/app/(admin)/<area>/page.tsx       — replace mock with fetch
- src/locales/{ptBR,enUS,esES}.json     — keys under admin.<area>.*

Test plan (TDD):
- <describe what tests will be written first>

New proxy flag: yes (<FLAG>) / no
Involves UI: yes/no
Involves i18n: yes/no

Out of scope:
- <anything explicitly NOT being done here>
```

Present this plan and ask: "Proceed with implementation? (yes / adjust)"
Wait for confirmation.

### 7. Validate git state and branch

Derive the branch type from the subtask context:
- New feature or capability → `feat/`
- Bug fix → `fix/`
- Refactor without behavior change → `refactor/`
- Tests only → `test/`
- Config, tooling, docs → `chore/`

**Run first** (sequential — updates remote refs):
```bash
git fetch origin --quiet
```

**Then in parallel** to inspect the actual git state:
```bash
git branch --show-current
git status --short
git log origin/main..HEAD --oneline
git log --oneline -1 origin/main
```

Evaluate the results:

1. **If current branch already matches the expected pattern** (e.g. `feat/mer-101-...`)
   AND was branched from `main` (i.e. `git log origin/main..HEAD` shows only commits for
   this subtask): proceed without interruption.

2. **If on `main`** with no uncommitted changes: output the commands to cut the branch
   and wait for user confirmation:
   ```
   You are on main. Cut the implementation branch:

     git checkout -b <type>/mer-101-<short-slug>

   Confirm when ready.
   ```

3. **If on a different branch** unrelated to this subtask, or if there are uncommitted
   changes: stop and warn:
   ```
   Warning: unexpected git state.
   Current branch : <branch>
   Uncommitted    : <yes/no>
   Ahead of main  : <N commits>

   Expected: a clean branch cut from main.
   Recommended:
     git stash          # if you have work to save
     git checkout main && git pull
     git checkout -b <type>/mer-101-<short-slug>

   Proceed anyway? (yes / no)
   ```
   Wait for user confirmation before continuing.

Untracked files that are not part of this subtask (e.g. local notes in `docs/`) do not
block the branch, but must never be staged (step 11).

**Never write any code before the git state is confirmed.**

### 8. Transition to "In Progress"

Call `mcp__claude_ai_Atlassian__getTransitionsForJiraIssue` to list available transitions.
Find the transition that moves the issue to "In Progress" (or equivalent — e.g.
"In Development", "Started").
Call `mcp__claude_ai_Atlassian__transitionJiraIssue` to apply it immediately, before
writing any code.

### 9. Implement — TDD first

Follow the project's TDD mandate: **write the test first, then the implementation**.
Tests run with Jest (`npm test`); component and page tests use React Testing Library in
jsdom (i18n loads in pt by default, `TZ` is pinned to `America/Sao_Paulo`); route tests
start with the `@jest-environment node` docblock and mock `global.fetch`.

#### Order of operations

1. **Proxy flag** (if the plan says "New proxy flag: yes"):
   - Add it to `ProxyFlag` in `src/lib/server/proxy-env.ts` — defaults on in
     development/test, **off in production**, only the literal `true` enables it.
   - Extend both proxy-env test files first, then the code.
   - Add a commented-out entry to `.env.example` explaining what it guards and that it
     waits for the admin-auth work (MER-690 / MER-717).

2. **Proxy route** (`src/app/api/admin/**/route.ts`):
   - Write the route test first: flag off → 404; upstream URL, bearer key and
     `cache: 'no-store'`; ids encoded as a single path segment; upstream body validated
     (malformed → generic 502, no secrets in logs); undeclared upstream fields stripped;
     status codes the screen relies on (404/409/400) passed through; for writes, request
     body validated and `X-Admin-Actor` set from `MEROS_ADMIN_ACTOR`.
   - Implement following the existing pattern: `isProxyEnabled(flag)` → `getProxyEnv()`
     → fetch upstream → zod `safeParse` → `NextResponse.json`.
   - The admin API key and actor stay server-side; never accept the actor from the
     client body.

3. **Client lib** (`src/lib/admin/<feature>-api.ts`):
   - Write tests first for the zod schema and the adapter (backend shape → view model).
   - Implement `fetch` of the same-origin route with `safeParse`, returning a typed
     result the screen can branch on (ok / error / not-found as needed).

4. **Screen / component** (if `Involves UI: yes` in plan):
   - Design reference (the mockup, a pasted image, or an explicit spec) is required
     before writing UI. If the `impeccable` skill is available in this repo, run
     `/impeccable` first to shape and audit the design against that reference.
   - Write page/component tests first: loading, error with retry, empty, and the
     happy path; every action's success and failure toasts; re-fetch after mutations.
   - Replace the mock/atom seed with the client lib. Keep mocks only as test fixtures.
   - Reuse `src/components/ui/` (shadcn/Radix) and `src/components/admin/` building
     blocks (e.g. `DrawerBlocks`) before adding new ones. Styles via Tailwind classes and
     the CSS variable tokens in `globals.css` (see `DESIGN_TOKENS.md`) — no inline hex.
   - If the screen becomes reachable, add its key to `ENABLED_NAV_KEYS` and its test.

5. **i18n keys** (if `Involves i18n: yes` in plan):
   - Add every key to `ptBR.json`, `enUS.json` and `esES.json`, same placeholders in
     each. Full sentences per case — never interpolate a raw enum or a sentence
     fragment into a translated string.
   - `locales.test.ts` currently checks parity only for `admin.users`; if the subtask
     adds a new `admin.*` section, extend the test to cover it.

#### Code rules (enforced)

- `strict: true` — no `any`, use `unknown` + narrowing
- zod at every boundary: upstream responses in proxies, request bodies in POST/PATCH
  proxies, and responses again in client libs
- Parse external enums against the known set (`z.enum([...]).catch(...)`) before using
  them as lookup keys
- `process.env` is read only in `src/lib/server/proxy-env.ts`
- No backend URLs, admin keys or fabricated numbers in client code; a field the API does
  not provide is shown as unavailable (`—`), never invented
- No code comments unless genuinely non-obvious
- No overengineering — YAGNI, rule of three; follow the existing file layout
- Errors: generic messages to the client, details only in server logs, never secrets

### 10. Run final checks

```bash
npm test               # all Jest suites must pass
npx tsc --noEmit       # TypeScript must compile clean
npm run lint           # ESLint clean
npx prettier --check <changed files>
npm run build          # Next.js build must succeed
```

If tests fail, fix before proceeding. Do not skip or comment out failing tests.

**Manual check — when the subtask touches a screen:** with the backend running
(`curl -s -o /dev/null -w '%{http_code}' http://localhost:3005/health` returns 200) and
`npm run dev`, open the screen and exercise the acceptance criteria against real data.
If the backend is not running, say so in the report — do not claim a manual check that
did not happen.

**Sync check — run after all tests pass:**
```bash
git fetch origin --quiet
git log HEAD..origin/main --oneline
```
If `origin/main` has commits that are NOT in the current branch (output is not empty):
```
Warning: main has moved ahead while you were working.
New commits in main not in your branch:
  <list of commits>

Merge main into your branch before opening the PR to avoid conflicts:
  git merge origin/main

Proceed without merging? (yes / no)
```
Wait for confirmation. If no, stop here until the user merges and re-runs the final checks.

### 11. Report and suggest next step

```
## Done — MER-101 implemented

Files changed:
- src/app/api/admin/<path>/route.ts
- src/app/api/admin/<path>/route.test.ts
- src/lib/admin/<feature>-api.ts

Tests: N passed
Manual check: done against meros-app dev / not done (<reason>)

Next steps:
1. Commit: <type>(<area>): <summary> (MER-101)
2. Push branch and open PR targeting main
3. Reply "PR open" to transition MER-101 → In Review in Jira
4. /pr-review <PR_NUMBER>  (run automated review on the opened PR)
5. /implement MER-102      (next subtask)
```

After outputting this report, ask:
```
Want me to commit, push, and open the PR now? (yes / no)
```

**If yes — automated flow:**

1. Stage **only the files listed in the "Files changed" section above** — never use
   `git add -A` (risks staging `.env`, local notes or unrelated changes).
   Run for each file:
   ```bash
   git add <file>
   ```
   Then verify nothing unexpected was staged:
   ```bash
   git diff --cached --name-only
   ```
   If unexpected files appear, unstage them with `git restore --staged <file>` and warn
   the user before proceeding.

2. Commit:
   ```bash
   git commit -m "<type>(<area>): <summary> (MER-101)"
   ```

3. Push:
   ```bash
   git push -u origin <branch>
   ```

4. Search for a PR template: `.github/pull_request_template.md` (and
   `.github/PULL_REQUEST_TEMPLATE/` if not found). Use it to structure the description;
   if no template exists, use the summary + acceptance criteria from the subtask, and
   always include: the backend endpoints consumed, any new proxy flag, and the backend
   PRs that must be deployed first.

5. Create PR with the GitHub CLI:
   ```bash
   gh pr create --repo neutech-meros/meros-admin --base main --head <branch> \
     --title "<type>(<area>): <summary> (MER-101)" --body-file <body file>
   ```

6. Output the PR URL, proceed to step 12 automatically, then suggest:
   `/pr-review <PR_NUMBER>` — run the automated review on the PR just opened.

**If no:** keep the conversation open and wait for the user to reply "PR open" before
proceeding to step 12.

### 12. Transition to "In Review" (triggered by user after PR is open)

Triggered when the user confirms the PR has been opened.

Call `mcp__claude_ai_Atlassian__getTransitionsForJiraIssue` to list available transitions.
Find a transition whose name contains "Review" or "Code Review" (case-insensitive).

If found: call `mcp__claude_ai_Atlassian__transitionJiraIssue` and confirm:
`MER-101 → In Review ✓`

If not found: list the available transitions and tell the user:
```
No "In Review" transition found for MER-101.
Available transitions: <list>
Please transition it manually in Jira, or reply with the transition name to apply.
```

## Constraints

- **TDD is mandatory** — test file written before implementation.
- **No `any`** — use `unknown` + narrowing everywhere.
- **No hardcoded user-facing strings** — all through react-i18next, in pt, en and es.
- **Never call the real backend in tests** — mock `fetch`.
- **Never read `process.env` outside `src/lib/server/proxy-env.ts`**.
- **Never expose the admin API key or the actor to the browser** — both are injected
  server-side in proxy routes.
- **New proxy flags default off in production.**
- **Never modify `../meros-app`** from this skill — backend subtasks are implemented in
  that repo.
- **Transition order:** "In Progress" before writing code (step 8), "In Review" only after PR is open (step 12) — never before.
- **Never implement a parent ticket** — guard in step 2 must redirect to `/breakdown` first.
- **Always verify git state** (step 7) before writing any code — branch must be cut from `main`.
- Commit format: `<type>(<area>): <summary> (MER-101)` — conventional commit; type matches the branch type derived in step 7; `<area>` is the admin area (e.g. `users`, `categories`, `moderation`, `nav`).
- All identifiers, comments, commit messages in **English**.
- Do not implement anything outside the subtask's stated scope.
- Do not modify files outside the affected screen/area unless strictly required.
