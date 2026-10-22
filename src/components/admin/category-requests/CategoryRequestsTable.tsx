'use client';

import { useTranslation } from 'react-i18next';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LEVEL_LABEL_KEY,
  requesterInitials,
  requestStatusTone,
  STATUS_LABEL_KEY,
} from '@/lib/admin/category-requests';
import type { CategoryRequestItem } from '@/lib/admin/category-requests-api';

const UNAVAILABLE = '—';

interface CategoryRequestsTableProps {
  requests: CategoryRequestItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick: (request: CategoryRequestItem) => void;
  onApprove: (request: CategoryRequestItem) => void;
  onReject: (request: CategoryRequestItem) => void;
}

function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
}: Pick<CategoryRequestsTableProps, 'total' | 'page' | 'pageSize' | 'onPageChange'>) {
  const { t } = useTranslation();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const buttonStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' };

  return (
    <div
      className="flex items-center justify-between border-t px-4 py-3 text-[13px]"
      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
    >
      <span>{t('admin.categoryRequests.footerText', { start, end, total })}</span>
      {pageCount > 1 ? (
        <nav aria-label={t('admin.categoryRequests.pagination')} className="flex gap-1">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={t('admin.categoryRequests.previousPage')}
            className="h-7 w-7 rounded-md border disabled:opacity-40"
            style={buttonStyle}
          >
            ‹
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-current={n === page ? 'page' : undefined}
              aria-label={t('admin.categoryRequests.pageNumber', { number: n })}
              className="h-7 w-7 rounded-md border"
              style={{
                borderColor: n === page ? 'transparent' : 'var(--border-subtle)',
                background: n === page ? 'var(--brand-100)' : 'transparent',
                color: n === page ? 'var(--brand-600)' : 'var(--text-secondary)',
              }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={page === pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label={t('admin.categoryRequests.nextPage')}
            className="h-7 w-7 rounded-md border disabled:opacity-40"
            style={buttonStyle}
          >
            ›
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
      style={{ color: 'var(--text-secondary)' }}
    >
      <h3 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {t('admin.categoryRequests.emptyTitle')}
      </h3>
      <p className="max-w-[320px] text-[13.5px]">{t('admin.categoryRequests.emptyDescription')}</p>
    </div>
  );
}

export function CategoryRequestsTable({
  requests,
  total,
  page,
  pageSize,
  onPageChange,
  onRowClick,
  onApprove,
  onReject,
}: CategoryRequestsTableProps) {
  const { t } = useTranslation();

  return (
    <div
      className="overflow-x-auto rounded-[14px] border"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      {requests.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.categoryRequests.table.category')}</TableHead>
                <TableHead>{t('admin.categoryRequests.table.requestedBy')}</TableHead>
                <TableHead>{t('admin.categoryRequests.table.requested')}</TableHead>
                <TableHead>{t('admin.categoryRequests.table.status')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => {
                const tone = requestStatusTone(request.status);
                return (
                  <TableRow
                    key={request.id}
                    onClick={() => onRowClick(request)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="font-medium">{request.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {request.level === null ? UNAVAILABLE : t(LEVEL_LABEL_KEY[request.level])}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          {request.avatarUrl ? (
                            <AvatarImage src={request.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback
                            className="text-[11px] font-semibold"
                            style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}
                          >
                            {requesterInitials(request.requester)}
                          </AvatarFallback>
                        </Avatar>
                        <div>{request.requester}</div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {request.date}
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ color: tone.color, background: tone.background }}
                      >
                        {t(STATUS_LABEL_KEY[request.status])}
                      </span>
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {request.status === 'Pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onApprove(request)}
                            className="rounded-[10px] border px-3.5 py-1.5 text-xs font-semibold text-white"
                            style={{
                              borderColor: 'var(--brand-500)',
                              background: 'var(--brand-500)',
                            }}
                          >
                            {t('admin.categoryRequests.table.create')}
                          </button>
                          <button
                            type="button"
                            onClick={() => onReject(request)}
                            className="rounded-[10px] border px-3.5 py-1.5 text-xs font-semibold"
                            style={{
                              borderColor: 'var(--danger)',
                              background: 'var(--bg-elevated)',
                              color: 'var(--danger)',
                            }}
                          >
                            {t('admin.categoryRequests.table.reject')}
                          </button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
