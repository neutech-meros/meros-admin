---
name: pr-review
description: Review a meros-admin pull request — fetch PR details from GitHub, run tests, type check, lint and build locally, validate code against the admin's conventions and architecture rules and against the real meros-app API contract, then report findings and optionally post a review. Use when the user says "review PR <number>", "revisar PR <number>", or "pr-review <number>".
---

# pr-review — Pull Request reviewer (meros-admin)

Given a PR number (e.g. `42`) or a branch name.

Repo: `neutech-meros/meros-admin` (Next.js admin dashboard, integration branch `main`).
Backend contract: sibling repo `../meros-app`, read on `origin/dev` via git, never checked
out. GitHub access is through the `gh` CLI.

## Steps

### 1. Fetch PR metadata

```bash
gh auth status
```

**Input resolution:** the user may provide a PR number (e.g. `42`) or a branch name
(e.g. `feat/mer-1153-wire-category-requests-list`).

- If it is a number → use it directly.
- If it looks like a branch name → resolve it:
  ```bash
  gh pr list --repo neutech-meros/meros-admin --state open --head <branch> --json number
  ```
  If no open PR is found for that branch, report and stop.

```bash
gh pr view <number> --repo neutech-meros/meros-admin \
  --json number,title,body,author,headRefName,baseRefName,state,isDraft,files,commits,reviewDecision
```

Extract and store:
- PR title, description, author
- Source branch (`headRefName`) and target branch (`baseRefName`)
- State (open / closed / merged)
- List of changed files (paths only — full diff fetched next)
- Linked Jira ticket keys (look in title, description and commit subjects for `MER-\d+`)
- Draft status
- Whether the authenticated `gh` user is the PR author (GitHub rejects `APPROVE` /
  `REQUEST_CHANGES` on your own PR — see step 7)

If the PR is not found, stop and report.

If it is a draft, warn at the top of the final report:
```
Note: this PR is still a draft. Review is informational — do not request changes on GitHub until it's marked ready.
```
Still proceed with the full review.

Also read the open review threads so the review does not repeat or contradict them:
```bash
gh api graphql -f query='query{repository(owner:"neutech-meros",name:"meros-admin"){pullRequest(number:<number>){reviewThreads(first:100){nodes{isResolved isOutdated path line comments(first:20){nodes{author{login} body}}}}}}}'
```

### 2. Validate PR target branch (git-flow check)

**The target branch (`baseRefName`) MUST be `main`.** A PR targeting any other branch
(e.g. another feature branch it was stacked on) must be flagged immediately:

```
BLOCKER — git-flow violation:
This PR targets '<base>' instead of 'main'.
Per .claude/rules/git-flow.md all work merges into main.

The PR must be retargeted to main before it can be reviewed.
```

If the violation exists, report it and stop — do not proceed with the rest of the review.

### 2b. Validate branch freshness vs `main` (merge-safety check)

The review diff below uses **three-dot** `origin/main...origin/<head-branch>`, which shows
only the branch's own changes since the merge-base — it **hides** the fact that a branch is
behind `main`. Catch it explicitly:

```bash
git fetch origin
git merge-base --is-ancestor origin/main origin/<head-branch> && echo "UP TO DATE" || echo "BEHIND MAIN"
git diff origin/main..origin/<head-branch> --diff-filter=D --name-only
git merge-tree --write-tree --name-only origin/main origin/<head-branch> 2>&1 | tail -40
```

Interpret and report:
- **`BEHIND MAIN`** → **WARNING**: "Branch is behind `main`. Merge latest `origin/main` and
  resolve conflicts before merge." Escalate to **BLOCKER** if `merge-tree` reports a
  conflict, or if the two-dot `--diff-filter=D` list contains files the branch
  **actually deletes**.
- **Distinguish the two cases:** files listed only because `main` added them after the
  merge-base are **not** deleted by the merge. Confirm with
  `git cat-file -e <merge-base>:<path>`: if the path did not exist at the merge-base, the
  merge keeps it. Only a path that existed at the merge-base and is gone at the branch tip
  is a real deletion.
- **Stacked branches:** if the branch contains commits of another open PR (e.g. it was cut
  from a feature branch), list them and say which PR must merge first and how
  (merge commit vs squash). A squash-merge of the base PR will make this one conflict.
- **`UP TO DATE`** with no conflict → note "branch current with `main`" and proceed.

### 3. Fetch the diff and read changed files

```bash
git fetch origin
git diff origin/main...origin/<head-branch> --name-only
git diff origin/main...origin/<head-branch>
```

Then read each changed file at the PR head:
- Files ≤ 300 lines: read the full file (`git show origin/<head-branch>:<path>`).
- Files > 300 lines: use the hunk headers to read only the changed ranges plus the
  surrounding function/component.

