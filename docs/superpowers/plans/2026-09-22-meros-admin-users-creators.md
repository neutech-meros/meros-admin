# Users & Creators Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/users` screen — a searchable/filterable/sortable table of users & creators, a row kebab menu, a right-side detail drawer (4 tabs, profile view/edit), and a reset-password dialog — faithfully matching what actually renders in the reference artifact.

**Architecture:** Mock data + pure filter/sort functions feed a page-level state machine (`src/app/(admin)/users/page.tsx`), which composes presentational components: `UsersFilters`, `UsersTable` (with a `DropdownMenu` kebab per row), `UserDetailDrawer` (shadcn `Sheet`, built on a new reusable `DrawerBlocks` renderer), and `ResetPasswordDialog` (shadcn `Dialog`). All four UI components already exist as shadcn primitives from Phase 1 (`sheet.tsx`, `dialog.tsx`, `table.tsx`, `dropdown-menu.tsx`) — no new installs.

**Tech Stack:** Next.js 15 (App Router) + TypeScript, Tailwind CSS v4, shadcn/ui (`Sheet`, `Dialog`, `Table`, `DropdownMenu` — all already installed), `sonner` (toast, already installed and mounted), `react-i18next`.

**Spec:** `docs/superpowers/specs/2026-09-22-meros-admin-users-creators-design.md`

## Global Constraints

- 100% fidelity to what actually **renders** in `Meros Admin (standalone).html` — not to the fuller script data model. Confirmed dead code to skip: the Type filter and combined sort-dropdown (script builds them, markup never references them), 7 of the drawer's 11 tabs (Purchases, Lists, Followers, Following, Devices, Sessions, Activity — no markup binding), functional pagination (the pager's `onClick` is `() => {}` in the source), and a confirmation dialog for Deactivate/Delete (the source has none — both are instant toasts).
- Badge coloring for this screen uses `cellHelpers().badge()`'s tone map (script lines 3595–3609) — a **different** map than Phase 1's `src/lib/admin/status-styles.ts` (`statusStyle`/`typeStyle`, which ports a different, Dashboard-specific function). Do not reuse or merge them — port this screen's map as its own module.
- Repo is Tailwind v4 (CSS-first) — `tailwind.config.ts` doesn't exist anymore (deleted in Phase 1's final review); every Meros token is `var(--token-name)` in inline `style`, never a Tailwind color utility class. `@custom-variant dark (&:is(.dark *));` in `globals.css` makes `dark:` utilities track the `.dark` class if you need one, but prefer `var(--token)` for anything Meros-specific, matching every existing component.
- `useTheme()` from `@/hooks/useTheme` is the only theme mechanism in the app — don't introduce another.
- UI-chrome strings (headings, column labels, filter labels, button/dialog copy, empty-state copy) go through `t()`. Mock-data record values (names, emails, plan/status/type as data) render directly, not through `t()` — same split as Phase 1.
- Stage files explicitly on every commit (`git add <files>`, never `-A`/`.`) — the worktree root has a gitignored 1.2MB reference file that must never be staged.
- Canonical `cn` helper: `@/lib/utils`. Radix primitives: whatever `@radix-ui/react-*` package is already a direct dependency — don't touch `src/components/ui/*` unless truly necessary, and if you do, follow this rule (a Phase 1 review finding).

## Review Focus

- **Sort-toggle correctness** — clicking the same sortable column header twice must flip direction (asc→desc→asc), and clicking a different column must switch to that column with its own default direction (`uCols`' third tuple element) — a reasonable person expects the arrow indicator to always match what's actually sorted, not lag behind a stale click.
- **Filter + search interaction** — combining a search query with one or more filters must AND them together (not OR), and "Clear filters" must reset search, all three filters, and sort back to their defaults in one click, appearing only when at least one is non-default (matching `usersClearDisplay`'s condition) — easy to get subtly wrong (e.g. clear button always visible, or filters OR'd instead of AND'd).
- **Drawer state resets per-user** — opening the drawer for a different user (without closing it first — e.g. clicking another row while a drawer is open, if that's reachable) must reset the active tab to Profile and exit edit mode, matching `openDrawer()`'s behavior (`userTab: 'perfil', profileEdit: false, profileForm: null`) — otherwise a user could see a stale edit draft or wrong tab bleeding in from the previously-viewed profile.
- **Reset-password validation on invalid data** — sending with an invalid/empty email or phone must NOT close the dialog or show a success toast; it must show an error toast and force that field into edit mode, per the source's `onSend` logic — a reasonable person expects a failed send to visibly fail, not silently succeed.
- **Empty states render for every zero-data case** — no results after filtering (table empty state), and each of the 3 non-Profile drawer tabs when a mock user has no subscriptions/history/reports (block-level empty state) — both must actually be reachable with the mock data this plan writes, not just theoretically implemented.

---

## Task 1: Shared avatar/initials helper + badge-tone helper

**Files:**
- Create: `src/lib/mocks/admin/avatar.ts`
- Modify: `src/lib/mocks/admin/dashboard.ts` (use the extracted helper instead of its local copy)
- Create: `src/lib/admin/badge-tone.ts`
- Test: `src/lib/mocks/admin/__tests__/avatar.test.ts`
- Test: `src/lib/admin/__tests__/badge-tone.test.ts`

**Interfaces:**
- Produces: `initialsOf(name: string): string` and `avatarColorForIndex(index: number): string` from `@/lib/mocks/admin/avatar` — consumed by Task 2 (mock data) and reused by `dashboard.ts`.
- Produces: `interface BadgeTone { color: string; background: string }` and `badgeTone(status: string, toneOverride?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'): BadgeTone` from `@/lib/admin/badge-tone` — consumed by Task 5 (table badges), Task 7 (drawer badges).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/mocks/admin/__tests__/avatar.test.ts
import { avatarColorForIndex, initialsOf } from '../avatar';

describe('initialsOf', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initialsOf('Camila Duarte')).toBe('CD');
  });
  it('handles a single-word name', () => {
    expect(initialsOf('Cher')).toBe('C');
  });
});

describe('avatarColorForIndex', () => {
  it('cycles through a fixed palette by index', () => {
    expect(avatarColorForIndex(0)).toBe('#7F00FF');
    expect(avatarColorForIndex(5)).toBe('#7F00FF');
  });
});
```

```ts
// src/lib/admin/__tests__/badge-tone.test.ts
import { badgeTone } from '../badge-tone';

