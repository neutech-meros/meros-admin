'use client';

import { useState, type ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import type {
  BusinessAccountRequest,
  BusinessAccountRequestStatus,
} from '@/lib/admin/business-accounts-api';
import { statusStyle } from '@/lib/admin/status-styles';

// Canonical reject reasons, verbatim from the mockup, in display order. The value passed to
// onReject is always one of these English strings (stable regardless of UI language); the
// i18n key is only used for the option's visible label.
export const REJECT_REASONS = [
  { value: "Documents don't match the company", i18nKey: 'reasonDocumentsMismatch' },
  { value: 'Tax ID could not be validated', i18nKey: 'reasonTaxIdInvalid' },
  { value: 'Business not eligible for the platform', i18nKey: 'reasonNotEligible' },
  { value: 'Suspected fraudulent request', i18nKey: 'reasonSuspectedFraud' },
  { value: 'Other', i18nKey: 'reasonOther' },
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number]['value'];

export const BUSINESS_REQUEST_STATUS_I18N_KEY: Record<BusinessAccountRequestStatus, string> = {
  Pending: 'admin.businessAccounts.drawer.statusPending',
  'More info': 'admin.businessAccounts.drawer.statusMoreInfo',
  Approved: 'admin.businessAccounts.drawer.statusApproved',
  Rejected: 'admin.businessAccounts.drawer.statusRejected',
};

interface BusinessAccountDetailDrawerProps {
  request: BusinessAccountRequest | null; // null = closed
  onClose: () => void;
  onRequestInfo: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: RejectReason, note: string | null) => void;
}

const K = 'admin.businessAccounts.drawer';
const ROW_BORDER = { borderBottom: '1px solid var(--border-subtle)' };
const FIELD_STYLE = {
  borderColor: 'var(--border-subtle)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
};

