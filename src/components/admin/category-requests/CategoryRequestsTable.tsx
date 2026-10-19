'use client';

import { useTranslation } from 'react-i18next';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requestStatusTone, STATUS_LABEL_KEY } from '@/lib/admin/category-requests';
import type { CategoryRequest } from '@/lib/mocks/admin/category-requests';

interface CategoryRequestsTableProps {
  requests: CategoryRequest[];
  onRowClick: (request: CategoryRequest) => void;
  onApprove: (request: CategoryRequest) => void;
  onReject: (request: CategoryRequest) => void;
}

export function CategoryRequestsTable({
  requests,
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
      {requests.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.categoryRequests.table.category')}</TableHead>
              <TableHead>{t('admin.categoryRequests.table.parentPath')}</TableHead>
              <TableHead>{t('admin.categoryRequests.table.requestedBy')}</TableHead>
              <TableHead>{t('admin.categoryRequests.table.votes')}</TableHead>
              <TableHead>{t('admin.categoryRequests.table.requested')}</TableHead>
              <TableHead>{t('admin.categoryRequests.table.status')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const tone = requestStatusTone(request.status);
              const open = request.status === 'Pending';
              return (
                <TableRow
                  key={request.id}
                  onClick={() => onRowClick(request)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="font-medium">{request.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {request.level}
                    </div>
                  </TableCell>
                  <TableCell style={{ color: 'var(--text-secondary)' }}>{request.parent}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                        style={{ background: request.avatarColor }}
                      >
                        {request.initials}
                      </div>
                      <div>
                        <div>{request.requester}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {request.handle}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{request.votes}</TableCell>
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
                    className="text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1.5">
                      {open ? (
                        <>
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
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRowClick(request)}
                          className="rounded-[10px] border px-3.5 py-1.5 text-xs font-semibold"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {t('admin.categoryRequests.table.view')}
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div
          className="flex flex-col items-center justify-center px-6 py-14 text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          <h3 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('admin.categoryRequests.emptyTitle')}
          </h3>
          <p className="max-w-[320px] text-[13.5px]">
            {t('admin.categoryRequests.emptyDescription')}
          </p>
        </div>
      )}
    </div>
  );
}
