# Git flow (hard rule)

Branch topology (meros-admin): `main` is the integration branch and the only long-lived
branch. There is no `dev` here — that is the backend repo (`meros-app`), whose PRs target
`dev`.

## Check the branch BEFORE touching anything (hard rule)

**Before starting any new or unrelated task — before the first edit, and even before
exploring for a change — verify the current branch and cut a fresh one off `main`.**
Never assume the checked-out branch is yours to use.

- **Never edit, commit, or stage on a branch that belongs to another task, PR, or
  person.**
- At the start of ANY change, run `git branch --show-current`. If the branch is not one
  YOU cut for THIS specific task, stop and cut a new one:
  ```bash
  git stash --include-untracked   # only if you already made changes
  git checkout main && git pull
  git checkout -b <type>/<short-description>
  git stash pop                    # if you stashed
  ```
- This applies to every kind of change — feature, fix, chore, docs, a one-line tweak.
- If unsure whether the current branch is the right one, assume it is NOT and branch from
  `main`.

## The flow

1. **Always branch from an up-to-date `main`.**
2. **One branch per subtask, or per agreed group of subtasks** (e.g. all admin subtasks
   of one story in one PR, one commit per subtask with its Jira key).
3. **PR targets `main`.** A developer reviews and merges; do not merge your own PR.
4. **Never commit directly to `main`.**
5. A PR that consumes a backend change can only be merged after the backend PR is merged
   into `meros-app` `dev` — say so in the PR description.
6. Keep the branch current by merging `origin/main` into it (`git merge origin/main`);
   never rewrite a shared branch's history without the reviewer's agreement.

## Branch naming

`<type>/<short-kebab-description>` where `<type>` matches Conventional Commits:
`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`. Include the Jira key:
`feat/mer-1153-wire-category-requests-list`.

## Commits & PRs

- Conventional Commits with the Jira key (see conventions.md).
- Open PRs only when the user asks. Push only when the user asks.
