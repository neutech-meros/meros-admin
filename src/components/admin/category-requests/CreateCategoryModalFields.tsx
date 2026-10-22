'use client';

import type { CSSProperties } from 'react';

import { IconChevronDown } from '@/components/admin/icons';
import type { CategoryTreeNode } from '@/lib/admin/categories-api';

export const LABEL_CLASS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide';
export const LABEL_STYLE: CSSProperties = { color: 'var(--text-secondary)' };
export const FIELD_STYLE: CSSProperties = {
  background: 'var(--bg-surface)',
  borderColor: 'var(--border-subtle)',
  color: 'var(--text-primary)',
};

export function NodeSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  options: CategoryTreeNode[];
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS} style={LABEL_STYLE}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-[10px] border py-2 pl-3 pr-9 text-sm outline-none"
          style={FIELD_STYLE}
        >
          {options.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name}
            </option>
          ))}
        </select>
        <IconChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          style={LABEL_STYLE}
        />
      </div>
    </div>
  );
}

export function ToggleButton({
  on,
  onClick,
  children,
  activeStyle,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
  activeStyle: CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="flex-1 rounded-[10px] border px-2 py-2 text-[13px]"
      style={
        on
          ? { ...activeStyle, fontWeight: 600 }
          : {
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }
      }
    >
      {children}
    </button>
  );
}
