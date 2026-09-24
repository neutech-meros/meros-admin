# Meros Admin Port — Phase 1 (Shell + Overview) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace this repo's generic boilerplate demo with the real Meros Admin: a persistent Sidebar+Header shell and the Overview/Dashboard screen, ported faithfully from `Meros Admin (standalone).html`.

**Architecture:** A new `(admin)` Next.js route group renders an `AdminShell` (Sidebar + Header + Toaster) around every admin page; `/dashboard` is the first (and for this phase, only) page inside it; `/` redirects to `/dashboard`; `/login` is untouched, outside the group. Design tokens, nav structure, icon paths, chart configs and screen content are ported as literal values extracted directly from the source artifact, not re-imagined.

**Tech Stack:** Next.js 15 (App Router) + TypeScript, Tailwind CSS v4, shadcn/ui (`avatar`, `table`, `command`, `sonner` added this phase; `button`, `card`, `dropdown-menu`, `sheet`, `separator` reused), `recharts` (new), `react-i18next`, Jotai (theme), Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-22-meros-admin-port-phase1-design.md`

## Global Constraints

- 100% visual/behavioral fidelity to `Meros Admin (standalone).html` for everything present in that file — exact colors, spacing, copy, dimensions, animation timings. Two named exceptions only: icon artwork not present in the file (substitute closest `lucide-react` icon) and entity data not present in the file (`window.MEROS`/`MEROS_GEO`/`MEROS_SYS` — invent plausible mock data matching the exact field shape the code expects).
- All UI-chrome strings authored directly in a component (headings, buttons, column headers, nav labels, dialog copy, empty states) go through `react-i18next`'s `t()`. The `ptBR` locale value is the literal source text (which is itself mostly English, with a few Portuguese strings like "Alertas importantes" — copy each string in whichever language the source actually uses, do not translate it into Portuguese). `enUS`/`esES` are translations of that literal text. NAV labels specifically use the `navI18nKey()` + `defaultValue` pattern (Task 5) so every NAV item routes through `t()` without requiring translations for screens this phase doesn't build yet.
- Values returned by `src/lib/mocks/**` accessor functions (KPI labels, status strings, alert/notification copy, table row content) are **not** required to go through `t()` in this phase — they stand in for content a future API would supply in whatever locale/shape the backend returns, the same way a buyer's name or an order status is never a UI-chrome string to translate. Components render these values directly (e.g. `kpi.label`, `o.status`).
- No new routes beyond `/`, `/dashboard`, `/login` in this phase. Every other NAV entry renders in the Sidebar (for shell completeness) but its link target does not have to resolve to a real page yet — that's expected and not a bug.
- Follow the existing repo conventions: `'use client'` at the top of interactive components, `@/` path alias, Tailwind + `cn()` from `@/lib/utils` for conditional classes, `.dark` class (not `[data-theme]`) as the dark-mode selector (`tailwind.config.ts` already sets `darkMode: 'class'`).
- Reuse `useTheme()` from `@/hooks/useTheme` (Jotai-backed, persisted) for all theme state — do not introduce a second theme mechanism.

## Review Focus

- **Sidebar collapse persists visual correctness at both widths** — collapsing to 72px must hide labels/chevrons (`display:none`) without breaking icon alignment. The collapsed-group hover flyout is explicitly deferred out of Phase 1 (see Task 6's note) — a collapsed group's sub-items are simply unreachable until a later phase adds it; this is not a Phase 1 review item.
- **Keyboard shortcut conflicts** — ⌘K/Ctrl+K must open the command palette from anywhere on the page (not just when the search box is focused) and Escape must close it; a reasonable person expects this to not fire while typing in an unrelated text field in a way that fights normal typing.
- **Empty/edge states in ported data** — the two grid rows in the source markup (lines 552–557 and 690–693 of the extracted template) render empty in the reference; the port must not invent content for them, and revenue-chart "could not load" error state (`revError`) must be reachable and dismissible, not just decorative dead code.
- **Locale coverage** — every `admin.sidebar.*`, `admin.header.*`, and `admin.dashboard.*` key (the UI-chrome keys, not the intentionally-partial `admin.nav.*` keys — see Global Constraints) must exist in all three locale files (`ptBR`, `enUS`, `esES`) with the same key structure; a key missing from just `enUS`/`esES` silently falls back to the raw key path in `react-i18next` (no `defaultValue` is passed for these) and is easy to miss when adding en/es after doing pt first.
- **Light/dark parity** — every ported color must resolve correctly in both themes via the CSS custom properties (e.g. `var(--text-secondary)`), not a hardcoded light-mode hex baked into a component; verify by toggling theme, not just by reading the code.

---

## Task 1: Design tokens (Meros palette + Poppins)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `src/app/layout.tsx` (swap Geist → Poppins)
- Test: `src/app/__tests__/globals-tokens.test.ts`

**Interfaces:**
- Produces: CSS custom properties `--primary-50..950`, `--grey-50..950`, `--red-50..950`, `--green-50..950`, `--tulip-50..950`, `--bg-canvas`, `--bg-surface`, `--bg-surface-hover`, `--bg-elevated`, `--border-subtle`, `--border-strong`, `--text-primary`, `--text-secondary`, `--text-disabled`, `--brand-500`, `--brand-600`, `--brand-100`, `--success`, `--success-bg`, `--warning`, `--warning-bg`, `--danger`, `--danger-bg`, `--info`, `--info-bg`, `--shadow-xs/sm/md/lg`, `--radius-sm/md/lg/full/input`, `--header-h` — under `:root` (light) and `.dark` (dark), available to every later task via plain CSS (`var(--token-name)`) in inline `style` props or Tailwind arbitrary values.

- [ ] **Step 1: Write the failing test asserting the light-mode tokens exist**

```ts
// src/app/__tests__/globals-tokens.test.ts
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('Meros design tokens in globals.css', () => {
  it('defines the light-mode token values', () => {
    expect(css).toMatch(/--primary-700:\s*#7F00FF/);
    expect(css).toMatch(/--grey-900:\s*#1A1A1A/);
    expect(css).toMatch(/--success:\s*var\(--green-500\)/);
    expect(css).toMatch(/--header-h:\s*64px/);
  });

  it('defines the dark-mode overrides under .dark', () => {
    const darkBlock = css.slice(css.indexOf('.dark'));
    expect(darkBlock).toMatch(/--bg-canvas:\s*var\(--grey-950\)/);
    expect(darkBlock).toMatch(/--brand-500:\s*var\(--primary-400\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- globals-tokens`
Expected: FAIL (tokens not present yet)

- [ ] **Step 3: Add the tokens to `globals.css`**

Add inside the existing `:root { ... }` block (keep all current shadcn tokens, just add these alongside them):

```css
  --primary-50: #f4f0ff;
  --primary-100: #ece4ff;
  --primary-200: #dbcdff;
  --primary-300: #c2a6ff;
  --primary-400: #a57bff;
  --primary-500: #8c3bff;
  --primary-600: #8a4fff;
  --primary-700: #7F00FF;
  --primary-800: #6b0dca;
  --primary-900: #5903af;
  --primary-950: #370077;
  --grey-50: #fafafa;
  --grey-100: #f5f5f5;
  --grey-200: #e6e6e6;
  --grey-300: #d6d6d6;
  --grey-400: #a5a5a5;
  --grey-500: #767676;
  --grey-600: #575757;
  --grey-700: #434343;
  --grey-800: #222222;
  --grey-900: #1A1A1A;
  --grey-950: #0a0a0a;
  --red-50: #fef2f3;
  --red-100: #ffe1e5;
  --red-200: #ffc9cf;
  --red-300: #fea3ae;
  --red-400: #fb6e7f;
  --red-500: #f12f46;
  --red-600: #df2339;
  --red-700: #bc192c;
  --red-800: #9b1928;
  --red-900: #811b27;
  --red-950: #460910;
  --green-50: #f2fbf4;
  --green-100: #e0f8e7;
  --green-200: #c3efcf;
  --green-300: #93e2aa;
  --green-400: #52c879;
  --green-500: #37b05b;
  --green-600: #289148;
  --green-700: #227338;
  --green-800: #205b32;
  --green-900: #1c4b28;
  --green-950: #0a2916;
  --tulip-50: #fcf8ea;
  --tulip-100: #faf2c7;
  --tulip-200: #f5e793;
  --tulip-300: #efca55;
  --tulip-400: #eab631;
  --tulip-500: #d99b19;
  --tulip-600: #bb7713;
  --tulip-700: #955013;
  --tulip-800: #7a4417;
  --tulip-900: #643f19;
  --tulip-950: #3e2c0a;
  --bg-canvas: var(--grey-50);
  --bg-surface: var(--grey-100);
  --bg-surface-hover: var(--grey-200);
  --bg-elevated: #ffffff;
  --border-subtle: var(--grey-200);
  --border-strong: var(--grey-300);
  --text-primary: var(--grey-900);
  --text-secondary: var(--grey-600);
  --text-disabled: var(--grey-400);
  --brand-500: var(--primary-700);
  --brand-600: var(--primary-800);
  --brand-100: var(--primary-100);
  --success: var(--green-500);
  --success-bg: var(--green-100);
  --warning: var(--tulip-500);
  --warning-bg: var(--tulip-100);
  --danger: var(--red-500);
  --danger-bg: var(--red-100);
  --info: var(--primary-500);
  --info-bg: var(--primary-100);
  --shadow-xs: 0 1px 2px rgba(15, 17, 21, 0.04);
  --shadow-sm: 0 2px 6px rgba(15, 17, 21, 0.08);
  --shadow-md: 0 8px 24px rgba(15, 17, 21, 0.12);
  --shadow-lg: 0 16px 48px rgba(15, 17, 21, 0.18);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 999px;
  --radius-input: 8px;
  --header-h: 64px;
```

Add inside the existing `.dark { ... }` block:

```css
  --bg-canvas: var(--grey-950);
  --bg-surface: var(--grey-900);
  --bg-surface-hover: var(--grey-800);
  --bg-elevated: #1e1e1e;
  --border-subtle: var(--grey-800);
  --border-strong: var(--grey-700);
  --text-primary: var(--grey-50);
  --text-secondary: var(--grey-400);
  --text-disabled: var(--grey-600);
  --brand-500: var(--primary-400);
  --brand-600: var(--primary-300);
  --brand-100: #2a1145;
  --success: var(--green-400);
  --success-bg: var(--green-950);
  --warning: var(--tulip-400);
  --warning-bg: var(--tulip-950);
  --danger: var(--red-400);
  --danger-bg: var(--red-950);
  --info: var(--primary-300);
  --info-bg: #2a1145;
  --shadow-xs: none;
  --shadow-sm: none;
  --shadow-md: 0 12px 32px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 20px 56px rgba(0, 0, 0, 0.55);
```

Also add global rules from the source's `<style>` block (scrollbar + animations), appended after the `@layer base` block in `globals.css`:

```css
::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}
::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 99px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- globals-tokens`
Expected: PASS

- [ ] **Step 5: Register the new tokens as Tailwind utilities**

In `tailwind.config.ts`, replace the `colors` object under `theme.extend` (remove the leftover `teste-color`/`minha-cor` boilerplate entries — they belonged to the removed demo):

```ts
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        'surface-hover': 'var(--bg-surface-hover)',
        elevated: 'var(--bg-elevated)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'text-secondary': 'var(--text-secondary)',
        'text-disabled': 'var(--text-disabled)',
        brand: {
          DEFAULT: 'var(--brand-500)',
          600: 'var(--brand-600)',
          100: 'var(--brand-100)',
        },
        success: 'var(--success)',
        'success-bg': 'var(--success-bg)',
        warning: 'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        info: 'var(--info)',
        'info-bg': 'var(--info-bg)',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6: Swap the root font from Geist to Poppins**

In `src/app/layout.tsx`, replace the `Geist`/`Geist_Mono` import and usage:

```tsx
import { Poppins } from 'next/font/google';

import { Providers } from '@/providers/providers';

import type { Metadata } from 'next';

import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Meros Admin',
  description: 'Painel administrativo do Meros',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

This also removes `layout.tsx`'s only reference to `Navigation` — Task 2 deletes `Navigation.tsx` itself, and after this step there's no dangling import left pointing at it.

Add to `tailwind.config.ts` `theme.extend`:

```ts
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
```

- [ ] **Step 7: Run full test suite and lint**

Run: `npm test && npm run lint`
Expected: PASS (pre-existing test suite is empty/passing; lint clean)

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css tailwind.config.ts src/app/layout.tsx src/app/__tests__/globals-tokens.test.ts
git commit -m "feat: add Meros design tokens and Poppins font"
```

---

## Task 2: Remove boilerplate demo surface

**Files:**
- Delete: `src/components/Navigation.tsx`
- Delete: `src/components/DemoForm.tsx`
- Delete: `src/components/ThemeToggleButton.tsx`
- Delete: `src/app/config/page.tsx` (and the now-empty `src/app/config/` dir)
- Delete: `src/app/atoms/page.tsx` (and dir)
- Delete: `src/app/forms/page.tsx` (and dir)
- Delete: `src/app/page.tsx` content (rewritten in Task 8 to redirect — for this task, replace with a minimal stub so the build doesn't break)
- Delete: `src/app/dashboard/` (the demo profile page — the real `dashboard` route is recreated under `(admin)` in Task 8)
- Modify: `src/components/index.ts` (remove exports for deleted components)
- Modify: `src/locales/ptBR.json`, `src/locales/enUS.json`, `src/locales/esES.json` (remove now-orphaned `home`, `config`, `designTokens`, `forms`, `form`, `atoms`, `theme`, `navigation.config/atoms/forms` keys; keep `auth.*` and `hello`)

**Interfaces:**
- Produces: a repo with no demo pages/components left, root layout rendering bare `{children}` (from Task 1 step 6), ready for Task 8 to add the admin shell and routing.

- [ ] **Step 1: Delete the demo components and routes**

```bash
git rm src/components/Navigation.tsx src/components/DemoForm.tsx src/components/ThemeToggleButton.tsx
git rm -r src/app/config src/app/atoms src/app/forms src/app/dashboard
```

- [ ] **Step 2: Trim `src/components/index.ts`**

Read the file first, then remove any `export * from './Navigation'` / `./DemoForm` / `./ThemeToggleButton` lines (keep exports for components that still exist, e.g. `ui/*` barrel if present).

- [ ] **Step 3: Replace `src/app/page.tsx` with a minimal stub**

```tsx
export default function Home() {
  return null;
}
```

(This is intentionally temporary — Task 8 replaces it with the real `redirect('/dashboard')`.)

- [ ] **Step 4: Remove orphaned locale keys**

In each of `src/locales/ptBR.json`, `src/locales/enUS.json`, `src/locales/esES.json`: delete the top-level `home`, `config`, `designTokens`, `forms`, `form`, `atoms`, `theme` keys, and inside `navigation` delete `config`, `atoms`, `forms` (keep `home` and `dashboard` — `home`'s value can stay as-is, it's unused until Task 8 removes the key entirely if nothing references it; simplest is to delete the whole `navigation` object too since the new Sidebar/Header don't use it — replace it with nothing, i.e. remove the key). Keep `hello` and the entire `auth` object untouched.

- [ ] **Step 5: Verify the build still type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS — no dangling imports to the deleted files. If `tsc`/`lint` point at a leftover import, fix it before continuing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove boilerplate demo pages and components"
```

---

## Task 3: Add required shadcn primitives and recharts

**Files:**
- Create (via CLI): `src/components/ui/avatar.tsx`, `src/components/ui/table.tsx`, `src/components/ui/command.tsx`, `src/components/ui/sonner.tsx`
- Modify: `package.json` (adds `recharts`, and whatever `command`/`sonner` pull in, e.g. `cmdk`, `next-themes` or `sonner`)

**Interfaces:**
- Produces: `Avatar`/`AvatarFallback`/`AvatarImage` from `@/components/ui/avatar`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` from `@/components/ui/table`, `CommandDialog`/`CommandInput`/`CommandList`/`CommandEmpty`/`CommandGroup`/`CommandItem` from `@/components/ui/command`, `Toaster` + `toast` from `@/components/ui/sonner` (or `sonner` directly per what the CLI scaffolds) — consumed by Tasks 6, 7, 8, 10.

- [ ] **Step 1: Add the shadcn components**

```bash
npx shadcn@latest add avatar table command sonner
```

- [ ] **Step 2: Repoint the generated `sonner.tsx` at this repo's own theme hook**

The shadcn CLI scaffolds `Toaster` reading theme from the `next-themes` package (and adds it to `package.json`), but this repo's theme state is the Jotai-backed `useTheme()` hook (`src/hooks/useTheme.ts`) — per the Global Constraints, that's the only theme mechanism the app uses. Read the generated `src/components/ui/sonner.tsx`, then replace its `next-themes` import and usage:

```tsx
'use client';

import { useTheme } from '@/hooks/useTheme';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
```

(Keep whatever CSS-variable `style` block the CLI actually generated if it differs from the sketch above — only the theme source needs to change, not the styling.) Then remove the now-unused dependency:

```bash
npm uninstall next-themes
```

- [ ] **Step 3: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 4: Verify everything still builds**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add avatar/table/command/sonner primitives and recharts"
```

---

## Task 4: Formatting and status-color utilities

**Files:**
- Create: `src/lib/admin/format.ts`
- Create: `src/lib/admin/status-styles.ts`
- Test: `src/lib/admin/__tests__/format.test.ts`
- Test: `src/lib/admin/__tests__/status-styles.test.ts`

**Interfaces:**
- Produces: `formatBRL(value: number): string`, `formatNumberBRL(value: number): string` from `@/lib/admin/format`; `statusStyle(status: string): { color: string; background: string }` and `typeStyle(type: string): { color: string; background: string }` from `@/lib/admin/status-styles` — consumed by Task 9 (mock data) and Task 10 (dashboard tables/badges).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/admin/__tests__/format.test.ts
import { formatBRL, formatNumberBRL } from '../format';

describe('formatBRL', () => {
  it('formats an integer as pt-BR currency without cents', () => {
    expect(formatBRL(1842900)).toBe('R$ 1.842.900');
  });
  it('formats a value with cents', () => {
    expect(formatBRL(42.7)).toBe('R$ 42,70');
  });
});

describe('formatNumberBRL', () => {
  it('formats large integers with pt-BR thousands separators', () => {
    expect(formatNumberBRL(48290)).toBe('48.290');
  });
});
```

```ts
// src/lib/admin/__tests__/status-styles.test.ts
import { statusStyle, typeStyle } from '../status-styles';

describe('statusStyle', () => {
  it('maps a positive status to the success tokens', () => {
    expect(statusStyle('Paid')).toEqual({ color: 'var(--success)', background: 'var(--success-bg)' });
  });
  it('maps an unknown status to the neutral fallback', () => {
    expect(statusStyle('Whatever')).toEqual({
      color: 'var(--text-secondary)',
      background: 'var(--bg-surface-hover)',
    });
  });
  it('maps a danger status', () => {
    expect(statusStyle('Refunded')).toEqual({ color: 'var(--danger)', background: 'var(--danger-bg)' });
  });
});

describe('typeStyle', () => {
  it('maps Creator to the info tokens', () => {
    expect(typeStyle('Creator')).toEqual({ color: 'var(--info)', background: 'var(--info-bg)' });
  });
  it('maps anything else to the neutral fallback', () => {
    expect(typeStyle('User')).toEqual({
      color: 'var(--text-secondary)',
      background: 'var(--bg-surface-hover)',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- format status-styles`
Expected: FAIL (modules don't exist yet)

- [ ] **Step 3: Implement `format.ts`**

```ts
// src/lib/admin/format.ts
export function formatBRL(value: number): string {
  const hasCents = !Number.isInteger(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(value);
}

export function formatNumberBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}
```

- [ ] **Step 4: Implement `status-styles.ts`** (ported 1:1 from `statusStyle`/`typeStyle`, script lines 5101–5118 of the extracted artifact)

```ts
// src/lib/admin/status-styles.ts
export interface StatusStyle {
  color: string;
  background: string;
}

const NEUTRAL: StatusStyle = { color: 'var(--text-secondary)', background: 'var(--bg-surface-hover)' };

const STATUS_MAP: Record<string, StatusStyle> = {
  Paid: { color: 'var(--success)', background: 'var(--success-bg)' },
  Active: { color: 'var(--success)', background: 'var(--success-bg)' },
  Published: { color: 'var(--success)', background: 'var(--success-bg)' },
  Approved: { color: 'var(--success)', background: 'var(--success-bg)' },
  Pending: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  Processing: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  Deactivated: NEUTRAL,
  Deleted: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  'In review': { color: 'var(--warning)', background: 'var(--warning-bg)' },
  Refunded: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  Failed: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  Blocked: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  Rejected: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  Chargeback: { color: 'var(--danger)', background: 'var(--danger-bg)' },
};

export function statusStyle(status: string): StatusStyle {
  return STATUS_MAP[status] || NEUTRAL;
}

export function typeStyle(type: string): StatusStyle {
  if (type === 'Creator') return { color: 'var(--info)', background: 'var(--info-bg)' };
  return NEUTRAL;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- format status-styles`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/format.ts src/lib/admin/status-styles.ts src/lib/admin/__tests__
git commit -m "feat: add BRL formatting and status-color utilities"
```

---

## Task 5: NAV config and icon set

**Files:**
- Create: `src/components/admin/nav-config.ts`
- Create: `src/components/admin/icons.tsx`
- Test: `src/components/admin/__tests__/nav-config.test.ts`

**Interfaces:**
- Produces:
  - `interface NavLeaf { key: string; label: string }`
  - `interface NavGroup { key: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; sub?: NavLeaf[] }`
  - `export const NAV: NavGroup[]` from `@/components/admin/nav-config`
  - `export function labelForKey(key: string): string` (mirrors source's `labelFor`)
  - `export function parentOfKey(key: string): NavGroup | undefined` (mirrors the `this.NAV.find(g => g.sub && g.sub.some(...))` lookup used by breadcrumbs/flyout)
  - `export function navI18nKey(key: string): string` (NAV key → `admin.nav.<camelKey>` i18n key, so Sidebar/Header can route every NAV label through `t()` per the Global Constraints, using the literal label as `defaultValue`)
  - Icon components from `@/components/admin/icons`: `IconDashboard, IconUsers, IconModeration, IconCatalog, IconAnalytics, IconSubscriptions, IconBookings, IconFinance, IconSystem` (exact source paths) and re-exported `IconLists, IconCampaigns, IconSecurity, IconMonitoring` (lucide fallbacks: `List`, `Send`, `ShieldCheck`, `Activity` from `lucide-react`), plus shell icons `IconSearch, IconBell, IconSun, IconMoon, IconCollapse, IconChevronRight, IconChevronDown, IconClose, IconLogout, IconGear` (exact source paths).
- Consumed by: Task 6 (Sidebar), Task 7 (Header).

- [ ] **Step 1: Write the failing test**

```ts
// src/components/admin/__tests__/nav-config.test.ts
import { NAV, labelForKey, navI18nKey, parentOfKey } from '../nav-config';

describe('NAV', () => {
  it('has the 13 top-level groups in source order', () => {
    expect(NAV.map((g) => g.key)).toEqual([
      'dashboard',
      'analytics',
      'lists',
      'users',
      'subscriptions',
      'bookings',
      'finance',
      'catalog',
      'campaigns',
      'moderation',
      'security',
      'monitoring',
      'system',
    ]);
  });

  it('gives finance 12 sub-items ending with statement', () => {
    const finance = NAV.find((g) => g.key === 'finance')!;
    expect(finance.sub).toHaveLength(12);
    expect(finance.sub![finance.sub!.length - 1]).toEqual({ key: 'finance-statement', label: 'Statement' });
  });
});

describe('labelForKey', () => {
  it('returns a top-level group label', () => {
    expect(labelForKey('dashboard')).toBe('Overview');
  });
  it('returns a sub-item label', () => {
    expect(labelForKey('finance-payouts')).toBe('Payouts');
  });
  it('falls back to Overview for an unknown key', () => {
    expect(labelForKey('nope')).toBe('Overview');
  });
});

describe('parentOfKey', () => {
  it('finds the parent group of a sub-item', () => {
    expect(parentOfKey('finance-payouts')?.key).toBe('finance');
  });
  it('returns undefined for a top-level key', () => {
    expect(parentOfKey('dashboard')).toBeUndefined();
  });
});

describe('navI18nKey', () => {
  it('camel-cases a hyphenated key under the admin.nav namespace', () => {
    expect(navI18nKey('finance-payouts')).toBe('admin.nav.financePayouts');
  });
  it('passes through a key with no hyphen', () => {
    expect(navI18nKey('dashboard')).toBe('admin.nav.dashboard');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- nav-config`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `icons.tsx`** (paths extracted verbatim from the sidebar/header markup and the `themeIcon`/`icon()`/logout/preferences script blocks of the artifact)

```tsx
// src/components/admin/icons.tsx
import { Activity, List, Send, ShieldCheck } from 'lucide-react';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      stroke="currentColor"
      fill="none"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 11l8-7 8 7v8a2 2 0 01-2 2h-4v-6H10v6H6a2 2 0 01-2-2z" />
    </IconBase>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17.5" cy="9" r="2.6" />
      <path d="M15.5 14c2.7.4 4.5 2.3 4.5 6" />
    </IconBase>
  );
}

export function IconModeration(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2.5 4L16 12H5" />
    </IconBase>
  );
}

export function IconCatalog(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}

export function IconAnalytics(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </IconBase>
  );
}

export function IconSubscriptions(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 10h19" />
    </IconBase>
  );
}

export function IconBookings(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </IconBase>
  );
}

export function IconFinance(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M15.5 12.5h4" />
      <path d="M2.5 9.5h19" />
    </IconBase>
  );
}

export function IconGear(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1h.1a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </IconBase>
  );
}

export const IconSystem = IconGear;

// Not present in the reference markup (D.ICONS entries missing from the export) — closest lucide equivalents.
export function IconLists(props: IconProps) {
  return <List size={props.size ?? 18} {...props} />;
}
export function IconCampaigns(props: IconProps) {
  return <Send size={props.size ?? 18} {...props} />;
}
export function IconSecurity(props: IconProps) {
  return <ShieldCheck size={props.size ?? 18} {...props} />;
}
export function IconMonitoring(props: IconProps) {
  return <Activity size={props.size ?? 18} {...props} />;
}

// Shell chrome icons (header/sidebar controls), exact source paths.
export function IconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </IconBase>
  );
}

export function IconBell(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </IconBase>
  );
}

export function IconSun(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </IconBase>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </IconBase>
  );
}

export function IconCollapse(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 6l-6 6 6 6" />
    </IconBase>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 6l6 6-6 6" />
    </IconBase>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 9l6 6 6-6" />
    </IconBase>
  );
}

export function IconClose(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </IconBase>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </IconBase>
  );
}
```

- [ ] **Step 4: Implement `nav-config.ts`** (data ported verbatim from the artifact's `NAV` array, script lines 4971–5001, with icons wired per component)

```ts
// src/components/admin/nav-config.ts
import type { ComponentType } from 'react';

import {
  IconAnalytics,
  IconBookings,
  IconCampaigns,
  IconCatalog,
  IconDashboard,
  IconFinance,
  IconLists,
  IconModeration,
  IconMonitoring,
  IconSecurity,
  IconSubscriptions,
  IconSystem,
  IconUsers,
} from './icons';

export interface NavLeaf {
  key: string;
  label: string;
}

export interface NavGroup {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  sub?: NavLeaf[];
}

function leaves(pairs: [string, string][]): NavLeaf[] {
  return pairs.map(([key, label]) => ({ key, label }));
}

export const NAV: NavGroup[] = [
  { key: 'dashboard', label: 'Overview', icon: IconDashboard },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: IconAnalytics,
    sub: leaves([
      ['analytics-country', 'Sales by location'],
      ['analytics-map', 'World map'],
      ['analytics-searched', 'Top searched destinations'],
      ['analytics-topsold', 'Top selling lists'],
      ['analytics-conversion', 'Conversion'],
      ['analytics-revenue', 'Revenue'],
    ]),
  },
  { key: 'lists', label: 'Travel Lists', icon: IconLists },
  { key: 'users', label: 'Users & Creators', icon: IconUsers },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    icon: IconSubscriptions,
    sub: leaves([
      ['subscriptions-overview', 'Overview'],
      ['subscriptions-plans', 'Plans'],
      ['subscriptions-features', 'Features'],
    ]),
  },
  { key: 'bookings', label: 'Bookings', icon: IconBookings },
  {
    key: 'finance',
    label: 'Finance',
    icon: IconFinance,
    sub: leaves([
      ['finance-revenue', 'Revenue'],
      ['finance-commissions', 'Commissions'],
      ['finance-wallets', 'Seller wallets'],
      ['finance-split', 'Split'],
      ['finance-fees', 'Fees'],
      ['finance-apple', 'Apple'],
      ['finance-google', 'Google'],
      ['finance-stripe', 'Stripe'],
      ['finance-payouts', 'Payouts'],
      ['finance-refunds', 'Refunds'],
      ['finance-chargebacks', 'Chargebacks'],
      ['finance-statement', 'Statement'],
    ]),
  },
  {
    key: 'catalog',
    label: 'Catalog',
    icon: IconCatalog,
    sub: leaves([
      ['catalog-categories', 'Categories'],
      ['catalog-requests', 'Category requests'],
    ]),
  },
  { key: 'campaigns', label: 'Campaigns', icon: IconCampaigns },
  {
    key: 'moderation',
    label: 'Moderation & Trust',
    icon: IconModeration,
    sub: leaves([
      ['moderation-reported', 'Reported content'],
      ['moderation-business', 'Business accounts'],
    ]),
  },
  {
    key: 'security',
    label: 'Security',
    icon: IconSecurity,
    sub: leaves([
      ['security-sessions', 'Sessions'],
      ['security-ips', 'IPs'],
      ['security-devices', 'Devices'],
      ['security-login', 'Login'],
      ['security-2fa', '2FA'],
      ['security-tokens', 'Tokens'],
      ['security-permissions', 'Permissions'],
      ['security-history', 'History'],
      ['security-map', 'Access map'],
      ['security-suspicious', 'Suspicious login'],
      ['security-alerts', 'Alerts'],
    ]),
  },
  { key: 'monitoring', label: 'Monitoring', icon: IconMonitoring },
  {
    key: 'system',
    label: 'System',
    icon: IconSystem,
    sub: leaves([
      ['system-admins', 'Administrators'],
      ['system-roles', 'Roles'],
      ['system-permissions', 'Permissions'],
      ['system-flags', 'Feature Flags'],
      ['system-settings', 'Settings'],
      ['system-integrations', 'Integrations'],
      ['system-logs', 'Logs'],
      ['system-audit', 'Audit Log'],
      ['system-terms', 'Terms & privacy'],
    ]),
  },
];

export function labelForKey(key: string): string {
  for (const g of NAV) {
    if (g.key === key) return g.label;
    if (g.sub) {
      const leaf = g.sub.find((s) => s.key === key);
      if (leaf) return leaf.label;
    }
  }
  return 'Overview';
}

export function parentOfKey(key: string): NavGroup | undefined {
  return NAV.find((g) => g.sub?.some((s) => s.key === key));
}

export function navHref(key: string): string {
  return key === 'dashboard' ? '/dashboard' : `/${key.replace(/-/g, '/')}`;
}

// i18n key for a NAV key's label, e.g. 'finance-payouts' -> 'admin.nav.financePayouts'.
// Sidebar/Header call t(navI18nKey(key), { defaultValue: labelForKey(key) }) — this
// keeps every visible NAV string going through react-i18next (translators can add a
// real translation for any of these 45 keys at any time) without requiring all three
// locale files to carry translations for screens Phase 1 doesn't build yet; the
// defaultValue is always the literal source label, so the rendered text is identical
// to the reference until a translation is added.
export function navI18nKey(key: string): string {
  const camel = key.replace(/-([a-z0-9])/g, (_m, ch: string) => ch.toUpperCase());
  return `admin.nav.${camel}`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- nav-config`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/nav-config.ts src/components/admin/icons.tsx src/components/admin/__tests__/nav-config.test.ts
git commit -m "feat: port NAV config and icon set from Meros Admin artifact"
```

---

## Task 6: Sidebar component

**Files:**
- Create: `src/components/admin/Sidebar.tsx`
- Create: `public/meros-logo.png` (copied from the extracted asset — see Step 1)
- Test: `src/components/admin/__tests__/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `NAV`, `labelForKey`, `parentOfKey`, `navHref`, `navI18nKey` from `@/components/admin/nav-config`; `IconCollapse`, `IconChevronRight` from `@/components/admin/icons`; `usePathname` from `next/navigation`.
- Produces: `<Sidebar />` (no props — reads the current route itself) from `@/components/admin/Sidebar`, consumed by Task 8's `AdminShell`.

- [ ] **Step 0: Initialize i18next for the test environment**

This is the first task with a component test that calls `useTranslation()`. The app initializes i18next as a side effect of importing `@/i18n` (see `src/providers/providers.tsx`), but component unit tests render components directly without mounting `<Providers>`, so without this step `useTranslation()` has no initialized instance to read from. Add the import once, globally, to the Jest setup file:

Read `setupTest.ts`, then add to it:

```ts
import '@testing-library/jest-dom';
import '@/i18n';
```

This makes every test run with i18next initialized at `lng: 'pt'` (see `src/i18n/index.ts`), so `t()` calls resolve to the `ptBR.json` values across all component tests from here on.

- [ ] **Step 1: Copy the real Meros logo asset into `public/`**

The logo is asset `a5f019e1-7f01-465c-8f4a-77a1d5702ca3` (PNG, 28×28 display size) embedded in `Meros Admin (standalone).html`'s manifest. Extract and copy it:

```bash
node -e "
const fs = require('fs');
const content = fs.readFileSync('Meros Admin (standalone).html', 'utf8');
const manifest = JSON.parse(content.split('\n')[378]);
const entry = manifest['a5f019e1-7f01-465c-8f4a-77a1d5702ca3'];
fs.writeFileSync('public/meros-logo.png', Buffer.from(entry.data, 'base64'));
console.log('wrote public/meros-logo.png');
"
```

If `Meros Admin (standalone).html`'s line numbers have shifted (re-verify with `grep -n '__bundler/manifest' "Meros Admin (standalone).html"` — should point at the line before the one containing the JSON), adjust the `split('\n')[N]` index accordingly before running.

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/admin/__tests__/Sidebar.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders every top-level NAV label', () => {
    render(<Sidebar />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Users & Creators')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('highlights the group matching the current route', () => {
    render(<Sidebar />);
    const overview = screen.getByText('Overview').closest('[data-nav-key]');
    expect(overview).toHaveAttribute('data-active', 'true');
  });

  it('expands a group with sub-items on click and shows its leaves', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    expect(screen.queryByText('Payouts')).not.toBeInTheDocument();
    await user.click(screen.getByText('Finance'));
    expect(screen.getByText('Payouts')).toBeInTheDocument();
  });

  it('collapses to icon-only width when the collapse toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    const nav = screen.getByRole('navigation');
    await user.click(screen.getByRole('button', { name: /recolher menu/i }));
    expect(nav.parentElement).toHaveAttribute('data-collapsed', 'true');
    expect(screen.queryByText('Users & Creators')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- Sidebar`
Expected: FAIL (`Sidebar` module doesn't exist)

- [ ] **Step 4: Implement `Sidebar.tsx`**

```tsx
// src/components/admin/Sidebar.tsx
'use client';

import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import { IconChevronRight, IconCollapse } from './icons';
import { NAV, navHref, navI18nKey } from './nav-config';

function keyFromPathname(pathname: string): string {
  if (pathname === '/dashboard') return 'dashboard';
  const key = pathname.replace(/^\//, '').replace(/\//g, '-');
  return key || 'dashboard';
}

export function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const currentKey = keyFromPathname(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  return (
    <aside
      data-collapsed={collapsed}
      className="sticky top-0 flex h-screen flex-shrink-0 flex-col border-r transition-[width] duration-200"
      style={{
        width: collapsed ? '72px' : '264px',
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div
        className="flex h-16 flex-shrink-0 items-center justify-between border-b px-4"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-[15px] font-semibold">
          <Image src="/meros-logo.png" alt="Meros" width={28} height={28} className="flex-shrink-0" />
          {!collapsed && <span>Meros</span>}
        </div>
        <button
          type="button"
          aria-label={t('admin.sidebar.collapse')}
          title={t('admin.sidebar.collapse')}
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          <IconCollapse style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>

      <nav role="navigation" className="flex-1 overflow-y-auto p-2">
        {NAV.map((group) => {
          const activeParent = currentKey === group.key || group.sub?.some((s) => s.key === currentKey);
          const isOpen = group.sub ? (openGroups[group.key] ?? activeParent) : false;
          const Icon = group.icon;
          const groupLabel = t(navI18nKey(group.key), { defaultValue: group.label });

          return (
            <div key={group.key} className="mb-1">
              {group.sub ? (
                <button
                  type="button"
                  data-nav-key={group.key}
                  data-active={!!activeParent}
                  onClick={() => setOpenGroups((g) => ({ ...g, [group.key]: !isOpen }))}
                  className="flex w-full items-center gap-3 overflow-hidden whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] font-medium"
                  style={{
                    background: activeParent ? 'var(--brand-100)' : 'transparent',
                    color: activeParent ? 'var(--brand-600)' : 'var(--text-secondary)',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  title={groupLabel}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{groupLabel}</span>
                      <IconChevronRight
                        size={18}
                        style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }}
                      />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={navHref(group.key)}
                  data-nav-key={group.key}
                  data-active={!!activeParent}
                  className="flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] font-medium"
                  style={{
                    background: activeParent ? 'var(--brand-100)' : 'transparent',
                    color: activeParent ? 'var(--brand-600)' : 'var(--text-secondary)',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  title={groupLabel}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="flex-1">{groupLabel}</span>}
                </Link>
              )}

              {group.sub && !collapsed && (
                <div
                  className="overflow-hidden pl-8 transition-[max-height] duration-200"
                  style={{ maxHeight: isOpen ? '460px' : '0px' }}
                >
                  {group.sub.map((leaf) => (
                    <Link
                      key={leaf.key}
                      href={navHref(leaf.key)}
                      className="block rounded-md px-3 py-1.5 text-[13px]"
                      style={{
                        color: currentKey === leaf.key ? 'var(--brand-600)' : 'var(--text-secondary)',
                        fontWeight: currentKey === leaf.key ? 600 : 400,
                      }}
                    >
                      {t(navI18nKey(leaf.key), { defaultValue: leaf.label })}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div
        className="flex flex-shrink-0 items-center gap-2 border-t p-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: 'var(--brand-500)' }}
        >
          AM
        </div>
        {!collapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <div className="text-[13px] font-semibold">Ana Martins</div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
              {t('admin.sidebar.administrator')}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
```

Note: the collapsed-sidebar hover flyout (source lines 348–353) is a nice-to-have interaction, not a content-bearing element — skip it in Phase 1 (submenus are simply unreachable while collapsed, same as clicking a collapsed group doing nothing) and pick it up in a later phase if it's missed; this keeps the task's scope to what the tests above actually pin.

- [ ] **Step 5: Add the two new i18n keys used above**

In `src/locales/ptBR.json`, add:

```json
"admin": {
  "sidebar": {
    "collapse": "Recolher menu",
    "administrator": "Administrator"
  }
}
```

In `src/locales/enUS.json`:

```json
"admin": {
  "sidebar": {
    "collapse": "Collapse menu",
    "administrator": "Administrator"
  }
}
```

In `src/locales/esES.json`:

```json
"admin": {
  "sidebar": {
    "collapse": "Contraer menú",
    "administrator": "Administrador"
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- Sidebar`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/Sidebar.tsx public/meros-logo.png src/components/admin/__tests__/Sidebar.test.tsx src/locales/*.json setupTest.ts
git commit -m "feat: add Sidebar component"
```

---

## Task 7: Header component (breadcrumb, Cmd-K, notifications, theme, profile)

**Files:**
- Create: `src/components/admin/Header.tsx`
- Test: `src/components/admin/__tests__/Header.test.tsx`

**Interfaces:**
- Consumes: `NAV`, `labelForKey`, `parentOfKey`, `navHref` from `@/components/admin/nav-config`; `useTheme` from `@/hooks/useTheme`; `IconSearch, IconBell, IconSun, IconMoon, IconChevronDown, IconLogout, IconGear` from `@/components/admin/icons`; shadcn `CommandDialog`/`CommandInput`/`CommandList`/`CommandEmpty`/`CommandGroup`/`CommandItem` from `@/components/ui/command`; `DropdownMenu*` from `@/components/ui/dropdown-menu`; `usePathname`, `useRouter` from `next/navigation`.
- Produces: `<Header />` (no props) from `@/components/admin/Header`, consumed by Task 8's `AdminShell`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/__tests__/Header.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push }),
}));

import { Header } from '../Header';

describe('Header', () => {
  it('renders the breadcrumb for the current route', () => {
    render(<Header />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('opens the command palette from the search trigger and filters NAV items', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: /search/i }));
    const input = screen.getByPlaceholderText(/search users, lists, orders, creators/i);
    await user.type(input, 'finance');
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.queryByText('Users & Creators')).not.toBeInTheDocument();
  });

  it('opens the command palette on Ctrl+K from anywhere', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByPlaceholderText(/search users, lists, orders, creators/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Header`
Expected: FAIL (`Header` module doesn't exist)

- [ ] **Step 3: Implement `Header.tsx`**

```tsx
// src/components/admin/Header.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { usePathname, useRouter } from 'next/navigation';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/useTheme';

import { IconBell, IconChevronDown, IconGear, IconLogout, IconMoon, IconSearch, IconSun } from './icons';
import { NAV, labelForKey, navHref, navI18nKey, parentOfKey } from './nav-config';

function keyFromPathname(pathname: string): string {
  if (pathname === '/dashboard') return 'dashboard';
  const key = pathname.replace(/^\//, '').replace(/\//g, '-');
  return key || 'dashboard';
}

// t is passed in so every NAV label rendered from this index goes through i18n
// (see navI18nKey's doc comment in nav-config.ts for why defaultValue is used
// instead of requiring translations for screens this phase doesn't build).
function cmdkIndex(t: (key: string, opts?: { defaultValue: string }) => string) {
  const items: { label: string; key: string }[] = [];
  NAV.forEach((g) => {
    const groupLabel = t(navI18nKey(g.key), { defaultValue: g.label });
    items.push({ label: groupLabel, key: g.key });
    g.sub?.forEach((s) => {
      const leafLabel = t(navI18nKey(s.key), { defaultValue: s.label });
      items.push({ label: `${groupLabel} · ${leafLabel}`, key: s.key });
    });
  });
  return items;
}

const NOTIFICATIONS = [
  { title: 'Novo pagamento processado via Stripe', time: 'há 5 min' },
  { title: '3 novas listas de viagem publicadas', time: 'há 22 min' },
  { title: 'Conta business aguardando verificação', time: 'há 1 h' },
  { title: 'Relatório mensal de receita disponível', time: 'há 3 h' },
];

export function Header() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const currentKey = keyFromPathname(pathname);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuery('');
        setCmdkOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const crumbs = useMemo(() => {
    const parts = [t('admin.header.crumbRoot', { defaultValue: 'Dashboard' })];
    const parent = parentOfKey(currentKey);
    if (parent) {
      parts.push(t(navI18nKey(parent.key), { defaultValue: parent.label }));
      parts.push(t(navI18nKey(currentKey), { defaultValue: labelForKey(currentKey) }));
    } else {
      parts.push(t(navI18nKey(currentKey), { defaultValue: labelForKey(currentKey) }));
    }
    return parts;
  }, [currentKey, t]);

  const index = useMemo(() => cmdkIndex(t), [t]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? index.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 8) : index.slice(0, 6);
  }, [index, query]);

  function goTo(key: string) {
    setCmdkOpen(false);
    router.push(navHref(key));
  }

  return (
    <header
      className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b px-6 backdrop-blur"
      style={{ borderColor: 'var(--border-subtle)', background: 'color-mix(in srgb, var(--bg-canvas) 85%, transparent)' }}
    >
      <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
        {crumbs.map((label, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span style={i === crumbs.length - 1 ? { color: 'var(--text-primary)', fontWeight: 600 } : undefined}>
              {label}
            </span>
            {i < crumbs.length - 1 && <span style={{ color: 'var(--border-strong)' }}>/</span>}
          </span>
        ))}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="search"
          onClick={() => {
            setQuery('');
            setCmdkOpen(true);
          }}
          className="flex min-w-[220px] items-center gap-2 rounded-[10px] border px-3 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
        >
          <IconSearch size={15} />
          <span>{t('admin.header.search')}</span>
          <kbd
            className="ml-auto rounded px-1 text-[11px]"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-disabled)' }}
          >
            ⌘K
          </kbd>
        </button>

        <CommandDialog open={cmdkOpen} onOpenChange={setCmdkOpen}>
          <CommandInput
            placeholder={t('admin.header.searchPlaceholder')}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{t('admin.header.noResults')}</CommandEmpty>
            <CommandGroup>
              {results.map((r) => (
                <CommandItem key={r.key} onSelect={() => goTo(r.key)}>
                  {r.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={t('admin.header.notifications')}
              className="relative flex h-[34px] w-[34px] items-center justify-center rounded-[10px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <IconBell size={18} />
              <span
                className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full"
                style={{ background: 'var(--danger)', border: '2px solid var(--bg-canvas)' }}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {NOTIFICATIONS.map((n, i) => (
              <div key={i} className="flex items-start gap-3 border-b px-3 py-2 last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                <IconBell size={15} style={{ color: 'var(--brand-500)' }} />
                <div>
                  <div className="text-[13.5px] font-medium">{n.title}</div>
                  <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>
                    {n.time}
                  </div>
                </div>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          title={t('admin.header.toggleTheme')}
          onClick={toggleTheme}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? <IconMoon size={18} /> : <IconSun size={18} />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-[10px] px-1.5 py-1">
              <div
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: 'var(--brand-500)' }}
              >
                AM
              </div>
              <IconChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="border-b px-3 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="font-semibold">Ana Martins</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>ana@meros.com</div>
            </div>
            <DropdownMenuItem onSelect={() => router.push(navHref('system-settings'))}>
              <IconGear size={15} className="mr-2" />
              {t('admin.header.preferences')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => {}}>
              <IconLogout size={15} className="mr-2" />
              {t('admin.header.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Add the i18n keys used above**

`src/locales/ptBR.json`, inside `admin`:

```json
"header": {
  "crumbRoot": "Dashboard",
  "search": "Search…",
  "searchPlaceholder": "Search users, lists, orders, creators…",
  "noResults": "No result found",
  "notifications": "Notifications",
  "toggleTheme": "Alternar tema",
  "preferences": "Preferences",
  "logout": "Log out"
}
```

`src/locales/enUS.json`:

```json
"header": {
  "crumbRoot": "Dashboard",
  "search": "Search…",
  "searchPlaceholder": "Search users, lists, orders, creators…",
  "noResults": "No result found",
  "notifications": "Notifications",
  "toggleTheme": "Toggle theme",
  "preferences": "Preferences",
  "logout": "Log out"
}
```

`src/locales/esES.json`:

```json
"header": {
  "crumbRoot": "Panel",
  "search": "Buscar…",
  "searchPlaceholder": "Buscar usuarios, listas, pedidos, creadores…",
  "noResults": "Ningún resultado encontrado",
  "notifications": "Notificaciones",
  "toggleTheme": "Cambiar tema",
  "preferences": "Preferencias",
  "logout": "Cerrar sesión"
}
```

Also add the two NAV keys exercised by the Header test (`admin.nav.dashboard`, `admin.nav.finance`) to all three locale files so the breadcrumb/Cmd-K assertions have real translations to resolve rather than relying on `defaultValue` alone:

`src/locales/ptBR.json` and `src/locales/enUS.json`, inside `admin`:

```json
"nav": {
  "dashboard": "Overview",
  "finance": "Finance"
}
```

`src/locales/esES.json`, inside `admin`:

```json
"nav": {
  "dashboard": "Resumen",
  "finance": "Finanzas"
}
```

(Every other NAV key falls back to its literal English `defaultValue` until the screen it belongs to is built in a later phase — that's the intended behavior of `navI18nKey`, not a gap to fill here.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- Header`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/Header.tsx src/components/admin/__tests__/Header.test.tsx src/locales/*.json
git commit -m "feat: add Header component with Cmd-K, notifications, theme, profile menu"
```

---

## Task 8: AdminShell, routing, and root layout wiring

**Files:**
- Create: `src/components/admin/AdminShell.tsx`
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/(admin)/dashboard/page.tsx` (placeholder body for this task — Task 10 fills it in)
- Modify: `src/app/page.tsx` (replace the Task 2 stub with the real redirect)
- Test: `src/components/admin/__tests__/AdminShell.test.tsx`

**Interfaces:**
- Consumes: `Sidebar` (Task 6), `Header` (Task 7), shadcn `Toaster` from `@/components/ui/sonner` (Task 3).
- Produces: `<AdminShell>{children}</AdminShell>` from `@/components/admin/AdminShell`; the `(admin)` route group that every future admin page will live under.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/__tests__/AdminShell.test.tsx
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn() }),
}));

import { AdminShell } from '../AdminShell';

describe('AdminShell', () => {
  it('renders the sidebar, header, and page content together', () => {
    render(
      <AdminShell>
        <div>page content</div>
      </AdminShell>,
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('page content')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument(); // from Header's breadcrumb
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AdminShell`
Expected: FAIL (`AdminShell` module doesn't exist)

- [ ] **Step 3: Implement `AdminShell.tsx`**

```tsx
// src/components/admin/AdminShell.tsx
import { Toaster } from '@/components/ui/sonner';

import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full flex-1 p-8" style={{ maxWidth: '1440px' }}>
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- AdminShell`
Expected: PASS

- [ ] **Step 5: Wire up the `(admin)` route group**

```tsx
// src/app/(admin)/layout.tsx
import { AdminShell } from '@/components/admin/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
```

```tsx
// src/app/(admin)/dashboard/page.tsx
export default function DashboardPage() {
  return null;
}
```

(Task 10 replaces this page body with the real Overview screen — kept as a placeholder here so the route resolves and the redirect below is testable end-to-end.)

- [ ] **Step 6: Redirect `/` to `/dashboard`**

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

- [ ] **Step 7: Manually verify the route tree resolves**

Run: `npm run dev`, open `http://localhost:3000/` in a browser — it should redirect to `/dashboard` and render the shell (empty main area) with Sidebar/Header visible in both light and dark theme (toggle via the header button). Confirm `/login` still renders on its own (no sidebar/header wrapping it, since it's outside `(admin)`). Stop the dev server after checking.

- [ ] **Step 8: Run the full test suite, typecheck, and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/AdminShell.tsx "src/app/(admin)" src/app/page.tsx src/components/admin/__tests__/AdminShell.test.tsx
git commit -m "feat: wire up AdminShell, (admin) route group, and / redirect"
```

---

## Task 9: Dashboard mock data

**Files:**
- Create: `src/lib/mocks/admin/dashboard.ts`
- Test: `src/lib/mocks/admin/__tests__/dashboard.test.ts`

**Interfaces:**
- Produces (all from `@/lib/mocks/admin/dashboard`, consumed by Task 10):
  - `interface KpiCardData { label: string; value: string; deltaLabel: string; positive: boolean; sparkPoints: string; sparkColor: string }`
  - `getDashboardKpis(): KpiCardData[]` — 4 items, literal values ported from the source markup (Total revenue / Monthly revenue / Personal account / Business Account).
  - `interface SubscriptionSummary { title: string; subtitle: string; totalLabel: string; total: string; totalDelta: string; cancelledLabel: string; cancelled: string; cancelledNote: string; revenueLabel: string; revenue: string; revenueDelta: string }`
  - `getSubscriptionSummaries(): SubscriptionSummary[]` — 2 items (App subscriptions, Creator subscriptions), literal values ported from the source markup.
  - `interface RevenuePeriodData { labels: string[]; marketplace: number[]; subscriptions: number[] }`
  - `getRevenueTrend(period: '7d' | '30d' | '90d'): RevenuePeriodData` — invented mock (in R$ thousands, matching the chart's `'R$ ' + v + 'k'` axis formatting from the source).
  - `interface SubscriptionSlice { label: string; value: number; color: string }`
  - `getSubscriptionsBreakdown(): SubscriptionSlice[]` — 3 literal items ported from `subsData()` (source lines 4961–4968): In trial period 6420, Freemium post trial 34780, Premium 7000.
  - `interface GrowthSeries { labels: string[]; users: number[]; creators: number[] }`
  - `getGrowthSeries(): GrowthSeries` — literal 7-month series ported from `syncCharts()` (source lines 3362–3369).
  - `interface Alert { severity: 'danger' | 'warning' | 'info' | 'success'; title: string; description: string; linkLabel: string; navKey: string }`
  - `getAlerts(): Alert[]` — invented mock, 4 items.
  - `interface SaleRow { buyer: string; list: string; amount: string; status: string }`
  - `getLatestSales(): SaleRow[]` — invented mock, 5 rows, `status` values drawn from the set `statusStyle` recognizes.
  - `interface RecentUserRow { name: string; type: 'User' | 'Creator'; joined: string; status: string; initials: string; avatarColor: string }`
  - `getRecentUsers(): RecentUserRow[]` — invented mock, 4 rows.
  - `interface MonthOption { value: string; label: string }`
  - `getMonthOptions(): MonthOption[]` — pure function generating the last 12 months ending at the current month (ported from `monthList()`, source lines 3374–3383).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/mocks/admin/__tests__/dashboard.test.ts
import {
  getAlerts,
  getDashboardKpis,
  getGrowthSeries,
  getLatestSales,
  getMonthOptions,
  getRecentUsers,
  getRevenueTrend,
  getSubscriptionSummaries,
  getSubscriptionsBreakdown,
} from '../dashboard';

describe('getDashboardKpis', () => {
  it('returns the 4 KPI cards with the exact source values', () => {
    const kpis = getDashboardKpis();
    expect(kpis).toHaveLength(4);
    expect(kpis[0]).toMatchObject({ label: 'Total revenue', value: 'R$ 1.842.900', positive: true });
    expect(kpis[2]).toMatchObject({ label: 'Personal account', value: '48.290' });
  });
});

describe('getSubscriptionSummaries', () => {
  it('returns the App and Creator subscription cards', () => {
    const [app, creator] = getSubscriptionSummaries();
    expect(app.title).toBe('App subscriptions');
    expect(app.total).toBe('4.650');
    expect(creator.title).toBe('Creator subscriptions');
    expect(creator.total).toBe('2.590');
  });
});

describe('getSubscriptionsBreakdown', () => {
  it('returns the 3 literal slices summing to 48200', () => {
    const slices = getSubscriptionsBreakdown();
    expect(slices.map((s) => s.value)).toEqual([6420, 34780, 7000]);
  });
});

describe('getGrowthSeries', () => {
  it('returns 7 months with matching-length users/creators series', () => {
    const series = getGrowthSeries();
    expect(series.labels).toEqual(['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']);
    expect(series.users).toEqual([31200, 34500, 37800, 41200, 44100, 46700, 48290]);
    expect(series.creators).toHaveLength(7);
  });
});

describe('getRevenueTrend', () => {
  it.each(['7d', '30d', '90d'] as const)('returns matching-length labels/marketplace/subscriptions for %s', (period) => {
    const trend = getRevenueTrend(period);
    expect(trend.labels.length).toBeGreaterThan(0);
    expect(trend.marketplace).toHaveLength(trend.labels.length);
    expect(trend.subscriptions).toHaveLength(trend.labels.length);
  });
});

describe('getAlerts / getLatestSales / getRecentUsers', () => {
  it('returns a non-empty, well-shaped alerts list', () => {
    const alerts = getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    alerts.forEach((a) => {
      expect(['danger', 'warning', 'info', 'success']).toContain(a.severity);
    });
  });

  it('returns 5 sale rows', () => {
    expect(getLatestSales()).toHaveLength(5);
  });

  it('returns 4 recent-user rows with initials derived from the name', () => {
    const users = getRecentUsers();
    expect(users).toHaveLength(4);
    users.forEach((u) => expect(u.initials.length).toBeGreaterThan(0));
  });
});

describe('getMonthOptions', () => {
  it('returns 12 months ending at the current month', () => {
    const months = getMonthOptions();
    expect(months).toHaveLength(12);
    expect(months[0].value).toBe('0');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- dashboard.test`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement `dashboard.ts`**

```ts
// src/lib/mocks/admin/dashboard.ts

export interface KpiCardData {
  label: string;
  value: string;
  deltaLabel: string;
  positive: boolean;
  sparkPoints: string;
  sparkColor: string;
}

// Literal values ported from Meros Admin (standalone).html, extracted template lines 462-493.
export function getDashboardKpis(): KpiCardData[] {
  return [
    {
      label: 'Total revenue',
      value: 'R$ 1.842.900',
      deltaLabel: '↑ 12,8%',
      positive: true,
      sparkPoints:
        '0,22 5,20 10,21 15,17 20,18 25,14 30,15 35,11 40,12 45,9 50,10 55,7 60,8 65,5 70,6 75,4 80,5 85,3 90,4 95,2 100,3',
      sparkColor: '#7F00FF',
    },
    {
      label: 'Monthly revenue',
      value: 'R$ 182.400',
      deltaLabel: '↑ 12,4%',
      positive: true,
      sparkPoints:
        '0,20 5,18 10,20 15,15 20,17 25,12 30,15 35,10 40,13 45,8 50,11 55,7 60,10 65,5 70,8 75,4 80,7 85,3 90,6 95,2 100,4',
      sparkColor: '#1A8245',
    },
    {
      label: 'Personal account',
      value: '48.290',
      deltaLabel: '↑ 8,2%',
      positive: true,
      sparkPoints:
        '0,20 5,15 10,18 15,10 20,14 25,8 30,12 35,6 40,10 45,4 50,8 55,3 60,7 65,2 70,6 75,1 80,5 85,0 90,4 95,1 100,3',
      sparkColor: '#7C5CDF',
    },
    {
      label: 'Business Account',
      value: '3.140',
      deltaLabel: '↑ 5,4%',
      positive: true,
      sparkPoints:
        '0,18 5,17 10,15 15,14 20,13 25,11 30,12 35,9 40,10 45,7 50,8 55,6 60,7 65,4 70,5 75,3 80,4 85,2 90,3 95,1 100,2',
      sparkColor: '#B7791F',
    },
  ];
}

export interface SubscriptionSummary {
  title: string;
  subtitle: string;
  totalLabel: string;
  total: string;
  totalDelta: string;
  cancelledLabel: string;
  cancelled: string;
  cancelledNote: string;
  revenueLabel: string;
  revenue: string;
  revenueDelta: string;
}

// Literal values ported from the source markup lines 496-550.
export function getSubscriptionSummaries(): SubscriptionSummary[] {
  return [
    {
      title: 'App subscriptions',
      subtitle: 'Plans users buy from Meros — August 2026',
      totalLabel: 'Total subscriptions',
      total: '4.650',
      totalDelta: '↑ 5,7% vs. July',
      cancelledLabel: 'Cancelled',
      cancelled: '52',
      cancelledNote: '1,1% churn',
      revenueLabel: 'Revenue this month',
      revenue: 'R$ 44.760',
      revenueDelta: '↑ 4,8% vs. July',
    },
    {
      title: 'Creator subscriptions',
      subtitle: 'Exclusive content — user subscribes to a profile',
      totalLabel: 'Total subscriptions',
      total: '2.590',
      totalDelta: '↑ 7,9% vs. July',
      cancelledLabel: 'Cancelled',
      cancelled: '32',
      cancelledNote: '1,2% churn',
      revenueLabel: 'Revenue this month',
      revenue: 'R$ 41.320',
      revenueDelta: '↑ 3,6% vs. July',
    },
  ];
}

export interface RevenuePeriodData {
  labels: string[];
  marketplace: number[];
  subscriptions: number[];
}

// Mock (window.MEROS.REVENUE_PERIODS is not present in the source file); values in R$ thousands.
const REVENUE_PERIODS: Record<'7d' | '30d' | '90d', RevenuePeriodData> = {
  '7d': {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    marketplace: [22, 24, 20, 26, 25, 30, 28],
    subscriptions: [10, 11, 10, 12, 11, 13, 12],
  },
  '30d': {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    marketplace: [86, 92, 88, 96],
    subscriptions: [40, 42, 41, 44],
  },
  '90d': {
    labels: ['Jun', 'Jul', 'Ago'],
    marketplace: [340, 360, 382],
    subscriptions: [150, 158, 168],
  },
};

export function getRevenueTrend(period: '7d' | '30d' | '90d'): RevenuePeriodData {
  return REVENUE_PERIODS[period];
}

export interface SubscriptionSlice {
  label: string;
  value: number;
  color: string;
}

// Literal values ported from subsData(), source lines 4961-4968.
export function getSubscriptionsBreakdown(): SubscriptionSlice[] {
  return [
    { label: 'In trial period', value: 6420, color: 'var(--success)' },
    { label: 'Freemium post trial', value: 34780, color: '#9AA1AA' },
    { label: 'Premium', value: 7000, color: 'var(--brand-500)' },
  ];
}

export interface GrowthSeries {
  labels: string[];
  users: number[];
  creators: number[];
}

// Literal values ported from syncCharts(), source lines 3362-3369.
export function getGrowthSeries(): GrowthSeries {
  return {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
    users: [31200, 34500, 37800, 41200, 44100, 46700, 48290],
    creators: [2100, 2350, 2600, 2780, 2900, 3020, 3140],
  };
}

export interface Alert {
  severity: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  linkLabel: string;
  navKey: string;
}

// Mock (window.MEROS.ALERTS is not present in the source file).
export function getAlerts(): Alert[] {
  return [
    {
      severity: 'danger',
      title: 'Pagamento Stripe falhou',
      description: '12 transações não foram processadas nas últimas 24h.',
      linkLabel: 'Ver detalhes',
      navKey: 'finance-stripe',
    },
    {
      severity: 'warning',
      title: '8 listas aguardando revisão',
      description: 'Conteúdo sinalizado pelo sistema de moderação automática.',
      linkLabel: 'Revisar agora',
      navKey: 'moderation-reported',
    },
    {
      severity: 'warning',
      title: '3 contas business pendentes',
      description: 'Solicitações de verificação aguardando aprovação.',
      linkLabel: 'Ver contas',
      navKey: 'moderation-business',
    },
    {
      severity: 'info',
      title: 'Novo recurso disponível',
      description: 'Split de comissão por categoria já pode ser configurado.',
      linkLabel: 'Configurar',
      navKey: 'finance-split',
    },
  ];
}

export interface SaleRow {
  buyer: string;
  list: string;
  amount: string;
  status: string;
}

// Mock (window.MEROS.ORDERS is not present in the source file).
export function getLatestSales(): SaleRow[] {
  return [
    { buyer: 'Marina Alves', list: '10 dias na Patagônia', amount: 'R$ 1.240', status: 'Paid' },
    { buyer: 'Diego Fontes', list: 'Roteiro Lisboa + Porto', amount: 'R$ 680', status: 'Processing' },
    { buyer: 'Helena Cardoso', list: 'Trilhas na Chapada Diamantina', amount: 'R$ 420', status: 'Paid' },
    { buyer: 'Bruno Tavares', list: 'Tóquio essencial em 7 dias', amount: 'R$ 990', status: 'Pending' },
    { buyer: 'Isabela Ramos', list: 'Vinícolas do Vale dos Vinhedos', amount: 'R$ 350', status: 'Refunded' },
  ];
}

export interface RecentUserRow {
  name: string;
  type: 'User' | 'Creator';
  joined: string;
  status: string;
  initials: string;
  avatarColor: string;
}

const AVATAR_COLORS = ['#7F00FF', '#1A8245', '#7C5CDF', '#B7791F', '#DF2339'];

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// Mock (window.MEROS.RECENT_USERS is not present in the source file).
export function getRecentUsers(): RecentUserRow[] {
  const rows: Array<Omit<RecentUserRow, 'initials' | 'avatarColor'>> = [
    { name: 'Camila Duarte', type: 'Creator', joined: '21/08/2026', status: 'Active' },
    { name: 'Rafael Nogueira', type: 'User', joined: '20/08/2026', status: 'Active' },
    { name: 'Priscila Matos', type: 'Creator', joined: '19/08/2026', status: 'Pending' },
    { name: 'Eduardo Lima', type: 'User', joined: '18/08/2026', status: 'Deactivated' },
  ];
  return rows.map((u, i) => ({
    ...u,
    initials: initialsOf(u.name),
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

export interface MonthOption {
  value: string;
  label: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Ported from monthList(), source lines 3374-3383.
export function getMonthOptions(): MonthOption[] {
  const now = new Date();
  const out: MonthOption[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ value: String(i), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- dashboard.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mocks/admin/dashboard.ts src/lib/mocks/admin/__tests__/dashboard.test.ts
git commit -m "feat: add Overview/Dashboard mock data"
```

---

## Task 10: Dashboard page (Overview screen)

**Files:**
- Create: `src/components/admin/dashboard/Sparkline.tsx`
- Create: `src/components/admin/dashboard/KpiCard.tsx`
- Create: `src/components/admin/dashboard/SubscriptionSummaryCard.tsx`
- Create: `src/components/admin/dashboard/RevenueChart.tsx`
- Create: `src/components/admin/dashboard/SubscriptionsChart.tsx`
- Create: `src/components/admin/dashboard/GrowthChart.tsx`
- Create: `src/components/admin/dashboard/AlertsCard.tsx`
- Create: `src/components/admin/dashboard/LatestSalesTable.tsx`
- Create: `src/components/admin/dashboard/RecentUsersTable.tsx`
- Modify: `src/app/(admin)/dashboard/page.tsx` (replace Task 8's placeholder)
- Test: `src/app/(admin)/dashboard/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: everything from Task 9 (`@/lib/mocks/admin/dashboard`), `statusStyle`/`typeStyle` from `@/lib/admin/status-styles`, shadcn `Table*`/`Badge` from `@/components/ui/*`, `recharts` (`AreaChart`, `Area`, `PieChart`, `Pie`, `Cell`, `LineChart`, `Line`, `XAxis`, `YAxis`, `ResponsiveContainer`, `Legend`).
- Produces: the rendered `/dashboard` page — no other task consumes this (leaf of the dependency graph for Phase 1).

- [ ] **Step 1: Write the failing test for the page**

```tsx
// src/app/(admin)/dashboard/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';

// recharts needs a real layout size in jsdom; ResponsiveContainer no-ops without it,
// which is fine for these assertions (we're checking content, not pixel layout).
jest.mock('recharts', () => {
  const actual = jest.requireActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

import DashboardPage from '../page';

describe('DashboardPage', () => {
  it('renders the 4 KPI cards with their exact values', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Total revenue')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.842.900')).toBeInTheDocument();
    expect(screen.getByText('Business Account')).toBeInTheDocument();
    expect(screen.getByText('3.140')).toBeInTheDocument();
  });

  it('renders both subscription summary cards', () => {
    render(<DashboardPage />);
    expect(screen.getByText('App subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Creator subscriptions')).toBeInTheDocument();
  });

  it('renders the latest sales and recent users tables', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Latest sales')).toBeInTheDocument();
    expect(screen.getByText('Latest users')).toBeInTheDocument();
    expect(screen.getByText('Marina Alves')).toBeInTheDocument();
    expect(screen.getByText('Camila Duarte')).toBeInTheDocument();
  });

  it('renders the alerts card', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Alerts importantes')).toBeInTheDocument();
    expect(screen.getByText('Pagamento Stripe falhou')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- "dashboard/__tests__/page"`
Expected: FAIL (page still returns `null` from Task 8)

- [ ] **Step 3: Implement `Sparkline.tsx`** (exact inline-SVG approach from the source — no chart library)

```tsx
// src/components/admin/dashboard/Sparkline.tsx
export function Sparkline({ points, color }: { points: string; color: string }) {
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-8 w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}
```

- [ ] **Step 4: Implement `KpiCard.tsx`**

```tsx
// src/components/admin/dashboard/KpiCard.tsx
import type { KpiCardData } from '@/lib/mocks/admin/dashboard';

import { Sparkline } from './Sparkline';

export function KpiCard({ kpi }: { kpi: KpiCardData }) {
  return (
    <div className="rounded-[14px] border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
      <div className="mb-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        {kpi.label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[28px] font-bold tabular-nums tracking-tight">{kpi.value}</div>
        <div
          className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[12.5px] font-semibold"
          style={{
            color: kpi.positive ? 'var(--success)' : 'var(--danger)',
            background: kpi.positive ? 'var(--success-bg)' : 'var(--danger-bg)',
          }}
        >
          {kpi.deltaLabel}
        </div>
      </div>
      <Sparkline points={kpi.sparkPoints} color={kpi.sparkColor} />
    </div>
  );
}
```

- [ ] **Step 5: Implement `SubscriptionSummaryCard.tsx`**

```tsx
// src/components/admin/dashboard/SubscriptionSummaryCard.tsx
import type { SubscriptionSummary } from '@/lib/mocks/admin/dashboard';

export function SubscriptionSummaryCard({ data }: { data: SubscriptionSummary }) {
  return (
    <div className="rounded-[14px] border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{data.title}</h3>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.subtitle}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="mb-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.totalLabel}
          </div>
          <div className="text-2xl font-bold tabular-nums tracking-tight">{data.total}</div>
          <div className="mt-1 text-[11.5px] font-semibold" style={{ color: 'var(--success)' }}>
            {data.totalDelta}
          </div>
        </div>
        <div className="border-l pl-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="mb-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.cancelledLabel}
          </div>
          <div className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--danger)' }}>
            {data.cancelled}
          </div>
          <div className="mt-1 text-[11.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {data.cancelledNote}
          </div>
        </div>
        <div className="border-l pl-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="mb-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.revenueLabel}
          </div>
          <div className="text-2xl font-bold tabular-nums tracking-tight">{data.revenue}</div>
          <div className="mt-1 text-[11.5px] font-semibold" style={{ color: 'var(--success)' }}>
            {data.revenueDelta}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement `RevenueChart.tsx`** (stacked area, replacing the source's Chart.js line/fill config — source lines 3337–3345)

```tsx
// src/components/admin/dashboard/RevenueChart.tsx
'use client';

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { RevenuePeriodData } from '@/lib/mocks/admin/dashboard';

export function RevenueChart({ data }: { data: RevenuePeriodData }) {
  const rows = data.labels.map((label, i) => ({
    label,
    Marketplace: data.marketplace[i],
    Subscriptions: data.subscriptions[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={270}>
      <AreaChart data={rows} stackOffset="none">
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$ ${v}k`}
        />
        <Tooltip formatter={(v: number) => `R$ ${v}k`} />
        <Legend wrapperStyle={{ fontSize: 11.5 }} />
        <Area type="monotone" dataKey="Marketplace" stackId="revenue" stroke="var(--brand-500)" fill="var(--brand-500)" fillOpacity={0.2} strokeWidth={2} />
        <Area type="monotone" dataKey="Subscriptions" stackId="revenue" stroke="var(--success)" fill="var(--success)" fillOpacity={0.2} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 7: Implement `SubscriptionsChart.tsx`** (doughnut, replacing Chart.js config — source lines 3352–3356)

```tsx
// src/components/admin/dashboard/SubscriptionsChart.tsx
'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import type { SubscriptionSlice } from '@/lib/mocks/admin/dashboard';

export function SubscriptionsChart({ data }: { data: SubscriptionSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius="68%" outerRadius="100%" paddingAngle={0} stroke="none">
          {data.map((slice) => (
            <Cell key={slice.label} fill={slice.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 8: Implement `GrowthChart.tsx`** (dual-axis line chart — source lines 3362–3369)

```tsx
// src/components/admin/dashboard/GrowthChart.tsx
'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { GrowthSeries } from '@/lib/mocks/admin/dashboard';

export function GrowthChart({ data }: { data: GrowthSeries }) {
  const rows = data.labels.map((label, i) => ({
    label,
    Users: data.users[i],
    Creators: data.creators[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={rows}>
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="left"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v / 1000}k`}
        />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11.5 }} />
        <Line yAxisId="left" type="monotone" dataKey="Users" stroke="var(--brand-500)" strokeWidth={2} dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="Creators" stroke="#B7791F" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 9: Implement `AlertsCard.tsx`**

```tsx
// src/components/admin/dashboard/AlertsCard.tsx
'use client';

import { useTranslation } from 'react-i18next';

import { useRouter } from 'next/navigation';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

import type { Alert } from '@/lib/mocks/admin/dashboard';
import { navHref } from '@/components/admin/nav-config';

const SEVERITY_STYLE: Record<Alert['severity'], { bg: string; color: string; Icon: typeof AlertTriangle }> = {
  danger: { bg: 'var(--danger-bg)', color: 'var(--danger)', Icon: AlertTriangle },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning)', Icon: AlertTriangle },
  info: { bg: 'var(--info-bg)', color: 'var(--info)', Icon: Info },
  success: { bg: 'var(--success-bg)', color: 'var(--success)', Icon: CheckCircle2 },
};

export function AlertsCard({ alerts }: { alerts: Alert[] }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="rounded-[14px] border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
      <h3 className="mb-4 text-lg font-semibold">{t('admin.dashboard.alertsTitle')}</h3>
      {alerts.map((a, i) => {
        const { bg, color, Icon } = SEVERITY_STYLE[a.severity];
        return (
          <div key={i} className="flex gap-3 border-b py-3 last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ background: bg, color }}
            >
              <Icon size={15} />
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-medium">{a.title}</div>
              <div className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                {a.description}
              </div>
              <button
                type="button"
                onClick={() => router.push(navHref(a.navKey))}
                className="mt-1 text-[12.5px] font-semibold"
                style={{ color: 'var(--brand-500)' }}
              >
                {a.linkLabel} →
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 10: Implement `LatestSalesTable.tsx` and `RecentUsersTable.tsx`**

```tsx
// src/components/admin/dashboard/LatestSalesTable.tsx
'use client';

import { useTranslation } from 'react-i18next';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { statusStyle } from '@/lib/admin/status-styles';
import type { SaleRow } from '@/lib/mocks/admin/dashboard';

export function LatestSalesTable({ rows }: { rows: SaleRow[] }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[14px] border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
      <div className="px-6 pt-5">
        <h3 className="text-lg font-semibold">{t('admin.dashboard.latestSales')}</h3>
      </div>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.dashboard.buyer')}</TableHead>
            <TableHead>{t('admin.dashboard.list')}</TableHead>
            <TableHead>{t('admin.dashboard.amount')}</TableHead>
            <TableHead>{t('admin.dashboard.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o, i) => {
            const style = statusStyle(o.status);
            return (
              <TableRow key={i}>
                <TableCell>{o.buyer}</TableCell>
                <TableCell className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">{o.list}</TableCell>
                <TableCell className="tabular-nums">{o.amount}</TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ color: style.color, background: style.background }}
                  >
                    {o.status}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

```tsx
// src/components/admin/dashboard/RecentUsersTable.tsx
'use client';

import { useTranslation } from 'react-i18next';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { statusStyle, typeStyle } from '@/lib/admin/status-styles';
import type { RecentUserRow } from '@/lib/mocks/admin/dashboard';

export function RecentUsersTable({ rows }: { rows: RecentUserRow[] }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[14px] border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
      <div className="px-6 pt-5">
        <h3 className="text-lg font-semibold">{t('admin.dashboard.latestUsers')}</h3>
      </div>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.dashboard.name')}</TableHead>
            <TableHead>{t('admin.dashboard.type')}</TableHead>
            <TableHead>{t('admin.dashboard.joined')}</TableHead>
            <TableHead>{t('admin.dashboard.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((u, i) => {
            const sStyle = statusStyle(u.status);
            const tStyle = typeStyle(u.type);
            return (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ background: u.avatarColor }}
                    >
                      {u.initials}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ color: tStyle.color, background: tStyle.background }}
                  >
                    {u.type}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">{u.joined}</TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ color: sStyle.color, background: sStyle.background }}
                  >
                    {u.status}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 11: Implement the page, composing everything**

```tsx
// src/app/(admin)/dashboard/page.tsx
'use client';

import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import {
  getAlerts,
  getDashboardKpis,
  getGrowthSeries,
  getLatestSales,
  getMonthOptions,
  getRecentUsers,
  getRevenueTrend,
  getSubscriptionSummaries,
  getSubscriptionsBreakdown,
} from '@/lib/mocks/admin/dashboard';
import { AlertsCard } from '@/components/admin/dashboard/AlertsCard';
import { GrowthChart } from '@/components/admin/dashboard/GrowthChart';
import { KpiCard } from '@/components/admin/dashboard/KpiCard';
import { LatestSalesTable } from '@/components/admin/dashboard/LatestSalesTable';
import { RecentUsersTable } from '@/components/admin/dashboard/RecentUsersTable';
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart';
import { SubscriptionSummaryCard } from '@/components/admin/dashboard/SubscriptionSummaryCard';
import { SubscriptionsChart } from '@/components/admin/dashboard/SubscriptionsChart';

const REV_PERIODS: Array<{ value: '7d' | '30d' | '90d'; labelKey: string }> = [
  { value: '7d', labelKey: 'admin.dashboard.period7d' },
  { value: '30d', labelKey: 'admin.dashboard.period30d' },
  { value: '90d', labelKey: 'admin.dashboard.period90d' },
];

export default function DashboardPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState('0');
  const [revPeriod, setRevPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const kpis = getDashboardKpis();
  const subs = getSubscriptionSummaries();
  const breakdown = getSubscriptionsBreakdown();
  const growth = getGrowthSeries();
  const alerts = getAlerts();
  const sales = getLatestSales();
  const users = getRecentUsers();
  const months = getMonthOptions();
  const revenue = getRevenueTrend(revPeriod);

  const totalBreakdown = breakdown.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.dashboard.title')}</h1>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.dashboard.subtitle')}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-[10px] border px-3.5 py-3 text-sm font-medium"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[10px] border px-4 py-3 text-sm font-medium"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
          >
            {t('admin.dashboard.export')}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        {subs.map((s) => (
          <SubscriptionSummaryCard key={s.title} data={s} />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-[2fr_1fr] gap-6">
        <div className="rounded-[14px] border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t('admin.dashboard.revenueTitle')}</h3>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('admin.dashboard.revenueSubtitle')}
              </div>
            </div>
            <div className="flex gap-2">
              {REV_PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setRevPeriod(p.value)}
                  className="rounded-[10px] border px-3 py-1.5 text-[13px]"
                  style={{
                    background: revPeriod === p.value ? 'var(--brand-100)' : 'var(--bg-elevated)',
                    borderColor: revPeriod === p.value ? 'transparent' : 'var(--border-subtle)',
                    color: revPeriod === p.value ? 'var(--brand-600)' : 'var(--text-secondary)',
                    fontWeight: revPeriod === p.value ? 600 : 400,
                  }}
                >
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <RevenueChart data={revenue} />
        </div>

        <div className="rounded-[14px] border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <h3 className="mb-4 text-lg font-semibold">{t('admin.dashboard.subscriptionsTitle')}</h3>
          <SubscriptionsChart data={breakdown} />
          <div className="mt-4 flex flex-col gap-2.5 text-[13px]">
            {breakdown.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                {s.label}
                <span className="ml-auto font-semibold tabular-nums">{s.value.toLocaleString('pt-BR')}</span>
              </div>
            ))}
            <div
              className="mt-1 flex items-center gap-2 border-t pt-2.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {t('admin.dashboard.conversionRate')}
              <span className="ml-auto font-semibold">14,5%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-[2fr_1fr] gap-6">
        <div className="rounded-[14px] border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{t('admin.dashboard.growthTitle')}</h3>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('admin.dashboard.growthSubtitle')}
            </div>
          </div>
          <GrowthChart data={growth} />
        </div>
        <AlertsCard alerts={alerts} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <LatestSalesTable rows={sales} />
        <RecentUsersTable rows={users} />
      </div>
    </div>
  );
}
```

(`totalBreakdown` is computed for a future phase's use — if a linter flags it as unused in this phase, remove the line; it's not required by any test above.)

- [ ] **Step 12: Add the remaining `admin.dashboard.*` i18n keys**

`src/locales/ptBR.json`, inside `admin`:

```json
"dashboard": {
  "title": "Overview",
  "subtitle": "Platform health — revenue, growth and items that need your attention.",
  "export": "Export",
  "alertsTitle": "Alertas importantes",
  "latestSales": "Latest sales",
  "latestUsers": "Latest users",
  "buyer": "Buyer",
  "list": "List",
  "amount": "Amount",
  "status": "Status",
  "name": "Name",
  "type": "Type",
  "joined": "Joined",
  "revenueTitle": "Revenue",
  "revenueSubtitle": "Marketplace + Subscriptions, composition by period",
  "subscriptionsTitle": "Subscriptions",
  "conversionRate": "Conversion rate to paid",
  "growthTitle": "Growth",
  "growthSubtitle": "Users and creators over the last 7 months",
  "period7d": "7 days",
  "period30d": "30 days",
  "period90d": "90 days"
}
```

`src/locales/enUS.json` — identical values to `ptBR` above (the source text already is English for every one of these keys).

`src/locales/esES.json`:

```json
"dashboard": {
  "title": "Resumen",
  "subtitle": "Salud de la plataforma — ingresos, crecimiento y elementos que requieren tu atención.",
  "export": "Exportar",
  "alertsTitle": "Alertas importantes",
  "latestSales": "Últimas ventas",
  "latestUsers": "Últimos usuarios",
  "buyer": "Comprador",
  "list": "Lista",
  "amount": "Monto",
  "status": "Estado",
  "name": "Nombre",
  "type": "Tipo",
  "joined": "Se unió",
  "revenueTitle": "Ingresos",
  "revenueSubtitle": "Marketplace + Suscripciones, composición por período",
  "subscriptionsTitle": "Suscripciones",
  "conversionRate": "Tasa de conversión a pago",
  "growthTitle": "Crecimiento",
  "growthSubtitle": "Usuarios y creadores en los últimos 7 meses",
  "period7d": "7 días",
  "period30d": "30 días",
  "period90d": "90 días"
}
```

- [ ] **Step 13: Run test to verify it passes**

Run: `npm test -- "dashboard/__tests__/page"`
Expected: PASS

- [ ] **Step 14: Run the full test suite, typecheck, and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 15: Manual visual verification against the reference**

Run: `npm run dev`, open `/dashboard`. Compare against the reference by extracting and opening the artifact's screen directly if needed (see spec's "Extracting the source" section) or against the read-through already done during planning. Check specifically: 4 KPI cards with sparklines and green delta pills, two subscription summary cards, revenue area chart with period pills, subscriptions doughnut + legend + conversion row, growth line chart, alerts list, two tables with avatar initials/status badges. Toggle dark mode and confirm every surface/text/border color still reads correctly (no hardcoded light-only colors). Toggle the sidebar collapse and confirm the shell still looks right. Stop the dev server after checking.

- [ ] **Step 16: Commit**

```bash
git add src/components/admin/dashboard "src/app/(admin)/dashboard/page.tsx" "src/app/(admin)/dashboard/__tests__" src/locales/*.json
git commit -m "feat: implement Overview/Dashboard screen"
```

---

## Final verification (whole Phase 1)

- [ ] Run `npm test && npx tsc --noEmit && npm run lint` one more time from a clean state — all must pass.
- [ ] Run `npm run build` to confirm the production build succeeds (the biggest risk here is a server/client component boundary mistake — anything using hooks/state/`useTranslation` needs `'use client'`).
- [ ] Manually walk through: `/` redirects to `/dashboard`; `/dashboard` renders the full Overview screen inside the shell; `/login` still renders standalone; Sidebar collapse/expand, group expand/collapse, and every group/leaf link works (non-dashboard links 404, which is expected for this phase); Header breadcrumb, Cmd-K (mouse and ⌘K/Ctrl+K), notifications dropdown, theme toggle, and profile dropdown all work in both light and dark theme.
