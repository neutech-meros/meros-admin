'use client';

import { useTranslation } from 'react-i18next';

import { DrawerBlocks, type DrawerBlock } from '@/components/admin/drawer/DrawerBlocks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  LEVEL_LABEL_KEY,
  requesterInitials,
  requestStatusTone,
  STATUS_LABEL_KEY,
} from '@/lib/admin/category-requests';
import type { CategoryRequestItem } from '@/lib/admin/category-requests-api';

const K = 'admin.categoryRequests.drawer';
const UNAVAILABLE = '—';

interface CategoryRequestDetailDrawerProps {
  request: CategoryRequestItem | null;
  onClose: () => void;
  onApprove: (request: CategoryRequestItem) => void;
  onReject: (request: CategoryRequestItem) => void;
}

function decisionBlocks(request: CategoryRequestItem, t: (key: string) => string): DrawerBlock[] {
  if (request.decision === null) return [];
  const blocks: DrawerBlock[] = [
    {
      kind: 'kv',
      label: t(`${K}.decidedOn`),
      value: request.decision.decidedAt ?? UNAVAILABLE,
      numeric: true,
    },
  ];
  if (request.status === 'Rejected') {
    blocks.push({
      kind: 'kv',
      label: t(`${K}.rejectionReason`),
      value: request.decision.reason ?? UNAVAILABLE,
    });
  }
  return blocks;
}

export function CategoryRequestDetailDrawer({
  request,
  onClose,
  onApprove,
  onReject,
}: CategoryRequestDetailDrawerProps) {
  const { t } = useTranslation();

  if (!request) {
    return (
      <Sheet open={false} onOpenChange={(open) => !open && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const tone = requestStatusTone(request.status);
  const blocks: DrawerBlock[] = [
    { kind: 'kv', label: t(`${K}.proposedName`), value: request.name },
    {
      kind: 'kv',
      label: t(`${K}.level`),
      value: request.level === null ? UNAVAILABLE : t(LEVEL_LABEL_KEY[request.level]),
    },
    { kind: 'kv', label: t(`${K}.requestedBy`), value: request.requester },
    { kind: 'kv', label: t(`${K}.requestedOn`), value: request.date, numeric: true },
    ...decisionBlocks(request, t),
  ];

  return (
    <Sheet open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        className="w-full gap-0 p-0 sm:max-w-none"
        style={{
          width: '480px',
          maxWidth: '92vw',
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="flex flex-shrink-0 items-center justify-between gap-3 border-b p-5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar className="h-11 w-11">
              {request.avatarUrl ? <AvatarImage src={request.avatarUrl} alt="" /> : null}
              <AvatarFallback
                className="text-[15px] font-semibold"
                style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}
              >
                {requesterInitials(request.requester)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg font-semibold">{request.name}</SheetTitle>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ color: tone.color, background: tone.background }}
                >
                  {t(STATUS_LABEL_KEY[request.status])}
                </span>
              </div>
              <SheetDescription className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t(`${K}.subtitle`, { requester: request.requester })}
              </SheetDescription>
            </div>
          </div>
        </div>

        <DrawerBlocks blocks={blocks} />

        <div
          className="flex flex-shrink-0 justify-end gap-2 border-t p-5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {request.status === 'Pending' ? (
            <>
              <button
                type="button"
                onClick={() => onReject(request)}
                className="rounded-[10px] border px-4 py-2.5 text-[13.5px] font-semibold"
                style={{
                  borderColor: 'var(--danger)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--danger)',
                }}
              >
                {t(`${K}.reject`)}
              </button>
              <button
                type="button"
                onClick={() => onApprove(request)}
                className="rounded-[10px] border px-4 py-2.5 text-[13.5px] font-semibold text-white"
                style={{ borderColor: 'var(--brand-500)', background: 'var(--brand-500)' }}
              >
                {t(`${K}.createCategory`)}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border px-4 py-2.5 text-[13.5px] font-semibold"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              {t(`${K}.close`)}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