describe('badgeTone', () => {
  it('auto-colors a known success status', () => {
    expect(badgeTone('Active')).toEqual({ color: 'var(--success)', background: 'var(--success-bg)' });
  });
  it('auto-colors Creator as info', () => {
    expect(badgeTone('Creator')).toEqual({ color: 'var(--info)', background: 'var(--info-bg)' });
  });
  it('falls back to neutral for a status with no auto entry (e.g. Deleted)', () => {
    expect(badgeTone('Deleted')).toEqual({ color: 'var(--text-secondary)', background: 'var(--bg-surface-hover)' });
  });
  it('falls back to neutral for User (no auto entry)', () => {
    expect(badgeTone('User')).toEqual({ color: 'var(--text-secondary)', background: 'var(--bg-surface-hover)' });
  });
  it('respects an explicit tone override regardless of the status text', () => {
    expect(badgeTone('All categories', 'neutral')).toEqual({
      color: 'var(--text-secondary)',
      background: 'var(--bg-surface-hover)',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- avatar badge-tone`
Expected: FAIL (modules don't exist)

- [ ] **Step 3: Implement `avatar.ts`** (extracted verbatim from `dashboard.ts`'s existing local copy)

```ts
// src/lib/mocks/admin/avatar.ts
const AVATAR_COLORS = ['#7F00FF', '#1A8245', '#7C5CDF', '#B7791F', '#DF2339'];

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function avatarColorForIndex(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
```

- [ ] **Step 4: Update `dashboard.ts` to use the extracted helper**

Read `src/lib/mocks/admin/dashboard.ts` first. Remove its local `AVATAR_COLORS` constant and `initialsOf` function (lines 251–260), add an import:

```ts
import { avatarColorForIndex, initialsOf } from './avatar';
```

Update `getRecentUsers()`'s `avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length]` to `avatarColor: avatarColorForIndex(i)`. Leave everything else in the file unchanged.

- [ ] **Step 5: Implement `badge-tone.ts`** (ported verbatim from `cellHelpers().badge()`, script lines 3595–3609)

```ts
// src/lib/admin/badge-tone.ts
export interface BadgeTone {
  color: string;
  background: string;
}

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_MAP: Record<Tone, BadgeTone> = {
  success: { color: 'var(--success)', background: 'var(--success-bg)' },
  warning: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  danger: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  info: { color: 'var(--info)', background: 'var(--info-bg)' },
  neutral: { color: 'var(--text-secondary)', background: 'var(--bg-surface-hover)' },
};

const AUTO_TONE: Record<string, Tone> = {
  Published: 'success',
  Active: 'success',
  Paid: 'success',
  Completed: 'success',
  Approved: 'success',
  Won: 'success',
  'In review': 'warning',
  Pending: 'warning',
  Processing: 'warning',
  Requested: 'warning',
  'In dispute': 'warning',
  Reported: 'danger',
  Failed: 'danger',
  Denied: 'danger',
  Blocked: 'danger',
  Lost: 'danger',
  Received: 'danger',
  Creator: 'info',
  'Session atual': 'info',
};

export function badgeTone(status: string, toneOverride?: Tone): BadgeTone {
  return TONE_MAP[toneOverride ?? AUTO_TONE[status] ?? 'neutral'];
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- avatar badge-tone`
Expected: PASS

- [ ] **Step 7: Run the full suite, typecheck, lint to confirm the `dashboard.ts` edit didn't break anything**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/mocks/admin/avatar.ts src/lib/mocks/admin/dashboard.ts src/lib/admin/badge-tone.ts src/lib/mocks/admin/__tests__/avatar.test.ts src/lib/admin/__tests__/badge-tone.test.ts
git commit -m "feat: add shared avatar helper and Users-screen badge-tone helper"
```

---

## Task 2: Users & Creators mock data

**Files:**
- Create: `src/lib/mocks/admin/users.ts`
- Test: `src/lib/mocks/admin/__tests__/users.test.ts`

**Interfaces:**
- Consumes: `initialsOf`, `avatarColorForIndex` from `@/lib/mocks/admin/avatar` (Task 1).
- Produces (from `@/lib/mocks/admin/users`, consumed by Task 3 and the page in Task 9):
  - `interface UserRecord { id: string; name: string; email: string; phone: string; location: string; bio: string; account: 'Personal' | 'Business'; plan: 'Free trial' | 'Freemium' | 'Premium'; followers: string; following: string; joined: string; status: 'Active' | 'Deactivated' | 'Deleted'; type: 'User' | 'Creator'; initials: string; avatarColor: string }`
  - `getUsers(): UserRecord[]` — 10 invented records covering every value of `account`/`plan`/`status`/`type` at least once, `type`/`account` independently varied (at least one record with `type: 'User'` and `account: 'Business'`, or vice versa, per the spec's note that these are independent fields in the source).
  - `interface SubscriptionRow { plan: string; amount: string; since: string; status: string }`
  - `getUserSubscriptions(userId: string): SubscriptionRow[]` — empty array for at least one mock user (to exercise the tab's empty state).
  - `interface HistoryEvent { title: string; time: string }`
  - `getUserHistory(userId: string): HistoryEvent[]` — non-empty for every user (history always has at least an "Account created" entry, matching how a real system would behave — the source's `historico`/`atividade` tabs render a plain timeline whenever there's any data, and there's no markup-visible empty state specific to History in this screen beyond the shared block-level `isEmpty`, so an always-non-empty history is a safe, faithful default; if you want to exercise the History tab's empty state too, make exactly one user's history empty as well — either is fine, just don't leave the empty state completely unreachable across the whole mock dataset for either Subscriptions or Reports).
  - `interface ReportRow { type: string; reason: string; status: string; date: string }`
  - `getUserReports(userId: string): ReportRow[]` — empty for most users, non-empty for at least one (so the Reports tab's populated table state is reachable too, not just its empty state).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/mocks/admin/__tests__/users.test.ts
import { getUserHistory, getUserReports, getUserSubscriptions, getUsers } from '../users';

describe('getUsers', () => {
  it('returns 10 records with initials/avatarColor derived from name/index', () => {
    const users = getUsers();
    expect(users).toHaveLength(10);
    users.forEach((u) => {
      expect(u.initials.length).toBeGreaterThan(0);
      expect(u.avatarColor).toMatch(/^#/);
    });
  });

  it('covers every account/plan/status/type value at least once', () => {
    const users = getUsers();
    expect(new Set(users.map((u) => u.account))).toEqual(new Set(['Personal', 'Business']));
    expect(new Set(users.map((u) => u.plan))).toEqual(new Set(['Free trial', 'Freemium', 'Premium']));
    expect(new Set(users.map((u) => u.status))).toEqual(new Set(['Active', 'Deactivated', 'Deleted']));
    expect(new Set(users.map((u) => u.type))).toEqual(new Set(['User', 'Creator']));
  });

  it('has at least one record where type and account disagree (independent fields)', () => {
    const users = getUsers();
    const disagree = users.some(
      (u) => (u.type === 'Creator') !== (u.account === 'Business'),
    );
    expect(disagree).toBe(true);
  });

  it('has unique ids', () => {
    const ids = getUsers().map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('per-user tab data', () => {
  it('has at least one user with no subscriptions', () => {
    const users = getUsers();
    expect(users.some((u) => getUserSubscriptions(u.id).length === 0)).toBe(true);
  });

  it('gives every user at least one history event', () => {
    const users = getUsers();
    users.forEach((u) => expect(getUserHistory(u.id).length).toBeGreaterThan(0));
  });

  it('has at least one user with reports and most with none', () => {
    const users = getUsers();
    const withReports = users.filter((u) => getUserReports(u.id).length > 0);
    expect(withReports.length).toBeGreaterThan(0);
    expect(withReports.length).toBeLessThan(users.length);
  });

  it('returns an empty array for an unknown id', () => {
    expect(getUserSubscriptions('nope')).toEqual([]);
    expect(getUserReports('nope')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- users.test`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `users.ts`**

```ts
// src/lib/mocks/admin/users.ts
import { avatarColorForIndex, initialsOf } from './avatar';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  account: 'Personal' | 'Business';
  plan: 'Free trial' | 'Freemium' | 'Premium';
  followers: string;
  following: string;
  joined: string;
  status: 'Active' | 'Deactivated' | 'Deleted';
  type: 'User' | 'Creator';
  initials: string;
  avatarColor: string;
}

interface UserSeed {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  account: UserRecord['account'];
  plan: UserRecord['plan'];
  followers: string;
  following: string;
  joined: string;
  status: UserRecord['status'];
  type: UserRecord['type'];
}

// Mock (window.MEROS.USERS is not present in the source file). Covers every
// account/plan/status/type value, with at least one record where type and
// account disagree (they're independently-settable fields in the source).
const SEEDS: UserSeed[] = [
  {
    id: 'u1',
    name: 'Camila Duarte',
    email: 'camila.duarte@mail.com',
    phone: '+55 21 98888-1234',
    location: 'Rio de Janeiro, RJ',
    bio: 'Travel creator focused on budget backpacking across South America.',
    account: 'Business',
    plan: 'Premium',
    followers: '48.3k',
    following: '210',
    joined: '12/03/2025',
    status: 'Active',
    type: 'Creator',
  },
  {
    id: 'u2',
    name: 'Rafael Nogueira',
    email: 'rafael.nogueira@mail.com',
    phone: '+55 11 97777-2345',
    location: 'São Paulo, SP',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Freemium',
    followers: '312',
    following: '89',
    joined: '20/08/2026',
    status: 'Active',
    type: 'User',
  },
  {
    id: 'u3',
    name: 'Priscila Matos',
    email: 'priscila.matos@mail.com',
    phone: '+55 31 96666-3456',
    location: 'Belo Horizonte, MG',
    bio: 'Documenting Brazilian national parks, one trail at a time.',
    account: 'Business',
    plan: 'Premium',
    followers: '19.7k',
    following: '156',
    joined: '02/01/2026',
    status: 'Pending',
    type: 'Creator',
  },
  {
    id: 'u4',
    name: 'Eduardo Lima',
    email: 'eduardo.lima@mail.com',
    phone: '+55 41 95555-4567',
    location: 'Curitiba, PR',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Free trial',
    followers: '54',
    following: '30',
    joined: '18/08/2026',
    status: 'Deactivated',
    type: 'User',
  },
  {
    id: 'u5',
    name: 'Marina Alves',
    email: 'marina.alves@mail.com',
    phone: '+55 21 94444-5678',
    location: 'Paraty, RJ',
    bio: 'Runs weekend itineraries for small groups along the Costa Verde.',
    account: 'Business',
    plan: 'Freemium',
    followers: '2.1k',
    following: '412',
    joined: '05/11/2025',
    status: 'Active',
    type: 'Creator',
  },
  {
    id: 'u6',
    name: 'Diego Fontes',
    email: 'diego.fontes@mail.com',
    phone: '+55 61 93333-6789',
    location: 'Brasília, DF',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Premium',
    followers: '1.4k',
    following: '75',
    joined: '30/06/2025',
    status: 'Active',
    type: 'User',
  },
  {
    id: 'u7',
    name: 'Helena Cardoso',
    email: 'helena.cardoso@mail.com',
    phone: '+55 71 92222-7890',
    location: 'Salvador, BA',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Freemium',
    followers: '98',
    following: '44',
    joined: '14/02/2026',
    status: 'Deleted',
    type: 'User',
  },
  {
    id: 'u8',
    name: 'Bruno Tavares',
    // Independent-field case: business account, but type is still 'User' —
    // the source allows this combination since account and type are set
    // separately.
    email: 'bruno.tavares@mail.com',
    phone: '+55 85 91111-8901',
    location: 'Fortaleza, CE',
    bio: 'No bio added.',
    account: 'Business',
    plan: 'Free trial',
    followers: '210',
    following: '18',
    joined: '01/09/2026',
    status: 'Active',
    type: 'User',
  },
  {
    id: 'u9',
    name: 'Isabela Ramos',
    email: 'isabela.ramos@mail.com',
    phone: '+55 51 90000-9012',
    location: 'Porto Alegre, RS',
    bio: 'Wine-country routes across the Vale dos Vinhedos.',
    account: 'Personal',
    plan: 'Premium',
    followers: '6.8k',
    following: '260',
    joined: '22/04/2025',
    status: 'Active',
    type: 'Creator',
  },
  {
    id: 'u10',
    name: 'Thiago Souza',
    email: 'thiago.souza@mail.com',
    phone: '+55 27 98765-0123',
    location: 'Vitória, ES',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Freemium',
    followers: '132',
    following: '61',
    joined: '09/07/2026',
    status: 'Deactivated',
    type: 'User',
  },
];

export function getUsers(): UserRecord[] {
  return SEEDS.map((u, i) => ({
    ...u,
    initials: initialsOf(u.name),
    avatarColor: avatarColorForIndex(i),
  }));
}

const SUBSCRIPTIONS: Record<string, SubscriptionRow[]> = {
  u1: [
    { plan: 'Premium', amount: 'R$ 39,90/mo', since: '12/03/2025', status: 'Active' },
  ],
  u3: [
    { plan: 'Premium', amount: 'R$ 39,90/mo', since: '02/01/2026', status: 'Active' },
  ],
  u5: [
    { plan: 'Freemium', amount: 'R$ 0,00', since: '05/11/2025', status: 'Active' },
  ],
  u9: [
    { plan: 'Premium', amount: 'R$ 39,90/mo', since: '22/04/2025', status: 'Active' },
    { plan: 'Freemium', amount: 'R$ 0,00', since: '10/01/2024', status: 'Cancelled' },
  ],
};

export interface SubscriptionRow {
  plan: string;
  amount: string;
  since: string;
  status: string;
}

export function getUserSubscriptions(userId: string): SubscriptionRow[] {
  return SUBSCRIPTIONS[userId] ?? [];
}

export interface HistoryEvent {
  title: string;
  time: string;
}

const HISTORY: Record<string, HistoryEvent[]> = {
  u1: [
    { title: 'Published new list "10 dias na Patagônia"', time: '18 Sep 2026, 09:12' },
    { title: 'Upgraded to Premium', time: '12 Mar 2025, 14:30' },
    { title: 'Account created', time: '02 Feb 2025, 10:00' },
  ],
  u2: [{ title: 'Account created', time: '20 Aug 2026, 16:45' }],
  u3: [
    { title: 'Business verification submitted', time: '02 Jan 2026, 11:20' },
    { title: 'Account created', time: '28 Dec 2025, 09:00' },
  ],
  u4: [
    { title: 'Account deactivated', time: '18 Aug 2026, 08:15' },
    { title: 'Account created', time: '18 Aug 2026, 08:00' },
  ],
  u5: [
    { title: 'Published new list "Roteiro Costa Verde"', time: '01 Sep 2026, 13:00' },
    { title: 'Account created', time: '05 Nov 2025, 09:30' },
  ],
  u6: [{ title: 'Account created', time: '30 Jun 2025, 15:00' }],
  u7: [
    { title: 'Account deleted', time: '01 Mar 2026, 10:00' },
    { title: 'Account created', time: '14 Feb 2026, 12:00' },
  ],
  u8: [{ title: 'Account created', time: '01 Sep 2026, 17:20' }],
  u9: [
    { title: 'Published new list "Vinícolas do Vale dos Vinhedos"', time: '15 Jun 2025, 10:00' },
    { title: 'Account created', time: '22 Apr 2025, 08:45' },
  ],
  u10: [
    { title: 'Account deactivated', time: '09 Jul 2026, 09:00' },
    { title: 'Account created', time: '09 Jul 2026, 08:50' },
  ],
};

export function getUserHistory(userId: string): HistoryEvent[] {
  return HISTORY[userId] ?? [];
}

export interface ReportRow {
  type: string;
  reason: string;
  status: string;
  date: string;
}

const REPORTS: Record<string, ReportRow[]> = {
  u4: [{ type: 'Received', reason: 'Suspicious payment activity', status: 'Pending', date: '17/08/2026' }],
  u7: [
    { type: 'Received', reason: 'Fake profile information', status: 'Approved', date: '28/02/2026' },
    { type: 'Sent', reason: 'Spam messages from another account', status: 'Denied', date: '20/02/2026' },
  ],
};

export function getUserReports(userId: string): ReportRow[] {
  return REPORTS[userId] ?? [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- users.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mocks/admin/users.ts src/lib/mocks/admin/__tests__/users.test.ts
git commit -m "feat: add Users & Creators mock data"
```

---

## Task 3: Filter/sort logic

**Files:**
- Create: `src/lib/admin/users-table.ts`
- Test: `src/lib/admin/__tests__/users-table.test.ts`

**Interfaces:**
- Consumes: `UserRecord` from `@/lib/mocks/admin/users` (Task 2).
- Produces (from `@/lib/admin/users-table`, consumed by Task 9's page):
  - `interface UserFilters { query: string; account: 'all' | 'Personal' | 'Business'; plan: 'all' | UserRecord['plan']; status: 'all' | UserRecord['status'] }`
  - `const DEFAULT_FILTERS: UserFilters` — `{ query: '', account: 'all', plan: 'all', status: 'all' }`.
  - `type SortKey = 'name' | 'account' | 'plan' | 'followers' | 'joined' | 'status'`
  - `type SortDir = 'asc' | 'desc'`
  - `interface SortState { key: SortKey | null; dir: SortDir }`
  - `const DEFAULT_SORT: SortState` — `{ key: null, dir: 'desc' }`.
  - `const SORT_COLUMNS: Array<{ key: SortKey; defaultDir: SortDir }>` — the exact `uCols` tuples ported: `[['name','asc'],['account','asc'],['plan','desc'],['followers','desc'],['joined','desc'],['status','asc']]`.
  - `function filterAndSortUsers(users: UserRecord[], filters: UserFilters, sort: SortState): UserRecord[]` — pure function: filters by search (name/email, case-insensitive substring) AND account AND plan AND status (each `'all'` is a no-op), then sorts if `sort.key` is set, using the exact comparator rules from the source: `followers` parsed via a k/m-suffix-aware numeric parse (e.g. `"48.3k"` → `48300`, `"1.4k"` → `1400`, plain numbers parsed as-is), `plan` ranked `Premium=3 > 'Free trial'=2 > Freemium=1`, `joined` via `Date.parse` (source date format is `DD/MM/YYYY` — note `Date.parse` on that format is unreliable across locales in real browsers, but this only needs to produce a *consistent* ordering for the mock dataset, not a globally-correct date parser; write a small `parseJoinedDate(s: string): number` that reads `DD/MM/YYYY` explicitly rather than relying on `Date.parse`'s locale-dependent behavior — this is a deliberate, minor faithful-behavior improvement over the source's fragile `Date.parse(u.joined)`, since the source's dates were likely also DD/MM/YYYY and its `Date.parse` call was already fragile/non-portable; don't port that fragility), everything else (`name`, `account`, `status`) via case-insensitive string compare.
  - `function isAnyFilterActive(filters: UserFilters, sort: SortState): boolean` — true if `filters` differs from `DEFAULT_FILTERS` in any field or `sort.key` is non-null (mirrors `usersClearDisplay`'s condition).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/admin/__tests__/users-table.test.ts
import type { UserRecord } from '@/lib/mocks/admin/users';

import { DEFAULT_FILTERS, DEFAULT_SORT, filterAndSortUsers, isAnyFilterActive } from '../users-table';

function user(overrides: Partial<UserRecord>): UserRecord {
  return {
    id: 'x',
    name: 'Test User',
    email: 'test@mail.com',
    phone: '',
    location: '',
    bio: '',
    account: 'Personal',
    plan: 'Freemium',
    followers: '100',
    following: '0',
    joined: '01/01/2025',
    status: 'Active',
    type: 'User',
    initials: 'TU',
    avatarColor: '#000',
    ...overrides,
  };
}

describe('filterAndSortUsers', () => {
  const users = [
    user({ id: 'a', name: 'Alice Andrade', email: 'alice@mail.com', account: 'Personal', plan: 'Freemium', followers: '1.5k', joined: '10/01/2025', status: 'Active' }),
    user({ id: 'b', name: 'Bruno Barros', email: 'bruno@mail.com', account: 'Business', plan: 'Premium', followers: '48.3k', joined: '05/06/2025', status: 'Deactivated' }),
    user({ id: 'c', name: 'Carla Costa', email: 'carla@mail.com', account: 'Personal', plan: 'Free trial', followers: '90', joined: '20/03/2025', status: 'Active' }),
  ];

  it('returns everything with default filters and no sort', () => {
    expect(filterAndSortUsers(users, DEFAULT_FILTERS, DEFAULT_SORT)).toHaveLength(3);
  });

  it('filters by search across name and email', () => {
    const result = filterAndSortUsers(users, { ...DEFAULT_FILTERS, query: 'bruno' }, DEFAULT_SORT);
    expect(result.map((u) => u.id)).toEqual(['b']);
  });

  it('filters by account and plan and status together (AND, not OR)', () => {
    const result = filterAndSortUsers(
      users,
      { ...DEFAULT_FILTERS, account: 'Personal', status: 'Active' },
      DEFAULT_SORT,
    );
    expect(result.map((u) => u.id).sort()).toEqual(['a', 'c']);
  });

  it('sorts by followers descending, parsing k-suffixed values', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'followers', dir: 'desc' });
    expect(result.map((u) => u.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by followers ascending', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'followers', dir: 'asc' });
    expect(result.map((u) => u.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by plan using the rank order Premium > Free trial > Freemium', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'plan', dir: 'desc' });
    expect(result.map((u) => u.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by joined date', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'joined', dir: 'asc' });
    expect(result.map((u) => u.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by name case-insensitively', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'name', dir: 'asc' });
    expect(result.map((u) => u.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('isAnyFilterActive', () => {
  it('is false for the default filters and sort', () => {
    expect(isAnyFilterActive(DEFAULT_FILTERS, DEFAULT_SORT)).toBe(false);
  });
  it('is true when search is set', () => {
    expect(isAnyFilterActive({ ...DEFAULT_FILTERS, query: 'x' }, DEFAULT_SORT)).toBe(true);
  });
  it('is true when a filter is non-default', () => {
    expect(isAnyFilterActive({ ...DEFAULT_FILTERS, account: 'Business' }, DEFAULT_SORT)).toBe(true);
  });
  it('is true when a sort is active', () => {
    expect(isAnyFilterActive(DEFAULT_FILTERS, { key: 'name', dir: 'asc' })).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- users-table`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `users-table.ts`**

```ts
// src/lib/admin/users-table.ts
import type { UserRecord } from '@/lib/mocks/admin/users';

export interface UserFilters {
  query: string;
  account: 'all' | UserRecord['account'];
  plan: 'all' | UserRecord['plan'];
  status: 'all' | UserRecord['status'];
}

export const DEFAULT_FILTERS: UserFilters = {
  query: '',
  account: 'all',
  plan: 'all',
  status: 'all',
};

export type SortKey = 'name' | 'account' | 'plan' | 'followers' | 'joined' | 'status';
export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: SortKey | null;
  dir: SortDir;
}

export const DEFAULT_SORT: SortState = { key: null, dir: 'desc' };

export const SORT_COLUMNS: Array<{ key: SortKey; defaultDir: SortDir }> = [
  { key: 'name', defaultDir: 'asc' },
  { key: 'account', defaultDir: 'asc' },
  { key: 'plan', defaultDir: 'desc' },
  { key: 'followers', defaultDir: 'desc' },
  { key: 'joined', defaultDir: 'desc' },
  { key: 'status', defaultDir: 'asc' },
];

const PLAN_RANK: Record<UserRecord['plan'], number> = {
  Premium: 3,
  'Free trial': 2,
  Freemium: 1,
};

function followersNum(s: string): number {
  const t = s.trim().toLowerCase();
  const n = parseFloat(t) || 0;
  if (t.endsWith('m')) return n * 1e6;
  if (t.endsWith('k')) return n * 1e3;
  return n;
}

function parseJoinedDate(s: string): number {
  const [day, month, year] = s.split('/').map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function sortValue(user: UserRecord, key: SortKey): number | string {
  switch (key) {
    case 'followers':
      return followersNum(user.followers);
    case 'plan':
      return PLAN_RANK[user.plan] ?? 0;
    case 'joined':
      return parseJoinedDate(user.joined);
    case 'account':
      return user.account.toLowerCase();
    default:
      return String(user[key] ?? '').toLowerCase();
  }
}

export function filterAndSortUsers(
  users: UserRecord[],
  filters: UserFilters,
  sort: SortState,
): UserRecord[] {
  const q = filters.query.trim().toLowerCase();
  const filtered = users.filter(
    (u) =>
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (filters.account === 'all' || u.account === filters.account) &&
      (filters.plan === 'all' || u.plan === filters.plan) &&
      (filters.status === 'all' || u.status === filters.status),
  );

  if (!sort.key) return filtered;

  const key = sort.key;
  const mul = sort.dir === 'asc' ? 1 : -1;
  return [...filtered].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va < vb) return -mul;
    if (va > vb) return mul;
    return 0;
  });
}

export function isAnyFilterActive(filters: UserFilters, sort: SortState): boolean {
  return (
    filters.query !== DEFAULT_FILTERS.query ||
    filters.account !== DEFAULT_FILTERS.account ||
    filters.plan !== DEFAULT_FILTERS.plan ||
    filters.status !== DEFAULT_FILTERS.status ||
    sort.key !== null
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- users-table`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/users-table.ts src/lib/admin/__tests__/users-table.test.ts
git commit -m "feat: add Users & Creators filter/sort logic"
```

---

## Task 4: `UsersFilters` component

**Files:**
- Create: `src/components/admin/users/UsersFilters.tsx`
- Test: `src/components/admin/users/__tests__/UsersFilters.test.tsx`

**Interfaces:**
- Consumes: `UserFilters`, `DEFAULT_FILTERS` from `@/lib/admin/users-table` (Task 3); `IconSearch`, `IconClose` from `@/components/admin/icons` (already exist from Phase 1).
- Produces: `<UsersFilters filters={UserFilters} onFiltersChange={(next: UserFilters) => void} showClear={boolean} onClear={() => void} />` from `@/components/admin/users/UsersFilters`, consumed by Task 9's page.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/users/__tests__/UsersFilters.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEFAULT_FILTERS } from '@/lib/admin/users-table';

import { UsersFilters } from '../UsersFilters';

describe('UsersFilters', () => {
  it('calls onFiltersChange with the typed query on search input', async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(
      <UsersFilters filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} showClear={false} onClear={jest.fn()} />,
    );
    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'a');
    expect(onFiltersChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, query: 'a' });
  });

  it('calls onFiltersChange when the Account filter changes', async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(
      <UsersFilters filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} showClear={false} onClear={jest.fn()} />,
    );
    await user.selectOptions(screen.getByTitle(/filter by account/i), 'Business');
    expect(onFiltersChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, account: 'Business' });
  });

  it('hides the Clear filters button when showClear is false', () => {
    render(
      <UsersFilters filters={DEFAULT_FILTERS} onFiltersChange={jest.fn()} showClear={false} onClear={jest.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it('shows and wires the Clear filters button when showClear is true', async () => {
    const user = userEvent.setup();
    const onClear = jest.fn();
    render(
      <UsersFilters filters={DEFAULT_FILTERS} onFiltersChange={jest.fn()} showClear={true} onClear={onClear} />,
    );
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- UsersFilters`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `UsersFilters.tsx`**

Exact copy source: markup lines 1297–1330 (header "Clear filters" button + search bar + 3 selects).

```tsx
// src/components/admin/users/UsersFilters.tsx
'use client';

import { useTranslation } from 'react-i18next';

import type { UserFilters } from '@/lib/admin/users-table';

import { IconClose, IconSearch } from '../icons';

interface UsersFiltersProps {
  filters: UserFilters;
  onFiltersChange: (next: UserFilters) => void;
  showClear: boolean;
  onClear: () => void;
}

export function UsersFilters({ filters, onFiltersChange, showClear, onClear }: UsersFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <div
        className="flex min-w-[300px] max-w-[360px] flex-1 items-center gap-2 rounded-[10px] border px-3 py-1.5 text-[13px]"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
      >
        <IconSearch size={16} />
        <input
          value={filters.query}
          onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
          placeholder={t('admin.users.searchPlaceholder')}
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      <select
        value={filters.account}
        onChange={(e) => onFiltersChange({ ...filters, account: e.target.value as UserFilters['account'] })}
        title={t('admin.users.filterByAccount')}
        className="min-w-[150px] cursor-pointer appearance-none rounded-lg border px-3 py-2 text-[13px]"
        style={{
          borderColor: filters.account === 'all' ? 'var(--border-subtle)' : 'var(--brand-500)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="all">{t('admin.users.allAccounts')}</option>
        <option value="Personal">Personal</option>
        <option value="Business">Business</option>
      </select>

      <select
        value={filters.plan}
        onChange={(e) => onFiltersChange({ ...filters, plan: e.target.value as UserFilters['plan'] })}
        title={t('admin.users.filterByPlan')}
        className="min-w-[150px] cursor-pointer appearance-none rounded-lg border px-3 py-2 text-[13px]"
        style={{
          borderColor: filters.plan === 'all' ? 'var(--border-subtle)' : 'var(--brand-500)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="all">{t('admin.users.allPlans')}</option>
        <option value="Free trial">Free trial</option>
        <option value="Freemium">Freemium</option>
        <option value="Premium">Premium</option>
      </select>

      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as UserFilters['status'] })}
        title={t('admin.users.filterByStatus')}
        className="min-w-[150px] cursor-pointer appearance-none rounded-lg border px-3 py-2 text-[13px]"
        style={{
          borderColor: filters.status === 'all' ? 'var(--border-subtle)' : 'var(--brand-500)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="all">{t('admin.users.allStatuses')}</option>
        <option value="Active">Active</option>
        <option value="Deactivated">Deactivated</option>
        <option value="Deleted">Deleted</option>
      </select>

      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-[10px] border px-4 py-3 text-sm font-medium"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        >
          <IconClose size={18} />
          {t('admin.users.clearFilters')}
        </button>
      )}
    </div>
  );
}
```

Note: the source's "Clear filters" button lives in the screen's title row (markup 1292–1301), not next to the filters row — but functionally/visually it's a control alongside the filter row's intent; for this port, place it at the end of the filters row as shown above (a minor, deliberate layout simplification — the button's own styling/copy/behavior stays exact). If you'd rather match the source's exact placement (top-right, next to the H1), that's also acceptable — just be consistent with the `UsersFilters` component boundary either way; if you move it, `showClear`/`onClear` move to Task 9's page instead of this component. Pick one and note which in your report.

- [ ] **Step 4: Add the i18n keys used above**

`src/locales/ptBR.json`, inside `admin`, add a new `users` object (create it if `admin.users` doesn't exist yet):

```json
"users": {
  "searchPlaceholder": "Search by name or email...",
  "filterByAccount": "Filter by account",
  "filterByPlan": "Filter by plan",
  "filterByStatus": "Filter by status",
  "allAccounts": "All accounts",
  "allPlans": "All plans",
  "allStatuses": "All statuses",
  "clearFilters": "Clear filters"
}
```

`src/locales/enUS.json` — identical values (already English).

`src/locales/esES.json`:

```json
"users": {
  "searchPlaceholder": "Buscar por nombre o email...",
  "filterByAccount": "Filtrar por cuenta",
  "filterByPlan": "Filtrar por plan",
  "filterByStatus": "Filtrar por estado",
  "allAccounts": "Todas las cuentas",
  "allPlans": "Todos los planes",
  "allStatuses": "Todos los estados",
  "clearFilters": "Limpiar filtros"
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- UsersFilters`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/users/UsersFilters.tsx src/components/admin/users/__tests__/UsersFilters.test.tsx src/locales/*.json
git commit -m "feat: add UsersFilters component"
```

---

## Task 5: `UsersTable` component

**Files:**
- Create: `src/components/admin/users/UsersTable.tsx`
- Test: `src/components/admin/users/__tests__/UsersTable.test.tsx`

**Interfaces:**
- Consumes: `UserRecord` from `@/lib/mocks/admin/users` (Task 2); `SortKey`, `SortDir`, `SORT_COLUMNS` from `@/lib/admin/users-table` (Task 3); `badgeTone` from `@/lib/admin/badge-tone` (Task 1); shadcn `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` from `@/components/ui/table`; `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem` from `@/components/ui/dropdown-menu` (same pattern as Header's notification/profile menus).
- Produces: `<UsersTable users={UserRecord[]} sort={SortState} onSortChange={(key: SortKey) => void} onRowClick={(user: UserRecord) => void} onViewProfile={(user: UserRecord) => void} onResetPassword={(user: UserRecord) => void} onDeactivate={(user: UserRecord) => void} onDelete={(user: UserRecord) => void} />` from `@/components/admin/users/UsersTable`, consumed by Task 9's page.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/users/__tests__/UsersTable.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { UserRecord } from '@/lib/mocks/admin/users';

import { UsersTable } from '../UsersTable';

const users: UserRecord[] = [
  {
    id: 'u1',
    name: 'Camila Duarte',
    email: 'camila@mail.com',
    phone: '',
    location: '',
    bio: '',
    account: 'Business',
    plan: 'Premium',
    followers: '48.3k',
    following: '210',
    joined: '12/03/2025',
    status: 'Active',
    type: 'Creator',
    initials: 'CD',
    avatarColor: '#7F00FF',
  },
  {
    id: 'u2',
    name: 'Rafael Nogueira',
    email: 'rafael@mail.com',
    phone: '',
    location: '',
    bio: '',
    account: 'Personal',
    plan: 'Freemium',
    followers: '312',
    following: '89',
    joined: '20/08/2026',
    status: 'Deactivated',
    type: 'User',
    initials: 'RN',
    avatarColor: '#1A8245',
  },
];

describe('UsersTable', () => {
  it('renders every user row with name, email, account, plan, followers, joined, status', () => {
    render(
      <UsersTable
        users={users}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Camila Duarte')).toBeInTheDocument();
    expect(screen.getByText('camila@mail.com')).toBeInTheDocument();
    expect(screen.getByText('48.3k')).toBeInTheDocument();
    expect(screen.getByText('Rafael Nogueira')).toBeInTheDocument();
  });

  it('calls onSortChange with the column key when a sortable header is clicked', async () => {
    const user = userEvent.setup();
    const onSortChange = jest.fn();
    render(
      <UsersTable
        users={users}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={onSortChange}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    await user.click(screen.getByText('Followers'));
    expect(onSortChange).toHaveBeenCalledWith('followers');
  });

  it('calls onRowClick with the clicked user', async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();
    render(
      <UsersTable
        users={users}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={onRowClick}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    await user.click(screen.getByText('Camila Duarte'));
    expect(onRowClick).toHaveBeenCalledWith(users[0]);
  });

  it('opens the kebab menu with its 4 actions and wires Reset password', async () => {
    const user = userEvent.setup();
    const onResetPassword = jest.fn();
    render(
      <UsersTable
        users={users}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={onResetPassword}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const menuButtons = screen.getAllByRole('button', { name: /actions for/i });
    await user.click(menuButtons[0]);
    expect(screen.getByText('View profile')).toBeInTheDocument();
    expect(screen.getByText('Reset password')).toBeInTheDocument();
    expect(screen.getByText('Deactivate account')).toBeInTheDocument();
    expect(screen.getByText('Delete account')).toBeInTheDocument();
    await user.click(screen.getByText('Reset password'));
    expect(onResetPassword).toHaveBeenCalledWith(users[0]);
  });

  it('shows "Reactivate account" for a Deactivated user', async () => {
    const user = userEvent.setup();
    render(
      <UsersTable
        users={users}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const menuButtons = screen.getAllByRole('button', { name: /actions for/i });
    await user.click(menuButtons[1]); // Rafael, Deactivated
    expect(screen.getByText('Reactivate account')).toBeInTheDocument();
  });

  it('renders the empty state when there are no users', () => {
    render(
      <UsersTable
        users={[]}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('No user found')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- UsersTable`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `UsersTable.tsx`**

Source: markup 1331–1396 (table, footer, pager, empty state); `usersColumns`/`usersFooterText`/`usersPager` (script 5952–6022, quoted in the spec).

```tsx
// src/components/admin/users/UsersTable.tsx
'use client';

import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { badgeTone } from '@/lib/admin/badge-tone';
import { type SortKey, type SortState, SORT_COLUMNS } from '@/lib/admin/users-table';
import type { UserRecord } from '@/lib/mocks/admin/users';

const COLUMN_LABELS: Record<SortKey, string> = {
  name: 'Name',
  account: 'Account',
  plan: 'Plan',
  followers: 'Followers',
  joined: 'Joined',
  status: 'Status',
};

interface UsersTableProps {
  users: UserRecord[];
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  onRowClick: (user: UserRecord) => void;
  onViewProfile: (user: UserRecord) => void;
  onResetPassword: (user: UserRecord) => void;
  onDeactivate: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
}

function sortArrow(sort: SortState, key: SortKey): string {
  if (sort.key !== key) return '';
  return sort.dir === 'asc' ? '▲' : '▼';
}

export function UsersTable({
  users,
  sort,
  onSortChange,
  onRowClick,
  onViewProfile,
  onResetPassword,
  onDeactivate,
  onDelete,
}: UsersTableProps) {
  const { t } = useTranslation();

  return (
    <div
      className="overflow-x-auto rounded-[14px] border"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      {users.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {SORT_COLUMNS.map(({ key }) => (
                  <TableHead
                    key={key}
                    onClick={() => onSortChange(key)}
                    className="cursor-pointer select-none"
                    style={{ color: sort.key === key ? 'var(--brand-600)' : 'var(--text-secondary)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {COLUMN_LABELS[key]}
                      <span className="text-[9px]">{sortArrow(sort, key)}</span>
                    </span>
                  </TableHead>
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const acctTone = badgeTone(u.account === 'Business' ? 'Creator' : 'User');
                const statusTone = badgeTone(u.status);
                return (
                  <TableRow key={u.id} onClick={() => onRowClick(u)} className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                          style={{ background: u.avatarColor }}
                        >
                          {u.initials}
                        </div>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ color: acctTone.color, background: acctTone.background }}
                      >
                        {u.account === 'Business' ? 'Creator' : 'User'}
                      </span>
                    </TableCell>
                    <TableCell>{u.plan}</TableCell>
                    <TableCell className="tabular-nums">{u.followers}</TableCell>
                    <TableCell className="tabular-nums">{u.joined}</TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ color: statusTone.color, background: statusTone.background }}
                      >
                        {u.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Actions for ${u.name}`}
                            className="rounded-md p-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <svg viewBox="0 0 24 24" width={18} height={18} stroke="currentColor" fill="none" strokeWidth={1.6}>
                              <circle cx="5" cy="12" r="1.3" />
                              <circle cx="12" cy="12" r="1.3" />
                              <circle cx="19" cy="12" r="1.3" />
                            </svg>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onViewProfile(u)}>View profile</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onResetPassword(u)}>Reset password</DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onDeactivate(u)}
                            style={{ color: 'var(--warning)' }}
                          >
                            {u.status === 'Deactivated' ? 'Reactivate account' : 'Deactivate account'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onDelete(u)} style={{ color: 'var(--danger)' }}>
                            Delete account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div
            className="flex items-center justify-between border-t px-4 py-3 text-[13px]"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <span>{t('admin.users.footerText', { count: users.length })}</span>
            <div className="flex gap-1">
              {['‹', '1', '2', '3', '›'].map((label, i) => (
                <button
                  key={i}
                  type="button"
                  className="h-7 w-7 rounded-md border"
                  style={{
                    borderColor: i === 1 ? 'transparent' : 'var(--border-subtle)',
                    background: i === 1 ? 'var(--brand-100)' : 'transparent',
                    color: i === 1 ? 'var(--brand-600)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center" style={{ color: 'var(--text-secondary)' }}>
          <div
            className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full"
            style={{ background: 'var(--bg-surface)' }}
          >
            <svg viewBox="0 0 24 24" width={20} height={20} stroke="currentColor" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-5.4l-1.6 3H9l-1.6-3H2" />
              <path d="M5.5 5h13l3.5 7v7a2 2 0 01-2 2H4a2 2 0 01-2-2v-7z" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('admin.users.emptyTitle')}
          </h3>
          <p className="max-w-[340px] text-[13.5px]">{t('admin.users.emptyDescription')}</p>
        </div>
      )}
    </div>
  );
}
```

Note: `usersFooterText` in the source is the literal fake string
`'Showing 1–' + N + ' de 3.482 accounts'` — port it via the i18n key
`admin.users.footerText` with an interpolated `{{count}}` and the literal
fake total baked into the translation string itself (see Step 4 below),
keeping the exact "de" (not "of") wording from the source.

- [ ] **Step 4: Add the i18n keys used above**

`src/locales/ptBR.json` and `src/locales/enUS.json`, inside `admin.users` (append to the object from Task 4):

```json
"footerText": "Showing 1–{{count}} de 3.482 accounts",
"emptyTitle": "No user found",
"emptyDescription": "Try searching for another name or email."
```

`src/locales/esES.json`, inside `admin.users`:

```json
"footerText": "Mostrando 1–{{count}} de 3.482 cuentas",
"emptyTitle": "Ningún usuario encontrado",
"emptyDescription": "Intenta buscar por otro nombre o email."
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- UsersTable`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/users/UsersTable.tsx src/components/admin/users/__tests__/UsersTable.test.tsx src/locales/*.json
git commit -m "feat: add UsersTable component"
```

---

## Task 6: `DrawerBlocks` renderer

**Files:**
- Create: `src/components/admin/drawer/DrawerBlocks.tsx`
- Test: `src/components/admin/drawer/__tests__/DrawerBlocks.test.tsx`

**Interfaces:**
- Produces (from `@/components/admin/drawer/DrawerBlocks`, consumed by Task 7):
  ```ts
  export type DrawerBlock =
    | { kind: 'kv'; label: string; value: string; badge?: boolean; toneColor?: string; toneBackground?: string; numeric?: boolean }
    | { kind: 'table'; columns: string[]; rows: Array<{ cells: Array<{ text: string; badge?: boolean; toneColor?: string; toneBackground?: string; numeric?: boolean; maxWidth?: string }> }> }
    | { kind: 'timeline'; events: Array<{ title: string; time: string }> }
    | { kind: 'empty'; title: string; description: string };
  ```
  `<DrawerBlocks blocks={DrawerBlock[]} />` — this only implements the 4 block kinds this screen's tabs actually use (`kv` for Subscriptions, `table` for Reports, `timeline` for History, `empty` as the shared fallback for all three) — see the spec's fidelity note on the other 7 block kinds the source defines (`isCover`/`isText`/`isPeople`/`isHead`/`isInput`/`isTextarea`/`isPair`/`isReporter`/`isLocked`/`isToggle`) that no tab this screen builds needs; don't implement them here, extend this component later when a screen that needs them gets built.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/drawer/__tests__/DrawerBlocks.test.tsx
import { render, screen } from '@testing-library/react';

import { DrawerBlocks, type DrawerBlock } from '../DrawerBlocks';

describe('DrawerBlocks', () => {
  it('renders a kv block as a label/value row', () => {
    const blocks: DrawerBlock[] = [{ kind: 'kv', label: 'Plan', value: 'Premium' }];
    render(<DrawerBlocks blocks={blocks} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('renders a kv block value as a badge when badge is true', () => {
    const blocks: DrawerBlock[] = [
      { kind: 'kv', label: 'Status', value: 'Active', badge: true, toneColor: 'var(--success)', toneBackground: 'var(--success-bg)' },
    ];
    render(<DrawerBlocks blocks={blocks} />);
    const badge = screen.getByText('Active');
    expect(badge).toHaveStyle({ color: 'var(--success)' });
  });

  it('renders a table block with columns and rows', () => {
    const blocks: DrawerBlock[] = [
      {
        kind: 'table',
        columns: ['Type', 'Reason'],
        rows: [{ cells: [{ text: 'Received' }, { text: 'Spam' }] }],
      },
    ];
    render(<DrawerBlocks blocks={blocks} />);
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Received')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument();
  });

  it('renders a timeline block as a list of title/time events', () => {
    const blocks: DrawerBlock[] = [
      { kind: 'timeline', events: [{ title: 'Account created', time: '01 Jan 2026' }] },
    ];
    render(<DrawerBlocks blocks={blocks} />);
    expect(screen.getByText('Account created')).toBeInTheDocument();
    expect(screen.getByText('01 Jan 2026')).toBeInTheDocument();
  });

  it('renders an empty block with title and description', () => {
    const blocks: DrawerBlock[] = [
      { kind: 'empty', title: 'No reports', description: 'Nothing to show yet.' },
    ];
    render(<DrawerBlocks blocks={blocks} />);
    expect(screen.getByText('No reports')).toBeInTheDocument();
    expect(screen.getByText('Nothing to show yet.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DrawerBlocks`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `DrawerBlocks.tsx`**

Source: markup 3060–3141 (`isKv`/`isTable`/`isTimeline`/`isEmpty` branches of the generic blocks renderer).

```tsx
// src/components/admin/drawer/DrawerBlocks.tsx
export type DrawerBlock =
  | { kind: 'kv'; label: string; value: string; badge?: boolean; toneColor?: string; toneBackground?: string; numeric?: boolean }
  | {
      kind: 'table';
      columns: string[];
      rows: Array<{
        cells: Array<{ text: string; badge?: boolean; toneColor?: string; toneBackground?: string; numeric?: boolean; maxWidth?: string }>;
      }>;
    }
  | { kind: 'timeline'; events: Array<{ title: string; time: string }> }
  | { kind: 'empty'; title: string; description: string };

function KvBlock({ block }: { block: Extract<DrawerBlock, { kind: 'kv' }> }) {
  return (
    <div
      className="flex justify-between gap-4 border-b py-2.5 text-[13.5px]"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div style={{ color: 'var(--text-secondary)' }}>{block.label}</div>
      <div className="text-right">
        {block.badge ? (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ color: block.toneColor, background: block.toneBackground }}
          >
            {block.value}
          </span>
        ) : (
          <span className={block.numeric ? 'tabular-nums' : undefined}>{block.value}</span>
        )}
      </div>
    </div>
  );
}

function TableBlock({ block }: { block: Extract<DrawerBlock, { kind: 'table' }> }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {block.columns.map((col) => (
            <th
              key={col}
              className="whitespace-nowrap border-b px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, i) => (
          <tr key={i}>
            {row.cells.map((cell, j) => (
              <td
                key={j}
                className="border-b px-3 py-2.5 align-middle text-[13px]"
                style={{ borderColor: 'var(--border-subtle)', maxWidth: cell.maxWidth }}
              >
                {cell.badge ? (
                  <span
                    className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ color: cell.toneColor, background: cell.toneBackground }}
                  >
                    {cell.text}
                  </span>
                ) : (
                  <span className={cell.numeric ? 'tabular-nums' : undefined}>{cell.text}</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TimelineBlock({ block }: { block: Extract<DrawerBlock, { kind: 'timeline' }> }) {
  return (
    <div>
      {block.events.map((e, i) => (
        <div key={i} className="flex gap-3 pb-4.5">
          <div className="flex flex-col items-center">
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: 'var(--brand-500)' }} />
            <div className="mt-1 w-px flex-1" style={{ background: 'var(--border-subtle)' }} />
          </div>
          <div>
            <div className="text-sm font-medium">{e.title}</div>
            <div className="tabular-nums text-xs" style={{ color: 'var(--text-secondary)' }}>
              {e.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBlock({ block }: { block: Extract<DrawerBlock, { kind: 'empty' }> }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
      <div
        className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{ background: 'var(--bg-surface)' }}
      >
        <svg viewBox="0 0 24 24" width={20} height={20} stroke="currentColor" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-5.4l-1.6 3H9l-1.6-3H2" />
          <path d="M5.5 5h13l3.5 7v7a2 2 0 01-2 2H4a2 2 0 01-2-2v-7z" />
        </svg>
      </div>
      <h3 className="mb-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        {block.title}
      </h3>
      <p className="max-w-[320px] text-[13px]">{block.description}</p>
    </div>
  );
}

export function DrawerBlocks({ blocks }: { blocks: DrawerBlock[] }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'kv':
            return <KvBlock key={i} block={block} />;
          case 'table':
            return <TableBlock key={i} block={block} />;
          case 'timeline':
            return <TimelineBlock key={i} block={block} />;
          case 'empty':
            return <EmptyBlock key={i} block={block} />;
        }
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- DrawerBlocks`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/drawer/DrawerBlocks.tsx src/components/admin/drawer/__tests__/DrawerBlocks.test.tsx
git commit -m "feat: add DrawerBlocks generic detail-drawer content renderer"
```

---

## Task 7: `UserDetailDrawer` component

**Files:**
- Create: `src/components/admin/users/UserDetailDrawer.tsx`
- Test: `src/components/admin/users/__tests__/UserDetailDrawer.test.tsx`

**Interfaces:**
- Consumes: `UserRecord` from `@/lib/mocks/admin/users`; `getUserSubscriptions`, `getUserHistory`, `getUserReports` from `@/lib/mocks/admin/users` (Task 2); `badgeTone` from `@/lib/admin/badge-tone` (Task 1); `DrawerBlocks`, `DrawerBlock` from `@/components/admin/drawer/DrawerBlocks` (Task 6); shadcn `Sheet`/`SheetContent` from `@/components/ui/sheet`.
- Produces: `<UserDetailDrawer user={UserRecord | null} onClose={() => void} onSaveProfile={(user: UserRecord, draft: ProfileDraft) => void} />` (exporting `interface ProfileDraft { name: string; email: string; phone: string; location: string; bio: string }`) from `@/components/admin/users/UserDetailDrawer`, consumed by Task 9's page. `user={null}` renders nothing open (controls the Sheet's `open` prop as `user !== null`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/users/__tests__/UserDetailDrawer.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { UserRecord } from '@/lib/mocks/admin/users';

import { UserDetailDrawer } from '../UserDetailDrawer';

const user: UserRecord = {
  id: 'u1',
  name: 'Camila Duarte',
  email: 'camila@mail.com',
  phone: '+55 21 98888-1234',
  location: 'Rio de Janeiro, RJ',
  bio: 'Travel creator.',
  account: 'Business',
  plan: 'Premium',
  followers: '48.3k',
  following: '210',
  joined: '12/03/2025',
  status: 'Active',
  type: 'Creator',
  initials: 'CD',
  avatarColor: '#7F00FF',
};

describe('UserDetailDrawer', () => {
  it('renders nothing reachable when user is null', () => {
    render(<UserDetailDrawer user={null} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    expect(screen.queryByText('Camila Duarte')).not.toBeInTheDocument();
  });

  it('shows the Profile tab by default with contact/account info', () => {
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    expect(screen.getByText('Camila Duarte')).toBeInTheDocument();
    expect(screen.getByText('camila@mail.com')).toBeInTheDocument();
    expect(screen.getByText('Rio de Janeiro, RJ')).toBeInTheDocument();
    expect(screen.getByText('Travel creator.')).toBeInTheDocument();
  });

  it('switches to the Subscriptions tab and shows its content', async () => {
    const uiUser = userEvent.setup();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    // "R$ 39,90/mo" only appears inside the Subscriptions tab's content (the
    // stats bar also shows "Premium", so asserting on that alone wouldn't
    // prove the tab actually switched — it's visible before any click too).
    expect(screen.queryByText('R$ 39,90/mo')).not.toBeInTheDocument();
    await uiUser.click(screen.getByRole('tab', { name: 'Subscriptions' }));
    expect(screen.getByText('R$ 39,90/mo')).toBeInTheDocument();
  });

  it('switches to the Reports tab and shows the empty state for a user with no reports', async () => {
    const uiUser = userEvent.setup();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    await uiUser.click(screen.getByRole('tab', { name: 'Reports' }));
    expect(screen.getByText('No reports')).toBeInTheDocument();
  });

  it('enters edit mode and calls onSaveProfile with the edited draft', async () => {
    const uiUser = userEvent.setup();
    const onSaveProfile = jest.fn();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={onSaveProfile} />);
    await uiUser.click(screen.getByRole('button', { name: /edit profile/i }));
    const nameInput = screen.getByDisplayValue('Camila Duarte');
    await uiUser.clear(nameInput);
    await uiUser.type(nameInput, 'Camila D. Silva');
    await uiUser.click(screen.getByRole('button', { name: /save changes/i }));
    expect(onSaveProfile).toHaveBeenCalledWith(user, expect.objectContaining({ name: 'Camila D. Silva' }));
  });

  it('resets to the Profile tab and exits edit mode when a different user is passed in', async () => {
    const uiUser = userEvent.setup();
    const { rerender } = render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    await uiUser.click(screen.getByRole('tab', { name: 'Subscriptions' }));
    const otherUser: UserRecord = { ...user, id: 'u2', name: 'Rafael Nogueira' };
    rerender(<UserDetailDrawer user={otherUser} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    // Back on the Profile tab by default for the new user — contact info visible again.
    expect(screen.getByText('Rafael Nogueira')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- UserDetailDrawer`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `UserDetailDrawer.tsx`**

Source: shared drawer skeleton markup 2938–3213 (header 2939–2953, stats 2955–2962, tab strip 2964–2976 — only `perfil`/`subscriptions`/`historico`/`denuncias` bound, per the spec — profile view 2979–3029, profile edit 3031–3057, generic blocks 3060–3206 via Task 6's `DrawerBlocks`); `drawerSpec()`'s `d.kind === 'user'` branch (script 3865–3968, quoted in full in the spec) for exactly which fields feed which UI element.

```tsx
// src/components/admin/users/UserDetailDrawer.tsx
'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { badgeTone } from '@/lib/admin/badge-tone';
import { getUserHistory, getUserReports, getUserSubscriptions } from '@/lib/mocks/admin/users';
import type { UserRecord } from '@/lib/mocks/admin/users';

import { DrawerBlocks, type DrawerBlock } from '../drawer/DrawerBlocks';
import { IconClose } from '../icons';

export interface ProfileDraft {
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
}

type TabKey = 'perfil' | 'subscriptions' | 'historico' | 'denuncias';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'perfil', label: 'Profile' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'historico', label: 'History' },
  { key: 'denuncias', label: 'Reports' },
];

function draftFromUser(user: UserRecord): ProfileDraft {
  return { name: user.name, email: user.email, phone: user.phone, location: user.location, bio: user.bio };
}

// `t` is threaded in explicitly (rather than calling useTranslation() here)
// because this is a plain function, not a component or hook — it's only
// ever called from inside UserDetailDrawer's render, which already has `t`
// from its own useTranslation() call.
function tabBlocks(user: UserRecord, tab: TabKey, t: (key: string, opts?: Record<string, unknown>) => string): DrawerBlock[] {
  if (tab === 'subscriptions') {
    const subs = getUserSubscriptions(user.id);
    if (!subs.length) {
      return [
        {
          kind: 'empty',
          title: t('admin.users.drawer.noSubscriptionTitle'),
          description: t('admin.users.drawer.noSubscriptionDescription'),
        },
      ];
    }
    return subs.flatMap((s): DrawerBlock[] => {
      const tone = badgeTone(s.status);
      return [
        { kind: 'kv', label: t('admin.users.drawer.subPlan'), value: s.plan },
        { kind: 'kv', label: t('admin.users.drawer.subAmount'), value: s.amount, numeric: true },
        { kind: 'kv', label: t('admin.users.drawer.subSince'), value: s.since, numeric: true },
        {
          kind: 'kv',
          label: t('admin.users.drawer.subStatus'),
          value: s.status,
          badge: true,
          toneColor: tone.color,
          toneBackground: tone.background,
        },
      ];
    });
  }
  if (tab === 'historico') {
    const events = getUserHistory(user.id).map((e) => ({ title: e.title, time: e.time }));
    return [{ kind: 'timeline', events }];
  }
  if (tab === 'denuncias') {
    const reports = getUserReports(user.id);
    if (!reports.length) {
      return [
        {
          kind: 'empty',
          title: t('admin.users.drawer.noReportsTitle'),
          description: t('admin.users.drawer.noReportsDescription'),
        },
      ];
    }
    return [
      {
        kind: 'table',
        columns: [
          t('admin.users.drawer.reportType'),
          t('admin.users.drawer.reportReason'),
          t('admin.users.drawer.reportStatus'),
          t('admin.users.drawer.reportDate'),
        ],
        rows: reports.map((r) => {
          const typeTone = badgeTone(r.type, r.type === 'Received' ? 'danger' : 'neutral');
          const statusTone = badgeTone(r.status);
          return {
            cells: [
              { text: r.type, badge: true, toneColor: typeTone.color, toneBackground: typeTone.background },
              { text: r.reason, maxWidth: '180px' },
              { text: r.status, badge: true, toneColor: statusTone.color, toneBackground: statusTone.background },
              { text: r.date, numeric: true },
            ],
          };
        }),
      },
    ];
  }
  return [];
}

interface UserDetailDrawerProps {
  user: UserRecord | null;
  onClose: () => void;
  onSaveProfile: (user: UserRecord, draft: ProfileDraft) => void;
}

export function UserDetailDrawer({ user, onClose, onSaveProfile }: UserDetailDrawerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('perfil');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  useEffect(() => {
    setTab('perfil');
    setEditing(false);
    setDraft(null);
  }, [user?.id]);

  if (!user) {
    return (
      <Sheet open={false} onOpenChange={(open) => !open && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const badge = badgeTone(user.type);
  const currentDraft = draft ?? draftFromUser(user);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full gap-0 p-0 sm:max-w-none"
        style={{ width: '480px', maxWidth: '92vw', background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="flex flex-shrink-0 items-center justify-between gap-3 border-b p-5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
              style={{ background: user.avatarColor }}
            >
              {user.initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{user.name}</span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ color: badge.color, background: badge.background }}
                >
                  {user.type}
                </span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {user.email}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex-shrink-0 rounded-md p-1" style={{ color: 'var(--text-secondary)' }}>
            <IconClose size={18} />
          </button>
        </div>

        <div className="flex gap-2 border-b px-5 pb-5" style={{ borderColor: 'var(--border-subtle)' }}>
          {[
            { label: 'Plan', value: user.plan },
            { label: 'Followers', value: user.followers },
            { label: 'Following', value: user.following },
            { label: 'Status', value: user.status, color: badgeTone(user.status).color },
          ].map((s) => (
            <div key={s.label} className="min-w-0 flex-1">
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {s.label}
              </div>
              <div className="tabular-nums text-sm font-medium" style={{ color: s.color ?? 'inherit' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div role="tablist" className="flex flex-shrink-0 gap-1 overflow-x-auto border-b px-5" style={{ borderColor: 'var(--border-subtle)' }}>
          {TABS.map((tb) => (
            <button
              key={tb.key}
              role="tab"
              aria-selected={tab === tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className="flex-shrink-0 whitespace-nowrap px-3 py-2 text-[13.5px] font-medium"
              style={{
                color: tab === tb.key ? 'var(--brand-500)' : 'var(--text-secondary)',
                borderBottom: `2px solid ${tab === tb.key ? 'var(--brand-500)' : 'transparent'}`,
                marginBottom: '-1px',
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'perfil' ? (
          !editing ? (
            <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 py-6">
              <div>
                <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Contact
                </div>
                {[
                  ['Full name', user.name],
                  ['Email', user.email],
                  ['Phone', user.phone],
                  ['Location', user.location],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 border-b py-2.5 text-[13.5px]" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      {label}
                    </div>
                    <div className="text-right font-medium">{value}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Account
                </div>
                <div className="flex items-center justify-between gap-4 border-b py-2.5 text-[13.5px]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Account type</div>
                  {(() => {
                    const acctTone = badgeTone(user.account === 'Business' ? 'Creator' : 'User');
                    return (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ color: acctTone.color, background: acctTone.background }}
                      >
                        {user.account === 'Business' ? 'Creator' : 'User'}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b py-2.5 text-[13.5px]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Plan</div>
                  <div className="text-right font-medium">{user.plan}</div>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b py-2.5 text-[13.5px]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Joined on</div>
                  <div className="tabular-nums text-right font-medium">{user.joined}</div>
                </div>
                <div className="flex items-center justify-between gap-4 border-b py-2.5 text-[13.5px]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Status</div>
                  {(() => {
                    const statusTone = badgeTone(user.status);
                    return (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ color: statusTone.color, background: statusTone.background }}
                      >
                        {user.status}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Bio
                </div>
                <div className="text-[13.5px] leading-relaxed">{user.bio || 'No bio added.'}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDraft(draftFromUser(user));
                  setEditing(true);
                }}
                className="inline-flex w-fit items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[13.5px] font-medium"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                Edit profile
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4.5 overflow-y-auto px-6 py-6">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Edit profile
              </div>
              {(
                [
                  ['name', 'Full name'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                  ['location', 'Location'],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                  </label>
                  <input
                    value={currentDraft[field]}
                    onChange={(e) => setDraft({ ...currentDraft, [field]: e.target.value })}
                    className="rounded-[10px] border px-3 py-2.5 text-[13.5px] outline-none"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Bio
                </label>
                <textarea
                  value={currentDraft.bio}
                  onChange={(e) => setDraft({ ...currentDraft, bio: e.target.value })}
                  rows={4}
                  className="resize-y rounded-[10px] border px-3 py-2.5 text-[13.5px] outline-none"
                  style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onSaveProfile(user, currentDraft);
                    setEditing(false);
                  }}
                  className="inline-flex items-center rounded-[10px] px-4.5 py-2.5 text-[13.5px] font-semibold text-white"
                  style={{ background: 'var(--brand-500)' }}
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center rounded-[10px] border px-4.5 py-2.5 text-[13.5px] font-medium"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        ) : (
          <DrawerBlocks blocks={tabBlocks(user, tab, t)} />
        )}
      </SheetContent>
    </Sheet>
  );
}
```

Notes:
- `tabBlocks()` above already routes its strings through the `t` parameter
  you pass it (`tabBlocks(user, tab, t)`) — that part is done. The REST of
  this component's JSX (the header/stats/tabs/profile-view/profile-edit
  markup — Contact/Account/Bio section labels, field labels, tab labels,
  button text like "Edit profile"/"Save changes"/"Cancel") is left as
  literal English strings matching the reference exactly in the code
  above; **wrap every one of those in `t('admin.users.drawer.<key>')`
  using the keys defined in Step 4 below**, the same way every other
  Phase 1 component does it. The code above omits those `t()` calls on
  purpose so you can see the literal source text next to each key you're
  about to wrap it with — don't skip this, it's easy to miss when a code
  block is this long.
- The `Sheet`/`SheetContent` combination when `user === null` renders `open={false}`, so nothing is visible — this satisfies the "renders nothing reachable when user is null" test without needing a separate early return that skips mounting `Sheet` entirely (mounting it closed is fine and is how you'd want it to unmount cleanly if it was open a moment ago).
- Uses shadcn `SheetContent`'s own built-in close (X icon, top-right corner) AND this drawer's custom close button in the header row — that's a duplicate. Remove shadcn's default one for this drawer specifically: check `SheetContent`'s implementation (`src/components/ui/sheet.tsx`) — if it unconditionally renders `<SheetPrimitive.Close>`, you have two close affordances stacked in the corner. Resolve this by NOT rendering your own header close button and letting shadcn's default serve that role (delete the `<button onClick={onClose}>` in the header above, keep the title/badge/sub only) — simpler than patching the shared `sheet.tsx` for one screen. Note whichever choice you make in your report.

- [ ] **Step 4: Add the i18n keys used above**

Add a nested `drawer` object inside `admin.users` in all three locale files. `src/locales/ptBR.json` and `enUS.json` (identical, source text is English):

```json
"drawer": {
  "tabProfile": "Profile",
  "tabSubscriptions": "Subscriptions",
  "tabHistory": "History",
  "tabReports": "Reports",
  "statPlan": "Plan",
  "statFollowers": "Followers",
  "statFollowing": "Following",
  "statStatus": "Status",
  "contactSection": "Contact",
  "fullName": "Full name",
  "email": "Email",
  "phone": "Phone",
  "location": "Location",
  "accountSection": "Account",
  "accountType": "Account type",
  "plan": "Plan",
  "joinedOn": "Joined on",
  "status": "Status",
  "bioSection": "Bio",
  "noBio": "No bio added.",
  "editProfile": "Edit profile",
  "editProfileTitle": "Edit profile",
  "saveChanges": "Save changes",
  "cancel": "Cancel",
  "noSubscriptionTitle": "No active subscription",
  "noSubscriptionDescription": "This user is currently on the free plan.",
  "noReportsTitle": "No reports",
  "noReportsDescription": "This user has no reports filed or received.",
  "subPlan": "Plan",
  "subAmount": "Amount",
  "subSince": "Subscriber since",
  "subStatus": "Status",
  "reportType": "Type",
  "reportReason": "Reason",
  "reportStatus": "Status",
  "reportDate": "Date"
}
```

`src/locales/esES.json`:

```json
"drawer": {
  "tabProfile": "Perfil",
  "tabSubscriptions": "Suscripciones",
  "tabHistory": "Historial",
  "tabReports": "Reportes",
  "statPlan": "Plan",
  "statFollowers": "Seguidores",
  "statFollowing": "Siguiendo",
  "statStatus": "Estado",
  "contactSection": "Contacto",
  "fullName": "Nombre completo",
  "email": "Email",
  "phone": "Teléfono",
  "location": "Ubicación",
  "accountSection": "Cuenta",
  "accountType": "Tipo de cuenta",
  "plan": "Plan",
  "joinedOn": "Se unió el",
  "status": "Estado",
  "bioSection": "Biografía",
  "noBio": "Sin biografía.",
  "editProfile": "Editar perfil",
  "editProfileTitle": "Editar perfil",
  "saveChanges": "Guardar cambios",
  "cancel": "Cancelar",
  "noSubscriptionTitle": "Sin suscripción activa",
  "noSubscriptionDescription": "Este usuario está actualmente en el plan gratuito.",
  "noReportsTitle": "Sin reportes",
  "noReportsDescription": "Este usuario no tiene reportes presentados ni recibidos.",
  "subPlan": "Plan",
  "subAmount": "Monto",
  "subSince": "Suscriptor desde",
  "subStatus": "Estado",
  "reportType": "Tipo",
  "reportReason": "Motivo",
  "reportStatus": "Estado",
  "reportDate": "Fecha"
}
```

Go back through the header/stats/tabs/profile JSX written in Step 3 (not
`tabBlocks()`, which already takes `t` as a parameter and uses it) and
replace every literal UI-chrome string with
`t('admin.users.drawer.<matchingKey>')`, using the keys defined above.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- UserDetailDrawer`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/users/UserDetailDrawer.tsx src/components/admin/users/__tests__/UserDetailDrawer.test.tsx src/locales/*.json
git commit -m "feat: add UserDetailDrawer component"
```

---

## Task 8: `ResetPasswordDialog` component

**Files:**
- Create: `src/components/admin/users/ResetPasswordDialog.tsx`
- Test: `src/components/admin/users/__tests__/ResetPasswordDialog.test.tsx`

**Interfaces:**
- Consumes: shadcn `Dialog`/`DialogContent` from `@/components/ui/dialog`; `toast` from `sonner`.
- Produces: `<ResetPasswordDialog target={{ name: string; email: string; phone: string } | null} onClose={() => void} />` from `@/components/admin/users/ResetPasswordDialog`, consumed by Task 9's page. `target={null}` closes the dialog.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/users/__tests__/ResetPasswordDialog.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ResetPasswordDialog } from '../ResetPasswordDialog';

const target = { name: 'Camila Duarte', email: 'camila@mail.com', phone: '+55 21 98888-1234' };

describe('ResetPasswordDialog', () => {
  it('renders nothing reachable when target is null', () => {
    render(<ResetPasswordDialog target={null} onClose={jest.fn()} />);
    expect(screen.queryByText(/reset password/i)).not.toBeInTheDocument();
  });

  it('shows the target name and email channel by default', () => {
    render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
    expect(screen.getByText(/camila duarte/i)).toBeInTheDocument();
    expect(screen.getByText('camila@mail.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send email link/i })).toBeInTheDocument();
  });

  it('switches the send button label when SMS is picked', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
    await user.click(screen.getByText('SMS'));
    expect(screen.getByRole('button', { name: /send sms link/i })).toBeInTheDocument();
  });

  it('closes and calls onClose on a valid send', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ResetPasswordDialog target={target} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /send email link/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close and switches the email field to edit mode on an invalid email', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ResetPasswordDialog target={{ ...target, email: '' }} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /send email link/i }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('name@mail.com')).toBeInTheDocument();
  });

  it('closes on Cancel', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ResetPasswordDialog target={target} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ResetPasswordDialog`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `ResetPasswordDialog.tsx`**

Source: markup 2877–2920, `pwd` view-model (script 6303–6365, quoted in full in the spec — port the validation/edit/send logic exactly, simplified to local component state instead of page-level `pwdReset`/`pwdVia`/`pwdEditing`/`pwdDraft` state, since this component owns its own lifecycle between `target` changes).

```tsx
// src/components/admin/users/ResetPasswordDialog.tsx
'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ResetPasswordTarget {
  name: string;
  email: string;
  phone: string;
}

interface ResetPasswordDialogProps {
  target: ResetPasswordTarget | null;
  onClose: () => void;
}

type Channel = 'email' | 'phone';

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

function isValid(channel: Channel, value: string): boolean {
  if (channel === 'email') return EMAIL_RE.test(value);
  return value.replace(/\D/g, '').length >= 8;
}

export function ResetPasswordDialog({ target, onClose }: ResetPasswordDialogProps) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState<Channel>('email');
  const [editing, setEditing] = useState<Channel | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');

  useEffect(() => {
    setChannel('email');
    setEditing(null);
    setEmailDraft(target?.email ?? '');
    setPhoneDraft(target?.phone ?? '');
  }, [target?.email, target?.phone]);

  if (!target) {
    return (
      <Dialog open={false} onOpenChange={(open) => !open && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const emailOk = isValid('email', emailDraft);
  const phoneOk = isValid('phone', phoneDraft);

  function startEdit(ch: Channel) {
    setEditing((cur) => (cur === ch ? null : ch));
    setChannel(ch);
  }

  function handleSend() {
    const ok = channel === 'phone' ? phoneOk : emailOk;
    const dest = channel === 'phone' ? phoneDraft : emailDraft;
    if (!ok) {
      setEditing(channel);
      toast.error(
        t(channel === 'phone' ? 'admin.users.resetPassword.invalidPhoneTitle' : 'admin.users.resetPassword.invalidEmailTitle'),
        {
          description: dest
            ? t('admin.users.resetPassword.invalidHint')
            : t('admin.users.resetPassword.missingHint'),
        },
      );
      return;
    }
    toast.success(t('admin.users.resetPassword.sentTitle'), {
      description: t('admin.users.resetPassword.sentDescription', { destination: dest }),
    });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[440px] gap-0 overflow-hidden p-0"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="p-6 pb-0">
          <div className="text-[17px] font-semibold tracking-tight">{t('admin.users.resetPassword.title')}</div>
          <div className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.users.resetPassword.subtitle', { name: target.name })}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-6 pb-1 pt-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.users.resetPassword.sendLinkTo')}
          </div>

          <div
            onClick={() => setChannel('email')}
            className="flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3"
            style={{
              borderColor: channel === 'email' ? 'var(--brand-500)' : 'var(--border-subtle)',
              background: channel === 'email' ? 'var(--brand-100)' : 'var(--bg-elevated)',
            }}
          >
            <span
              className="h-4 w-4 flex-shrink-0 rounded-full"
              style={{
                border: channel === 'email' ? '5px solid var(--brand-500)' : '1.5px solid var(--border-strong)',
                background: channel === 'email' ? 'var(--bg-elevated)' : 'transparent',
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium">{t('admin.users.resetPassword.email')}</span>
              {editing === 'email' ? (
                <input
                  autoFocus
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="name@mail.com"
                  className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none"
                  style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              ) : (
                <span className="block text-[12.5px]" style={{ color: emailOk ? 'var(--text-secondary)' : 'var(--danger)' }}>
                  {emailDraft || t('admin.users.resetPassword.noEmail')}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startEdit('email');
              }}
              className="flex-shrink-0 rounded-md p-1"
              style={{ color: emailOk ? 'var(--text-secondary)' : 'var(--danger)' }}
            >
              <svg viewBox="0 0 24 24" width={15} height={15} stroke="currentColor" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h4l10-10-4-4L4 16z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            </button>
          </div>

          <div
            onClick={() => setChannel('phone')}
            className="flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3"
            style={{
              borderColor: channel === 'phone' ? 'var(--brand-500)' : 'var(--border-subtle)',
              background: channel === 'phone' ? 'var(--brand-100)' : 'var(--bg-elevated)',
            }}
          >
            <span
              className="h-4 w-4 flex-shrink-0 rounded-full"
              style={{
                border: channel === 'phone' ? '5px solid var(--brand-500)' : '1.5px solid var(--border-strong)',
                background: channel === 'phone' ? 'var(--bg-elevated)' : 'transparent',
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium">{t('admin.users.resetPassword.sms')}</span>
              {editing === 'phone' ? (
                <input
                  autoFocus
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="+55 00 00000-0000"
                  className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none"
                  style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              ) : (
                <span className="tabular-nums block text-[12.5px]" style={{ color: phoneOk ? 'var(--text-secondary)' : 'var(--danger)' }}>
                  {phoneDraft || t('admin.users.resetPassword.noPhone')}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startEdit('phone');
              }}
              className="flex-shrink-0 rounded-md p-1"
              style={{ color: phoneOk ? 'var(--text-secondary)' : 'var(--danger)' }}
            >
              <svg viewBox="0 0 24 24" width={15} height={15} stroke="currentColor" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h4l10-10-4-4L4 16z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="mx-6 mt-4 flex items-start gap-2.5 rounded-[10px] px-3.5 py-2.5 text-xs leading-relaxed"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
        >
          <svg viewBox="0 0 24 24" width={14} height={14} className="mt-0.5 flex-shrink-0" stroke="currentColor" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v5h1" />
          </svg>
          {t('admin.users.resetPassword.expiryNote')}
        </div>

        <div className="flex justify-end gap-2.5 p-6 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-[10px] border px-4.5 py-2.5 text-[13.5px] font-medium"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {t('admin.users.resetPassword.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="inline-flex items-center rounded-[10px] px-4.5 py-2.5 text-[13.5px] font-semibold text-white"
            style={{ background: 'var(--brand-500)' }}
          >
            {channel === 'phone' ? t('admin.users.resetPassword.sendSms') : t('admin.users.resetPassword.sendEmail')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Add the i18n keys used above**

`src/locales/ptBR.json` and `enUS.json`, inside `admin.users`, add:

```json
"resetPassword": {
  "title": "Reset password",
  "subtitle": "Send {{name}} a reset link. They open it to set a new password and get back into the app.",
  "sendLinkTo": "Send link to",
  "email": "Email",
  "sms": "SMS",
  "noEmail": "No email on file",
  "noPhone": "No phone on file",
  "expiryNote": "The link expires in 60 minutes and can only be used once.",
  "cancel": "Cancel",
  "sendEmail": "Send email link",
  "sendSms": "Send SMS link",
  "invalidEmailTitle": "Check the email address",
  "invalidPhoneTitle": "Check the phone number",
  "invalidHint": "It doesn’t look valid — edit it before sending.",
  "missingHint": "There’s nothing on file — add it before sending.",
  "sentTitle": "Reset link sent",
  "sentDescription": "A password reset link was sent to {{destination}}."
}
```

`src/locales/esES.json`:

```json
"resetPassword": {
  "title": "Restablecer contraseña",
  "subtitle": "Envía a {{name}} un enlace de restablecimiento. Lo abre para definir una nueva contraseña y volver a entrar.",
  "sendLinkTo": "Enviar enlace a",
  "email": "Email",
  "sms": "SMS",
  "noEmail": "Sin email registrado",
  "noPhone": "Sin teléfono registrado",
  "expiryNote": "El enlace expira en 60 minutos y solo puede usarse una vez.",
  "cancel": "Cancelar",
  "sendEmail": "Enviar enlace por email",
  "sendSms": "Enviar enlace por SMS",
  "invalidEmailTitle": "Revisa el email",
  "invalidPhoneTitle": "Revisa el teléfono",
  "invalidHint": "No parece válido — corrígelo antes de enviar.",
  "missingHint": "No hay nada registrado — agrégalo antes de enviar.",
  "sentTitle": "Enlace enviado",
  "sentDescription": "Se envió un enlace de restablecimiento a {{destination}}."
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ResetPasswordDialog`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/users/ResetPasswordDialog.tsx src/components/admin/users/__tests__/ResetPasswordDialog.test.tsx src/locales/*.json
git commit -m "feat: add ResetPasswordDialog component"
```

---

## Task 9: Users & Creators page

**Files:**
- Create: `src/app/(admin)/users/page.tsx`
- Test: `src/app/(admin)/users/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–8: `getUsers` (`@/lib/mocks/admin/users`), `filterAndSortUsers`/`isAnyFilterActive`/`DEFAULT_FILTERS`/`DEFAULT_SORT`/`SORT_COLUMNS` (`@/lib/admin/users-table`), `UsersFilters`, `UsersTable`, `UserDetailDrawer`, `ResetPasswordDialog`.
- Produces: the rendered `/users` page — leaf of this plan's dependency graph.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/(admin)/users/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UsersPage from '../page';

describe('UsersPage', () => {
  it('renders the heading and every mock user by default', () => {
    render(<UsersPage />);
    expect(screen.getByText('Users & Creators')).toBeInTheDocument();
    expect(screen.getByText('Camila Duarte')).toBeInTheDocument();
    expect(screen.getByText('Thiago Souza')).toBeInTheDocument();
  });

  it('narrows the table when searching', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'camila');
    expect(screen.getByText('Camila Duarte')).toBeInTheDocument();
    expect(screen.queryByText('Thiago Souza')).not.toBeInTheDocument();
  });

  it('toggles sort direction when the same column header is clicked twice', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    const nameOf = (i: number) =>
      screen.getAllByText(
        /^(Camila Duarte|Rafael Nogueira|Priscila Matos|Eduardo Lima|Marina Alves|Diego Fontes|Helena Cardoso|Bruno Tavares|Isabela Ramos|Thiago Souza)$/,
      )[i].textContent;

    await user.click(screen.getByText('Name'));
    expect(nameOf(0)).toBe('Bruno Tavares'); // alphabetically first of the 10 seed names, ascending

    await user.click(screen.getByText('Name'));
    expect(nameOf(0)).toBe('Thiago Souza'); // same column clicked again flips to descending
  });

  it('shows Clear filters only once a filter is active, and resets on click', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'camila');
    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    await user.click(clearButton);
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    expect(screen.getByText('Thiago Souza')).toBeInTheDocument();
  });

  it('opens the drawer with the clicked user and closes it', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await user.click(screen.getByText('Camila Duarte'));
    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '' })); // drawer close icon button
  });

  it('opens the reset-password dialog from the kebab menu', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    const menuButtons = screen.getAllByRole('button', { name: /actions for/i });
    await user.click(menuButtons[0]);
    await user.click(screen.getByText('Reset password'));
    expect(screen.getByText(/send.*a reset link/i)).toBeInTheDocument();
  });
});
```

Note: the third assertion in "opens the drawer..." (clicking a close
button with an empty accessible name) is fragile — if Task 7's drawer
close button ends up with a real `aria-label`, or you kept shadcn's
default `Close` (labelled "Close" via `sr-only` text) instead of a custom
button per that task's note, replace that line with whatever actually
matches your Task 7 implementation (e.g.
`screen.getByRole('button', { name: /close/i })`). The point of this step
is "the drawer can be dismissed from this page," not the exact selector —
adjust it to match Task 7's real output rather than force Task 7 to match
this guess.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- "users/__tests__/page"`
Expected: FAIL (page doesn't exist)

- [ ] **Step 3: Implement the page**

Source: markup 1291–1302 (title row).

```tsx
// src/app/(admin)/users/page.tsx
'use client';

import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import { ResetPasswordDialog } from '@/components/admin/users/ResetPasswordDialog';
import { UserDetailDrawer, type ProfileDraft } from '@/components/admin/users/UserDetailDrawer';
import { UsersFilters } from '@/components/admin/users/UsersFilters';
import { UsersTable } from '@/components/admin/users/UsersTable';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  SORT_COLUMNS,
  filterAndSortUsers,
  isAnyFilterActive,
  type SortKey,
  type UserFilters,
} from '@/lib/admin/users-table';
import { getUsers } from '@/lib/mocks/admin/users';
import type { UserRecord } from '@/lib/mocks/admin/users';

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserRecord[]>(() => getUsers());
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [drawerUser, setDrawerUser] = useState<UserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);

  const visibleUsers = useMemo(() => filterAndSortUsers(users, filters, sort), [users, filters, sort]);
  const clearActive = isAnyFilterActive(filters, sort);

  function handleSortChange(key: SortKey) {
    setSort((cur) => {
      if (cur.key === key) return { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
      const column = SORT_COLUMNS.find((c) => c.key === key)!;
      return { key, dir: column.defaultDir };
    });
  }

  function handleClear() {
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
  }

  function handleDeactivate(user: UserRecord) {
    const reactivating = user.status === 'Deactivated';
    toast.success(
      t('admin.users.toasts.accountUpdatedTitle'),
      { description: t(reactivating ? 'admin.users.toasts.reactivated' : 'admin.users.toasts.deactivated', { name: user.name }) },
    );
  }

  function handleDelete(user: UserRecord) {
    toast.success(t('admin.users.toasts.accountDeletedTitle'), {
      description: t('admin.users.toasts.deleted', { name: user.name }),
    });
  }

  function handleSaveProfile(user: UserRecord, draft: ProfileDraft) {
    setUsers((cur) => cur.map((u) => (u.id === user.id ? { ...u, ...draft } : u)));
    toast.success(t('admin.users.toasts.profileSavedTitle'), {
      description: t('admin.users.toasts.profileSaved', { name: draft.name || user.name }),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.users.title')}</h1>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.users.subtitle')}
          </div>
        </div>
      </div>

      <UsersFilters filters={filters} onFiltersChange={setFilters} showClear={clearActive} onClear={handleClear} />

      <UsersTable
        users={visibleUsers}
        sort={sort}
        onSortChange={handleSortChange}
        onRowClick={(u) => setDrawerUser(u)}
        onViewProfile={(u) => setDrawerUser(u)}
        onResetPassword={(u) => setResetTarget(u)}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
      />

      <UserDetailDrawer user={drawerUser} onClose={() => setDrawerUser(null)} onSaveProfile={handleSaveProfile} />
      <ResetPasswordDialog target={resetTarget} onClose={() => setResetTarget(null)} />
    </div>
  );
}
```

- [ ] **Step 4: Add the remaining i18n keys**

`src/locales/ptBR.json` and `enUS.json`, inside `admin.users`, add:

```json
"title": "Users & Creators",
"subtitle": "Manage accounts, verifications and plans.",
"toasts": {
  "accountUpdatedTitle": "Account updated",
  "reactivated": "{{name}} was reactivated.",
  "deactivated": "{{name}} was deactivated.",
  "accountDeletedTitle": "Account deleted",
  "deleted": "{{name}} was removed from the platform.",
  "profileSavedTitle": "Profile saved",
  "profileSaved": "{{name}}’s profile was updated."
}
```

`src/locales/esES.json`, inside `admin.users`:

```json
"title": "Usuarios y creadores",
"subtitle": "Gestiona cuentas, verificaciones y planes.",
"toasts": {
  "accountUpdatedTitle": "Cuenta actualizada",
  "reactivated": "{{name}} fue reactivada.",
  "deactivated": "{{name}} fue desactivada.",
  "accountDeletedTitle": "Cuenta eliminada",
  "deleted": "{{name}} fue eliminada de la plataforma.",
  "profileSavedTitle": "Perfil guardado",
  "profileSaved": "Se actualizó el perfil de {{name}}."
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- "users/__tests__/page"`
Expected: PASS

- [ ] **Step 6: Run the full test suite, typecheck, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 7: Manual visual verification against the reference**

Run: `npm run dev` (or use the already-running dev server on the port it's bound to), open `/users`. Check: search/filter/sort all work and combine correctly; kebab menu shows all 4 actions with the right Deactivate/Reactivate label; clicking a row and clicking "View profile" both open the drawer on the Profile tab; Subscriptions/History/Reports tabs show real content for at least one user and the faithful empty state for others; Edit profile → change a field → Save changes updates the table row and shows a toast; Reset password dialog validates email/phone and shows success/error toasts; empty state renders when a search matches nothing. Toggle dark mode and confirm every surface/border/text color still reads correctly across the table, drawer, and dialog. Stop the dev server after checking if you started a new one.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(admin)/users" src/locales/*.json
git commit -m "feat: implement Users & Creators screen"
```