function InfoRow({
  label,
  mono = false,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="py-3" style={ROW_BORDER}>
      <div
        data-testid="info-row-label"
        className="text-xs font-medium tracking-wide uppercase"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </div>
      <div
        data-testid="info-row-value"
        className={`mt-1 text-sm${mono ? ' tabular-nums' : ''}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {children}
      </div>
    </div>
  );
}

interface RejectDialogProps {
  request: BusinessAccountRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: RejectReason, note: string | null) => void;
}

// Mounted with key={request.id} so a half-filled form never leaks into another request.
function RejectDialog({ request, open, onOpenChange, onConfirm }: RejectDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<RejectReason>(REJECT_REASONS[0].value);
  const [details, setDetails] = useState('');
  const reasonId = `reject-reason-${request.id}`;
  const detailsId = `reject-details-${request.id}`;

  function handleConfirm() {
    const trimmed = details.trim();
    onConfirm(reason, trimmed === '' ? null : trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: 'var(--bg-elevated)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>
            {t(`${K}.rejectTitle`)}
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--text-secondary)' }}>
            {t(`${K}.rejectDescription`, { requester: request.requester, name: request.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={reasonId}
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {t(`${K}.reasonLabel`)}
            </label>
            <select
              id={reasonId}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value as RejectReason)}
              className="rounded-[10px] border px-3.5 py-3 text-sm font-medium"
              style={FIELD_STYLE}
            >
              {REJECT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(`${K}.${r.i18nKey}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={detailsId}
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {t(`${K}.detailsLabel`)}{' '}
              <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>
                ({t(`${K}.optional`)})
              </span>
            </label>
            <textarea
              id={detailsId}
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t(`${K}.detailsPlaceholder`)}
              className="rounded-[10px] border px-3.5 py-3 text-sm"
              style={FIELD_STYLE}
            />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t(`${K}.detailsHelp`)}
            </p>
          </div>

          <div
            className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-xs"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none' }}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            {/* A missing email means the requester genuinely won't be notified — say that
                plainly instead of the misleading "Sending to —" the mapper's placeholder
                would otherwise produce. */}
            <span>
              {request.email
                ? t(`${K}.sendingTo`, { email: request.email })
                : t(`${K}.noEmailOnFile`)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-[10px] border px-4 py-2 text-sm font-semibold"
            style={FIELD_STYLE}
          >
            {t(`${K}.cancel`)}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--danger)', border: 'none' }}
          >
            {t(`${K}.confirmReject`)}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ApproveDialogProps {
  request: BusinessAccountRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

// Approve is irreversible (only IN_REVIEW accounts are ever reviewed again — there's no path
// back from Approved in this tool), and it sits right next to the destructive Reject button,
// so it gets the same confirm-before-acting treatment as Reject rather than firing on one click.
function ApproveDialog({ request, open, onOpenChange, onConfirm }: ApproveDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: 'var(--bg-elevated)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>
            {t(`${K}.approveTitle`)}
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--text-secondary)' }}>
            {t(`${K}.approveDescription`, { name: request.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-[10px] border px-4 py-2 text-sm font-semibold"
            style={FIELD_STYLE}
          >
            {t(`${K}.cancel`)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--brand-500)', border: 'none' }}
          >
            {t(`${K}.confirmApprove`)}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BusinessAccountDetailDrawer({
  request,
  onClose,
  onRequestInfo,
  onApprove,
  onReject,
}: BusinessAccountDetailDrawerProps) {
  const { t } = useTranslation();
  // Tracks which request each confirmation dialog is open for, so switching requests closes
  // either one and never leaks state into another request.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (!request) {
    return (
      <Sheet open={false} onOpenChange={handleOpenChange}>
        <SheetContent />
      </Sheet>
    );
  }

  const current = request;
  const badge = statusStyle(current.status);
  const underReview = current.status === 'Pending' || current.status === 'More info';

  function handleRequestInfo() {
    onRequestInfo(current.id);
    onClose();
  }

  function handleConfirmApprove() {
    setApprovingId(null);
    onApprove(current.id);
    onClose();
  }

  function handleConfirmReject(reason: RejectReason, note: string | null) {
    setRejectingId(null);
    onReject(current.id, reason, note);
    onClose();
  }

  return (
    <>
      <Sheet open onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="gap-0 p-0 sm:max-w-none"
          style={{ width: '480px', maxWidth: '92vw', background: 'var(--bg-elevated)' }}
        >
          <div className="px-6 pt-6 pr-12 pb-4" style={ROW_BORDER}>
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {current.name}
              </SheetTitle>
              <span
                className="inline-flex items-center px-2.5 py-0.5"
                style={{
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: badge.color,
                  background: badge.background,
                }}
              >
                {t(BUSINESS_REQUEST_STATUS_I18N_KEY[current.status])}
              </span>
            </div>
            <SheetDescription className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {current.city}
            </SheetDescription>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pt-2 pb-4">
            <InfoRow label={t(`${K}.taxId`)} mono>
              {current.cnpj}
            </InfoRow>
            <InfoRow label={t(`${K}.category`)}>{current.category}</InfoRow>
            <InfoRow label={t(`${K}.requestedPlan`)}>{current.plan}</InfoRow>
            <InfoRow label={t(`${K}.requestedBy`)}>{current.requester}</InfoRow>
            <InfoRow label={t(`${K}.contactEmail`)}>{current.email ?? t(`${K}.noEmail`)}</InfoRow>
            <InfoRow label={t(`${K}.submittedOn`)} mono>
              {current.submitted}
            </InfoRow>
            <InfoRow label={t(`${K}.documentsReceived`)}>
              {t('admin.businessAccounts.docsCount', {
                submitted: current.documentsSubmitted,
                required: current.documentsRequired,
              })}
            </InfoRow>
            <InfoRow label={t(`${K}.reviewNote`)}>{current.note}</InfoRow>
          </div>

          <div
            className="flex justify-end gap-2 px-6 py-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            {underReview ? (
              <>
                <button
                  type="button"
                  onClick={handleRequestInfo}
                  className="rounded-[10px] border px-4 py-2 text-sm font-semibold"
                  style={FIELD_STYLE}
                >
                  {t(`${K}.requestInfo`)}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingId(current.id)}
                  className="rounded-[10px] border px-4 py-2 text-sm font-semibold"
                  style={{
                    borderColor: 'var(--danger)',
                    color: 'var(--danger)',
                    background: 'var(--bg-elevated)',
                  }}
                >
                  {t(`${K}.reject`)}
                </button>
                <button
                  type="button"
                  onClick={() => setApprovingId(current.id)}
                  className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: 'var(--brand-500)', border: 'none' }}
                >
                  {t(`${K}.approve`)}
                </button>
              </>
            ) : (
              <button
                type="button"
                data-testid="drawer-close-action"
                onClick={onClose}
                className="rounded-[10px] border px-4 py-2 text-sm font-semibold"
                style={FIELD_STYLE}
              >
                {t(`${K}.close`)}
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ApproveDialog
        key={`approve-${current.id}`}
        request={current}
        open={approvingId === current.id}
        onOpenChange={(open) => setApprovingId(open ? current.id : null)}
        onConfirm={handleConfirmApprove}
      />

      <RejectDialog
        key={`reject-${current.id}`}
        request={current}
        open={rejectingId === current.id}
        onOpenChange={(open) => setRejectingId(open ? current.id : null)}
        onConfirm={handleConfirmReject}
      />
    </>
  );
}
