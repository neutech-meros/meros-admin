'use client';

import { useTranslation } from 'react-i18next';

import { IconChevronDown } from '@/components/admin/icons';
import { CATEGORY_ICON_OPTIONS, resolveCategoryIcon } from '@/lib/admin/category-icons';

interface IconPickerFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (icon: string) => void;
}

export function IconPickerField({ id, label, value, onChange }: IconPickerFieldProps) {
  const { t } = useTranslation();
  const SelectedIcon = resolveCategoryIcon(value);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </label>
      <div
        className="flex items-stretch overflow-hidden rounded-[10px] border"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <span
          aria-hidden="true"
          className="flex flex-shrink-0 items-center justify-center border-r"
          style={{
            width: '42px',
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--brand-500)',
          }}
        >
          <SelectedIcon size={18} />
        </span>
        <div className="relative flex-1">
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full cursor-pointer appearance-none bg-transparent py-2.5 pl-3 pr-9 text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {CATEGORY_ICON_OPTIONS.map(({ key }) => (
              <option key={key} value={key}>
                {t(`admin.categories.modal.iconOptions.${key}`)}
              </option>
            ))}
          </select>
          <IconChevronDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-secondary)' }}
          />
        </div>
      </div>
    </div>
  );
}