Also read:
- Existing tests for the affected area.
- `src/lib/server/proxy-env.ts` if a flag or env var is touched.
- **The backend contract** for every endpoint a changed proxy or client lib consumes
  (step 5k).

### 4. Check out the branch and run checks

```bash
git status --short          # note untracked/uncommitted local files; never stash or delete them
git fetch origin
git checkout origin/<head-branch> --detach
```

Install dependencies only if a lockfile is in the diff:
```bash
git diff origin/main...origin/<head-branch> --name-only | grep -E 'package-lock.json|pnpm-lock.yaml'
npm ci            # only when the line above matched
```

Run all checks in sequence (do not stop on failure — run all and report each):

```bash
npm test 2>&1                 # Jest — record "Test Suites:" and "Tests:" lines and every FAIL path
npx tsc --noEmit 2>&1         # must exit 0
npm run lint 2>&1             # ESLint
npx prettier --check $(git diff origin/main...HEAD --name-only --diff-filter=AM | grep -E '\.(ts|tsx|json|md|css)$') 2>&1
npm run build 2>&1            # Next.js build
```

Capture exit codes, pass/fail counts, failing test names, and compiler/lint errors with
file:line.

**Hard rule — failing tests are unacceptable and blocking (never negotiable):**
- ANY failing test, TS error, lint error or failing build is an automatic **BLOCKER** and
  the verdict MUST be `CHANGES REQUIRED`, no matter how unrelated the failure looks.
- This applies even when the failure appears **pre-existing** — a red suite still blocks
  the merge. Identify the root cause and require it fixed (here or in a prerequisite fix).
- "Flaky" is not an excuse: re-run the test in isolation to confirm, then still block
  until it is green.
- Prettier differences are a **WARNING** unless the repo's lint step fails on them.

**Optional live check** (when the diff touches a screen or proxy and the backend is up):
```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3005/health
```
If it returns 200, run `npm run dev -- --port <free port>` and hit the changed proxy
routes with `curl`. Report what was verified; if the backend is down, say "live check not
run" — never claim it.

After all checks complete, restore the original branch:
```bash
git checkout -
```

### 5. Code review — conventions and architecture

Read `.claude/rules/architecture.md`, `.claude/rules/conventions.md` and
`.claude/rules/git-flow.md` to anchor the review criteria. Then evaluate each changed file
against the rules below.

**Hard rules are never downgradable.** Any violation of a rule marked "hard rule" in
`.claude/rules/*.md` is a **BLOCKER**. "The spec documents it", "it's only the admin",
"the author did it deliberately" or "it's behind a flag" are context for the comment —
never grounds to downgrade to WARNING/SUGGESTION.

**Before reading the code, write a domain checklist.** From the PR title/description, list
the 4–6 failure modes that matter for THIS feature and check each one explicitly. Examples
for admin screens: secrets never reach the browser, actor sent on every write, flag off in
production, every backend status code the screen relies on handled (404/409/400), double
submit and concurrent admin actions, stale list after a mutation, partial failure of one
of several sources, pagination beyond the first page, data shown that the API does not
provide. Report the checklist and its outcomes as their own section.

#### 5a. Layout and request path
- Screens call only same-origin `/api/admin/**` routes — any `MEROS_API_URL`, backend host
  or admin key in client code is a **BLOCKER**.
- Proxy routes follow the pattern in architecture.md (flag → env → bearer key →
  `cache: 'no-store'` → zod-validated upstream → generic 502). Missing flag check, missing
  zod validation of the upstream body, or an upstream error body forwarded to the client
  is a **BLOCKER**.
- Write proxies set the actor from `MEROS_ADMIN_ACTOR` server-side. Accepting an actor
  (`actorLabel`, `reviewedBy`, `X-Admin-Actor`) from the request body is a **BLOCKER**.
- Path ids are encoded with `encodeURIComponent`; request bodies and query strings are
  validated before calling upstream (invalid input → 400 without an upstream call).
- New code reading `src/lib/mocks/admin/*` or atom seeds at runtime is a **WARNING**
  (BLOCKER if it makes a mutation look successful when nothing was saved).

#### 5b. TypeScript quality
- No `any` — use `unknown` + narrowing. `strict` not weakened. No `@ts-ignore`.
- `process.env` read only in `src/lib/server/proxy-env.ts` — anywhere else is a **BLOCKER**.
- zod at every boundary; types via `z.infer`, no hand-written duplicates of schemas.
- External enums parsed against the known set before being used as lookup keys.

#### 5c. Proxy flags and env
- A new flag is added to `ProxyFlag`, defaults **off in production**, is covered in both
  proxy-env test files and documented (commented out) in `.env.example`. A flag that can
  be on in production by default is a **BLOCKER**.

