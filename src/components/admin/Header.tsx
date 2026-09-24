'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useAtom } from 'jotai';
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/useTheme';
import { languageAtom } from '@/store/atoms/language';

import {
  IconBell,
  IconChevronDown,
  IconGear,
  IconLogout,
  IconMoon,
  IconSearch,
  IconSun,
} from './icons';
import { NAV, keyFromPathname, labelForKey, navHref, navI18nKey, parentOfKey } from './nav-config';

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

const LANGUAGES = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export function Header() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const currentKey = keyFromPathname(pathname);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useAtom(languageAtom);

  useEffect(() => {
    if (language !== i18n.language) i18n.changeLanguage(language);
  }, [language, i18n]);

  function changeLanguage(lng: string) {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  }

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
    return q
      ? index.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 8)
      : index.slice(0, 6);
  }, [index, query]);

  function goTo(key: string) {
    setCmdkOpen(false);
    router.push(navHref(key));
  }

  return (
    <header
      className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b px-6 backdrop-blur"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'color-mix(in srgb, var(--bg-canvas) 85%, transparent)',
      }}
    >
      <div
        className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[13.5px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {crumbs.map((label, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span
              style={
                i === crumbs.length - 1
                  ? { color: 'var(--text-primary)', fontWeight: 600 }
                  : undefined
              }
            >
              {label}
            </span>
            {i < crumbs.length - 1 && <span style={{ color: 'var(--border-strong)' }}>/</span>}
          </span>
        ))}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={t('admin.header.search')}
          onClick={() => {
            setQuery('');
            setCmdkOpen(true);
          }}
          className="flex min-w-[220px] items-center gap-2 rounded-[10px] border px-3 py-1.5 text-[13px]"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
          }}
        >
          <IconSearch size={15} />
          <span>{t('admin.header.search')}</span>
          <kbd
            className="ml-auto rounded px-1 text-[11px]"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-disabled)',
            }}
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
              <div
                key={i}
                className="flex items-start gap-3 border-b px-3 py-2 last:border-0"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
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
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                ana@meros.com
              </div>
            </div>
            <DropdownMenuItem onSelect={() => router.push(navHref('system-settings'))}>
              <IconGear size={15} className="mr-2" />
              {t('admin.header.preferences')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('admin.header.language')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={language} onValueChange={changeLanguage}>
              {LANGUAGES.map((l) => (
                <DropdownMenuRadioItem key={l.code} value={l.code}>
                  {l.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
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
