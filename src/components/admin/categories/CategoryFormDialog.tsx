'use client';

import { useTranslation } from 'react-i18next';

import { IconChevronDown } from '@/components/admin/icons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CATEGORY_ICON_OPTIONS, resolveCategoryIcon } from '@/lib/admin/category-icons';

export interface CategoryFormState {
  mode: 'add' | 'edit';
  slug: string | null;
  parentName: string | null;
  name: string;
  status: 'Active' | 'Deactivated';
  icon: string;
}

interface CategoryFormDialogProps {
  state: CategoryFormState | null;
  onNameChange: (name: string) => void;
  onStatusChange: (status: 'Active' | 'Deactivated') => void;
  onIconChange: (icon: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function CategoryFormDialog({
  state,
  onNameChange,
  onStatusChange,
  onIconChange,
  onCancel,
  onSave,
}: CategoryFormDialogProps) {
  const { t } = useTranslation();
  const K = 'admin.categories.modal';

  if (!state) {
    return (
      <Dialog open={false} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent />
      </Dialog>
    );
  }

  const subtitle =
    state.mode === 'edit'
      ? state.status === 'Active'
        ? t(`${K}.subEditSlugUnchanged`)
        : t(`${K}.subEditSlugUnchangedDeactivating`)
      : state.parentName
        ? t(`${K}.subCreateUnderParent`, { parentName: state.parentName })
        : t(`${K}.subCreateTopLevel`);

  const SelectedIcon = resolveCategoryIcon(state.icon);
  const iconSelectId = 'category-form-icon';

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        className="max-w-[420px] gap-0 p-6"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <DialogTitle className="text-[18px] font-semibold tracking-tight">
          {state.mode === 'edit' ? t(`${K}.editTitle`) : t(`${K}.newTitle`)}
        </DialogTitle>
        <DialogDescription
          className="mb-5 text-[12.5px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {subtitle}
        </DialogDescription>

        <label
          htmlFor="category-form-name"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t(`${K}.nameLabel`)}
        </label>
        <input
          id="category-form-name"
          autoFocus
          value={state.name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={t(`${K}.namePlaceholder`)}
          className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />

        <label
          htmlFor={iconSelectId}
          className="mb-1.5 mt-5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t(`${K}.iconLabel`)}
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
              id={iconSelectId}
              value={state.icon}
              onChange={(e) => onIconChange(e.target.value)}
              className="w-full cursor-pointer appearance-none bg-transparent py-2.5 pl-3 pr-9 text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            >
              {CATEGORY_ICON_OPTIONS.map(({ key }) => (
                <option key={key} value={key}>
                  {t(`${K}.iconOptions.${key}`)}
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

        <label
          className="mb-1.5 mt-5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t(`${K}.statusLabel`)}
        </label>
        <div className="flex gap-2">
          {(['Active', 'Deactivated'] as const).map((option) => {
            const on = state.status === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onStatusChange(option)}
                className="flex-1 rounded-[10px] border px-3 py-2.5 text-[13px]"
                style={{
                  borderColor: on
                    ? option === 'Active'
                      ? 'var(--success)'
                      : 'var(--border-strong)'
                    : 'var(--border-subtle)',
                  background: on
                    ? option === 'Active'
                      ? 'var(--success-bg)'
                      : 'var(--bg-surface-hover)'
                    : 'var(--bg-elevated)',
                  color: on
                    ? option === 'Active'
                      ? 'var(--success)'
                      : 'var(--text-primary)'
                    : 'var(--text-secondary)',
                  fontWeight: on ? 600 : 500,
                }}
              >
                {option === 'Active' ? t(`${K}.statusActive`) : t(`${K}.statusDeactivated`)}
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {state.status === 'Active' ? t(`${K}.hintActive`) : t(`${K}.hintDeactivated`)}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border px-4 py-2.5 text-[13.5px] font-semibold"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            {t(`${K}.cancel`)}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-[10px] border px-4 py-2.5 text-[13.5px] font-semibold text-white"
            style={{ borderColor: 'var(--brand-500)', background: 'var(--brand-500)' }}
          >
            {state.mode === 'edit' ? t(`${K}.saveCta`) : t(`${K}.createCta`)}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