#### 5d. i18n
- Every user-facing string goes through `t()`; inline strings in JSX, toasts, aria labels
  or dialog copy are a **BLOCKER**.
- Every new key exists in `ptBR.json`, `enUS.json` and `esES.json` with the same
  placeholders. A missing locale is a **BLOCKER**.
- Interpolating a raw enum or a sentence fragment into a translated sentence is a
  **BLOCKER** (conventions.md).

#### 5e. UI and design
- No inline hex/rgb literals — tokens via Tailwind or `var(--…)` only (**BLOCKER**).
- Loading, error and empty states exist for every data-backed view; a "Retry" that can
  never succeed (e.g. on a 404 from a disabled flag) is a **WARNING**.
- Destructive or irreversible actions have a confirmation step; double submit is prevented
  while a request is in flight.
- Values the API does not provide are shown as unavailable, never fabricated (**BLOCKER**
  for invented numbers or a success toast for an action that did nothing).
- Reuses `src/components/ui/` and `src/components/admin/`; new UI matches its design
  reference. New forms use react-hook-form + zod (**WARNING** otherwise).
- A file pushed well past ~300 lines without extracting logic is a **WARNING**.

#### 5f. Test coverage
- Each new proxy has a route test (`@jest-environment node`, mocked `fetch`) covering: flag
  off → 404, upstream URL/key/`no-store`, input validation, malformed upstream → 502 with no
  secrets logged, status passthrough, actor injected for writes.
- Each new client lib has schema/adapter tests; each screen change has RTL tests for
  loading, error, empty, success and failure paths.
- A test changed to make it pass, or test infra changed to hide a failure, is a
  **BLOCKER** (conventions.md hard rule).
- No skipped/`.only` tests.

