# Code conventions (meros-admin)

## Language & comments (hard rule)

- **Everything in the codebase is English**: identifiers, commit messages, PR titles
  **and PR descriptions**, **code review content (review body + inline comments)**,
  docs in code, error strings in logs. Anything posted to GitHub (PRs, reviews) is
  always in English, regardless of the chat language.
- Comments only for the genuinely non-obvious *why* (a backend contract quirk, a
  security or timezone decision, a tracked workaround). Never comment *what* the code
  does. Comments are in English.

## No hardcoded user-facing strings (hard rule)

- Every user-visible string goes through react-i18next (`t('admin.<area>.<key>')`) —
  labels, toasts, empty/error states, aria labels, dialog copy.
- A new key goes into **all three** locale files (`ptBR.json`, `enUS.json`, `esES.json`)
  with the same placeholders.
- One full sentence per case. Never interpolate a raw backend enum or a sentence fragment
  into a translated sentence (learned on PR #4: a cancel reason fragment attributed an
  admin cancellation to the user). Map each known value to its own key and fall back to a
  generic key for unknown values.
- `src/locales/__tests__/locales.test.ts` enforces parity for `admin.users`; a PR that adds
  a new `admin.*` section should extend it.

## No hardcoded design values (hard rule)

- Colors, radii, font sizes and spacing come from Tailwind classes and the CSS variable
  tokens in `src/app/globals.css` (see `DESIGN_TOKENS.md`), e.g.
  `style={{ color: 'var(--text-secondary)' }}` or a Tailwind utility.
- **No inline hex** (`#RRGGBB`) or `rgb()` literals in components, pages or libs. A missing
  value becomes a named CSS variable (light and dark) first.

## UI comes from a design reference (hard rule)

- Admin screens are ported from the reference mockup (Meros Admin HTML) or built from an
  explicit spec/pasted image. Never invent UI or copy. If there is no reference, ask for
  one before building.
- Reuse `src/components/ui/` and `src/components/admin/` before adding components.
- Every data-backed view covers loading, error (with retry when retrying can succeed) and
  empty states.

## Simplicity — no overengineering (hard rule)

- YAGNI, rule of three, functions over classes, no speculative abstractions or config for
  things that never vary.
- Follow the existing layout (architecture.md) — no extra layers (no repositories, DTO
  mapper classes or service containers in the admin).

## TypeScript

- `strict: true`; no `any` (use `unknown` + narrowing).
- **zod at every boundary**: upstream responses in proxy routes, request bodies/query in
  POST/PATCH/GET proxies, and responses again in client libs. Types come from `z.infer`,
  not hand-written duplicates.
- External enums (reasons, statuses, kinds) are parsed against the known set
  (`z.enum([...])`, with `.catch(...)` where unknown values must degrade) before being used
  as lookup keys — never index a plain object with an external string (learned on PR #4:
  `"constructor"` resolved to a function).
- Keep every field of the backend contract that the UI needs (learned on PR #4: zod
  silently stripped `kind` and `truncated`, so deletion requests rendered as
  deactivations).

## Security (hard rule)

- Admin API key and actor stay server-side (architecture.md).
- New proxy flags default off in production.
- Logs never include the API key, the actor secret or user PII beyond ids.
- Server-only modules that read secrets import `server-only`.

## Testing

- Jest (`npm test`) with jsdom and React Testing Library; i18n loads in `pt`; `TZ` is
  pinned to `America/Sao_Paulo` in `jest.config.js`.
- Route handler tests use the `@jest-environment node` docblock and mock `global.fetch`.
  Never call the real backend in tests.
- TDD: write the test first for proxies, libs and screen behaviour.

### Never change a test (or test infra) to make it pass (hard rule)

A red test means the CODE is wrong until proven otherwise — fix the code, not the test.

- **Never** weaken, delete, skip (`.skip`/`.only`/`xit`), loosen an assertion, or rewrite
  a test's expectation to get to green.
- **Never touch test infrastructure to hide a failure**: no muted console/error handlers,
  no bumped timeouts, no changed jest config, setup-file hacks or extra mocks whose purpose
  is to suppress an error rather than exercise real behaviour.
- Editing a test is legitimate ONLY when the requirement itself changed (and that is the
  called-out point of the work) or the test asserted something genuinely wrong — then stop,
  explain why, and get the change approved.
- Applies to everyone, including subagents. If tests won't pass, report BLOCKED with the
  real failure.

## Forms

- New forms use `react-hook-form` with `zodResolver` and the `src/components/ui/form.tsx`
  primitives (as in `UserDetailDrawer`). Existing `useState` forms are not rewritten unless
  the PR is already changing them.

## Component size

- Prefer files under ~300 lines. When a page or component grows past that, move non-JSX
  logic into a co-located hook or a `src/lib/admin` helper. Several current files exceed
  this (e.g. `UserDetailDrawer.tsx`); do not make them bigger without extracting.
- No nested ternaries in JSX — use a named render helper with early returns.

## Git

- Conventional Commits with the Jira key: `feat(categories): wire request list (MER-1153)`.
  Scope is the admin area (`users`, `categories`, `moderation`, `nav`, …).
- See git-flow.md for branches and PRs.
