'use client';

import { useTranslation } from 'react-i18next';

import { DrawerBlocks, type DrawerBlock } from '@/components/admin/drawer/DrawerBlocks';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { requestStatusTone, STATUS_LABEL_KEY } from '@/lib/admin/category-requests';
import type { CategoryRequest } from '@/lib/mocks/admin/category-requests';

interface CategoryRequestDetailDrawerProps {
  request: CategoryRequest | null;
  onClose: () => void;
  onAskForDetails: (request: CategoryRequest) => void;
  onReject: (request: CategoryRequest) => void;
  onApprove: (request: CategoryRequest) => void;
}

export function CategoryRequestDetailDrawer({
  request,
  onClose,
  onAskForDetails,
  onReject,
  onApprove,
}: CategoryRequestDetailDrawerProps) {
  const { t } = useTranslation();
  const K = 'admin.categoryRequests.drawer';

  if (!request) {
    return (
      <Sheet open={false} onOpenChange={(open) => !open && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const tone = requestStatusTone(request.status);
  const open = request.status === 'Pending' || request.status === 'More info';

  const blocks: DrawerBlock[] = [
    { kind: 'kv', label: t(`${K}.proposedName`), value: request.name },
    { kind: 'kv', label: t(`${K}.parentPath`), value: request.parent },
    { kind: 'kv', label: t(`${K}.level`), value: request.level },
    {
      kind: 'kv',
      label: t(`${K}.requestedBy`),
      value: `${request.requester} · ${request.handle}`,
    },
    { kind: 'kv', label: t(`${K}.account`), value: request.role },
    { kind: 'kv', label: t(`${K}.requestedOn`), value: request.date, numeric: true },
    {
      kind: 'kv',
      label: t(`${K}.communityVotes`),
      value: t(`${K}.communityVotesValue`, { count: request.votes }),
    },
    { kind: 'text', label: t(`${K}.whyTheyNeedIt`), value: request.why },
    { kind: 'text', label: t(`${K}.overlapCheck`), value: request.similar },
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
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
              style={{ background: request.avatarColor }}
            >
              {request.initials}
            </div>
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
                {t(`${K}.subtitle`, { parent: request.parent })}
              </SheetDescription>
            </div>
          </div>
        </div>

        <DrawerBlocks blocks={blocks} />

        <div
          className="flex flex-shrink-0 justify-end gap-2 border-t p-5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {open ? (
            <>
              <button
                type="button"
                onClick={() => onAskForDetails(request)}
                className="rounded-[10px] border px-4 py-2.5 text-[13.5px] font-semibold"
                style={{
                  borderColor: 'var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                }}
              >
                {t(`${K}.askForDetails`)}
              </button>
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