#### 5g. Commit messages
```bash
git log origin/main..origin/<head-branch> --format="%H %s"
```
Each non-merge commit follows Conventional Commits: `<type>(<area>): <description> (MER-XXX)`.
Valid types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`.

Flag as WARNING any commit that does not start with a valid type, uses a non-English
subject, or lacks the Jira key when the PR has one.

Merge commits are expected only as `Merge origin/main into <branch>` (or GitHub's
equivalent). Flag as **BLOCKER** a merge of another feature branch that is not itself
already in `main`.

#### 5h. General quality
- Comments only for the non-obvious why, in English.
- No `console.log` in production code paths; server logs never include secrets or PII.
- No overengineering: YAGNI, rule of three, no new layers.
- All identifiers, commit messages and code in English.

#### 5k. Backend contract verification (mandatory — do not review the diff in isolation)

Every proxy and client lib consumes a `meros-app` endpoint. Verify the diff against the
**real** producer on `origin/dev`, not against what the diff assumes:

```bash
git -C ../meros-app fetch origin --quiet
git -C ../meros-app grep -n "'/admin/<path>" origin/dev -- apps/api/src/modules
git -C ../meros-app show origin/dev:apps/api/src/modules/<module>/routes.ts
git -C ../meros-app show origin/dev:apps/api/src/modules/<module>/schemas.ts
git -C ../meros-app show origin/dev:apps/api/src/modules/<module>/service.ts
```
plus `packages/shared/src/schemas/*.ts` where the payload schemas live.

- The endpoint exists on `origin/dev` with the method and path the proxy calls. A proxy to
  an endpoint that does not exist there is a **BLOCKER** (unless the PR states the backend
  PR it waits for, which must be open in `meros-app`).
- The admin zod schema matches the real response: required fields the API always sends,
  nullability, enum values. A schema that rejects real responses (every call becomes a 502)
  is a **BLOCKER**.
- A field the backend returns and the feature needs, stripped by the admin schema, is a
  **BLOCKER** (learned on PR #4: `kind` and `truncated`).
- Request payloads match the backend schema, including conditional requirements
  (e.g. `groupId` required for `CATEGORY`) and limits (e.g. `limit ≤ 100`).
- Every backend error code the screen branches on (`404`, `409 <CODE>`, `400`) really is
  returned by the service for that case.
- Logic keyed on values the backend never emits is dead code — **BLOCKER**.

#### 5l. Semantic stress scenarios and bounds

Walk each new flow through hostile scenarios — reading the happy path is not a review:

- **Repeat/concurrent action**: double click, retry after a timeout, two admins acting on
  the same item (expect 409 handling, not a crash or a false success).
- **Lifecycle edges**: item already resolved, deleted, or missing (404).
- **Partial failure**: one of several sources fails — does the screen look complete when it
  is not?
- **Bounds**: lists beyond one page (`limit ≤ 100` upstream); client-side search/sort over
  a truncated page presented as if it covered everything is a **WARNING**.
- **Flag off**: the screen behaves sensibly when its proxy returns 404 from the flag.

### 6. Compile the review report

Categorize every finding:

- **BLOCKER** — must be fixed before merge (any failing check, hard-rule violation, secret
  or actor reachable from the browser, contract mismatch, fabricated data, git-flow
  violation — never downgradable)
- **WARNING** — should be fixed but not a hard blocker
- **SUGGESTION** — optional improvement

Do not repeat findings already raised in open review threads; reference them instead
("still open: <thread>").

```
## PR Review: #<number> — <title>

Author: <author>  |  Branch: <head> → <base>  |  Jira: <MER-XX or none>

### Test results
- Jest         : <N passed / M failed>  [PASS / FAIL / SKIPPED]
- tsc --noEmit : [PASS / FAIL / SKIPPED]
- ESLint       : [PASS / FAIL / SKIPPED]
- Prettier     : [PASS / FAIL / SKIPPED]
- next build   : [PASS / FAIL / SKIPPED]
- Live check   : [done against meros-app dev / not run (<reason>)]

<If any failures, list them:>
- FAIL  src/app/api/admin/categories/route.test.ts:42 — <error message>
- ERROR src/lib/admin/categories-api.ts:15:3 — <TS error>

### Domain checklist
- <failure mode> — <outcome>

### Backend contract
- <endpoint> — <matches / mismatch: …>  (meros-app <file>:<line>)

### Findings

| Severity   | File                                   | Line | Issue                                          |
|------------|----------------------------------------|------|------------------------------------------------|
| BLOCKER    | src/app/api/admin/categories/route.ts  |  34  | Upstream body forwarded without zod validation |
| WARNING    | src/app/(admin)/catalog/requests/page.tsx | 80 | Retry shown on a 404 from a disabled flag     |
| SUGGESTION | src/lib/admin/categories-api.ts        |  12  | Extract the level map to a named constant      |

### Summary

Blockers  : N
Warnings  : N
Suggestions: N

<One paragraph overall assessment>

<If ALL checks PASS and no blockers:>
Verdict: APPROVED — ready to merge into main.

<If any check FAILED, or any blocker exists:>
Verdict: CHANGES REQUIRED — N blocker(s) must be fixed.
```

**APPROVED is only permitted when Jest, `tsc --noEmit`, ESLint and `next build` are all
green with zero failures.** If checks were skipped, the verdict is `CHANGES REQUIRED` or
`INCONCLUSIVE`, never `APPROVED`.

### 7. Optionally post the review to GitHub

After presenting the report, ask:
```
Post this review on GitHub? (yes / no)
```

If the PR is a draft, remind the user and ask for confirmation before posting.

If yes, post one review with inline comments in a single call. Build a JSON file:

```json
{
  "event": "COMMENT | APPROVE | REQUEST_CHANGES",
  "body": "<full report: test results + checklist + contract + findings + summary>",
  "comments": [
    { "path": "src/app/api/admin/categories/route.ts", "line": 34, "side": "RIGHT",
      "body": "[BLOCKER] <issue description>" }
  ]
}
```

- `comments`: one entry per BLOCKER/WARNING that has a file and a line **inside the PR
  diff**; skip findings without a line or outside the diff (they stay in the body).
- `event`:
  - Draft PR → always `COMMENT`
  - The authenticated user is the PR author → always `COMMENT` (GitHub rejects the others)
  - Non-draft + APPROVED → `APPROVE`
  - Non-draft + CHANGES REQUIRED → `REQUEST_CHANGES`

```bash
gh api repos/neutech-meros/meros-admin/pulls/<number>/reviews --method POST --input <review.json>
```

Output the review URL from the response.

### 8. Update Jira (optional)

If a Jira ticket key was found in the PR AND the verdict is CHANGES REQUIRED: ask the user
whether to add a comment to the Jira issue summarizing the blockers. Only post if the user
confirms.

## Constraints

- **Never merge the PR** — the skill only reviews and comments.
- **Never commit or push** — the local checkout is read-only; never stash, delete or
  overwrite the user's local files.
- **Never modify `../meros-app`** — read it via `git show` / `git grep` on `origin/dev`.
- **Run all checks before reporting** — do not stop at the first failure.
- **git-flow blocker is a hard stop** — do not proceed past step 2 if the target is not
  `main`.
- **Always restore the original branch** (step 4) after checkout.
- **Never post to GitHub or Jira without explicit user confirmation** (steps 7–8).
- **BLOCKER threshold for approval** — any blocker means CHANGES REQUIRED, no exceptions.
- All findings and everything posted to GitHub in English; file paths relative to repo root.
