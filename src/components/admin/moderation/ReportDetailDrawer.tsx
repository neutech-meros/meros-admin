'use client';

import { useState, type ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import type { ReportedItem } from '@/lib/admin/moderation';
import { ACCOUNT_STATUS_I18N_KEY, SEVERITY_I18N_KEY } from '@/lib/admin/moderation-labels';
import { statusStyle } from '@/lib/admin/status-styles';

interface ReportDetailDrawerProps {
  report: ReportedItem | null; // null = closed
  onClose: () => void;
  onKeep: (id: string) => void;
  onRemove: (id: string) => void;
}

const ROW_BORDER = { borderBottom: '1px solid var(--border-subtle)' };

// One labeled row of the drawer: small secondary label above a primary value.
// Every section uses this so the drawer reads as a single consistent list.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3" style={ROW_BORDER}>
      <div
        className="text-xs font-medium tracking-wide uppercase"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </div>
      <div className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
        {children}
      </div>
    </div>
  );
}

// Generic profile-photo placeholder: none of the reporters in this app have a real avatar
// image yet, so every reporter row shows this same person icon instead of initials.
function ReporterAvatar() {
  return (
    <span
      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
      style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}
    >
      <svg
        viewBox="0 0 24 24"
        style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none' }}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
      </svg>
    </span>
  );
}

export function ReportDetailDrawer({ report, onClose, onKeep, onRemove }: ReportDetailDrawerProps) {
  const { t } = useTranslation();
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pendingAction, setPendingAction] = useState<'keep' | 'remove' | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (!report) {
    return (
      <Sheet open={false} onOpenChange={handleOpenChange}>
        <SheetContent />
      </Sheet>
    );
  }

  const busy = pendingAction !== null;

  function handleKeep() {
    if (!report || busy) return;
    setPendingAction('keep');
    onKeep(report.id);
  }

  function handleConfirmRemove() {
    if (!report || busy) return;
    setPendingAction('remove');
    setConfirmingRemove(false);
    onRemove(report.id);
  }

  const severity = statusStyle(report.severity);
  const accountStatusText = report.accountStatus
    ? t(ACCOUNT_STATUS_I18N_KEY[report.accountStatus])
    : '—';
  const priorRemovalsText =
    report.priorRemovals === 0
      ? t('admin.moderation.drawer.accountHistoryNone')
      : t('admin.moderation.drawer.accountHistory', { count: report.priorRemovals });

  return (
    <>
      <Sheet open onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="gap-0 p-0 sm:max-w-none"
          style={{ width: '480px', maxWidth: '92vw', background: 'var(--bg-elevated)' }}
        >
          <div className="px-6 pt-6 pb-4 pr-12" style={ROW_BORDER}>
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('admin.moderation.drawer.title', { kind: report.kind })}
              </SheetTitle>
              <span
                className="inline-flex items-center px-2.5 py-0.5"
                style={{
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: severity.color,
                  background: severity.background,
                }}
              >
                {t(SEVERITY_I18N_KEY[report.severity])}
              </span>
            </div>
            <SheetDescription className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {report.title}
            </SheetDescription>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
            <div
              style={{
                height: '120px',
                borderRadius: '10px',
                marginBottom: '20px',
                background: '#7B03F3',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '16px',
                color: '#fff',
                fontWeight: 600,
                fontSize: '16px',
              }}
            >
              {report.title}
            </div>

            <Field label={t('admin.moderation.drawer.reportedContentLabel')}>
              {report.excerpt ?? '—'}
            </Field>
            <Field label={t('admin.moderation.drawer.contentTypeLabel')}>{report.kind}</Field>
            <Field label={t('admin.moderation.drawer.whereItLivesLabel')}>{report.where}</Field>
            <Field label={t('admin.moderation.drawer.accountLabel')}>
              {t('admin.moderation.drawer.accountLine', {
                owner: report.owner,
                handle: report.handle,
                account: report.account,
                status: accountStatusText,
              })}
            </Field>
            <Field label={t('admin.moderation.drawer.reasonLabel')}>{report.reason}</Field>

            <div className="pt-4 pb-1">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('admin.moderation.drawer.reportedBy', { count: report.reporters.length })}
              </h3>
            </div>
            <ul>
              {report.reporters.map((r, i) => (
                <li key={`${r.handle}-${i}`} className="py-3" style={ROW_BORDER}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <ReporterAvatar />
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {r.name}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{r.handle}</span>
                    </div>
                    <span
                      className="flex-shrink-0 text-xs tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {r.date}
                    </span>
                  </div>
                  <div className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {r.reason}
                  </div>
                </li>
              ))}
            </ul>

            <Field label={t('admin.moderation.drawer.accountHistoryLabel')}>
              {priorRemovalsText}
            </Field>
          </div>

          <div
            className="flex justify-end gap-2 px-6 py-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                toast.info(t('admin.moderation.drawer.openAccount'), {
                  description: t('admin.moderation.drawer.openAccountUnavailable', {
                    owner: report.owner,
                    handle: report.handle,
                  }),
                })
              }
              className="mr-auto rounded-[10px] border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                background: 'var(--bg-elevated)',
              }}
            >
              {t('admin.moderation.drawer.openAccount')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmingRemove(true)}
              className="rounded-[10px] border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                borderColor: 'var(--danger)',
                color: 'var(--danger)',
                background: 'var(--bg-elevated)',
              }}
            >
              {t('admin.moderation.drawer.removeContent')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleKeep}
              className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#7B03F3', border: 'none' }}
            >
              {t('admin.moderation.drawer.keepContent')}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.moderation.drawer.confirmRemoveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.moderation.drawer.confirmRemoveDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('admin.moderation.drawer.confirmRemoveCancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>
              {t('admin.moderation.drawer.confirmRemoveConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
