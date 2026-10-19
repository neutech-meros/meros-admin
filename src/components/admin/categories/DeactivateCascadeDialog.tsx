'use client';

import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export interface DeactivateCascadeState {
  name: string;
  names: string[];
}

interface DeactivateCascadeDialogProps {
  state: DeactivateCascadeState | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeactivateCascadeDialog({
  state,
  onCancel,
  onConfirm,
}: DeactivateCascadeDialogProps) {
  const { t } = useTranslation();
  const K = 'admin.categories.cascade';

  if (!state) {
    return (
      <Dialog open={false} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent />
      </Dialog>
    );
  }

  const countLabel = t(`${K}.countLabel`, { count: state.names.length });

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        className="max-w-[440px] gap-0 p-6"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px]"
            style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
          >
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              stroke="currentColor"
              fill="none"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 9v5" />
              <path d="M12 17.5h.01" />
              <path d="M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <DialogTitle className="mb-1 text-[17px] font-semibold">
              {t(`${K}.title`, { name: state.name })}
            </DialogTitle>
            <DialogDescription
              className="text-[13px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t(`${K}.body`, { countLabel })}
            </DialogDescription>
          </div>
        </div>

        <div
          className="max-h-[168px] overflow-y-auto rounded-[10px] border px-3.5 py-3"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div
            className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t(`${K}.alsoDeactivated`)}
          </div>
          <div className="flex flex-col gap-1.5">
            {state.names.map((name) => (
              <div key={name} className="flex items-center gap-2 text-[13px]">
                <span
                  className="h-[5px] w-[5px] flex-shrink-0 rounded-full"
                  style={{ background: 'var(--text-disabled)' }}
                />
                {name}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border px-4 py-2.5 text-[13.5px] font-medium"
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
            onClick={onConfirm}
            className="rounded-[10px] border px-4 py-2.5 text-[13.5px] font-semibold text-white"
            style={{ borderColor: 'var(--warning)', background: 'var(--warning)' }}
          >
            {t(`${K}.confirm`)}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
