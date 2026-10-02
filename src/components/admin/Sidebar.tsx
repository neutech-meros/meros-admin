'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { IconChevronRight, IconCollapse } from './icons';
import {
  NAV,
  isNavKeyEnabled,
  keyFromPathname,
  navHref,
  navI18nKey,
  type NavLeaf,
} from './nav-config';

// Keeps sub-item leaves mounted through the closing transition so they visibly
// recede as the wrapper's max-height collapses (matching the reference's
// "always mounted, only the clip animates" behavior), instead of popping out
// instantly the moment `isOpen` flips to false. On open, `mounted` flips to
// `true` in the same commit the wrapper starts growing (visually identical to
// mounting unconditionally). On close, `mounted` only flips back to `false`
// once the CSS transition actually finishes (`onTransitionEnd`).
function NavSubItems({
  groupKey,
  isOpen,
  leaves,
  currentKey,
  t,
}: {
  groupKey: string;
  isOpen: boolean;
  leaves: NavLeaf[];
  currentKey: string;
  t: (key: string, opts?: { defaultValue: string }) => string;
}) {
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  return (
    <div
      id={`nav-sub-${groupKey}`}
      className="overflow-hidden pl-8 transition-[max-height] duration-200"
      style={{ maxHeight: isOpen ? '460px' : '0px' }}
      onTransitionEnd={() => {
        if (!isOpen) setMounted(false);
      }}
    >
      {mounted &&
        leaves.map((leaf) => {
          const label = t(navI18nKey(leaf.key), { defaultValue: leaf.label });
          const isCurrent = currentKey === leaf.key;
          if (!isNavKeyEnabled(leaf.key)) {
            return (
              <span
                key={leaf.key}
                data-nav-key={leaf.key}
                data-nav-disabled="true"
                aria-disabled="true"
                className="block cursor-not-allowed rounded-md px-3 py-1.5 text-[13px]"
                style={{ color: 'var(--text-disabled)' }}
              >
                {label}
              </span>
            );
          }
          return (
            <Link
              key={leaf.key}
              href={navHref(leaf.key)}
              data-nav-key={leaf.key}
              aria-current={isCurrent ? 'page' : undefined}
              className="block rounded-md px-3 py-1.5 text-[13px]"
              style={{
                color: isCurrent ? 'var(--brand-600)' : 'var(--text-secondary)',
                fontWeight: isCurrent ? 600 : 400,
              }}
            >
              {label}
            </Link>
          );
        })}
    </div>
  );
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
          <Image
            src="/meros-logo.png"
            alt="Meros"
            width={28}
            height={28}
            className="flex-shrink-0"
          />
          {!collapsed && <span>Meros</span>}
        </div>
        <button
          type="button"
          aria-label={t('admin.sidebar.collapse')}
          aria-expanded={!collapsed}
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
          const activeParent =
            currentKey === group.key || group.sub?.some((s) => s.key === currentKey);
          const isOpen = group.sub ? (openGroups[group.key] ?? activeParent) : false;
          const Icon = group.icon;
          const groupLabel = t(navI18nKey(group.key), { defaultValue: group.label });
          const disabled = !isNavKeyEnabled(group.key);
          const rowClassName =
            'flex w-full items-center gap-3 overflow-hidden whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] font-medium';
          const rowStyle = {
            background: activeParent && !disabled ? 'var(--brand-100)' : 'transparent',
            color: disabled
              ? 'var(--text-disabled)'
              : activeParent
                ? 'var(--brand-600)'
                : 'var(--text-secondary)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          };

          return (
            <div key={group.key} className="mb-1">
              {disabled ? (
                // Disabled: neither a link nor an active button, so it cannot be reached by
                // click or by keyboard, and a group with sub-items does not expand.
                <button
                  type="button"
                  disabled
                  data-nav-key={group.key}
                  data-active={!!activeParent}
                  data-nav-disabled="true"
                  aria-disabled="true"
                  className={`${rowClassName} cursor-not-allowed`}
                  style={rowStyle}
                  title={groupLabel}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{groupLabel}</span>
                      {group.sub && <IconChevronRight size={18} />}
                    </>
                  )}
                </button>
              ) : group.sub ? (
                <button
                  type="button"
                  data-nav-key={group.key}
                  data-active={!!activeParent}
                  aria-expanded={!!isOpen}
                  aria-controls={`nav-sub-${group.key}`}
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
                        style={{
                          transform: isOpen ? 'rotate(90deg)' : 'none',
                          transition: 'transform .15s ease',
                        }}
                      />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={navHref(group.key)}
                  data-nav-key={group.key}
                  data-active={!!activeParent}
                  aria-current={currentKey === group.key ? 'page' : undefined}
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
                <NavSubItems
                  groupKey={group.key}
                  isOpen={!!isOpen}
                  leaves={group.sub}
                  currentKey={currentKey}
                  t={t}
                />
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
