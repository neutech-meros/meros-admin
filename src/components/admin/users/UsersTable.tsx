// src/components/admin/users/UsersTable.tsx
'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UNKNOWN_VALUE } from '@/lib/admin/accounts';
import { badgeTone } from '@/lib/admin/badge-tone';
import {
  paginateUsers,
  PLAN_LABEL_KEY,
  type SortKey,
  type SortState,
  SORT_COLUMNS,
  STATUS_LABEL_KEY,
} from '@/lib/admin/users-table';
import type { UserRecord } from '@/lib/mocks/admin/users';

const COLUMN_LABEL_KEY: Record<SortKey, string> = {
  name: 'admin.users.table.columnName',
  account: 'admin.users.table.columnAccount',
  plan: 'admin.users.table.columnPlan',
  followers: 'admin.users.table.columnFollowers',
  joined: 'admin.users.table.columnJoined',
  status: 'admin.users.table.columnStatus',
};

interface UsersTableProps {
  users: UserRecord[];
  total: number;
  loadedCount: number;
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  onRowClick: (user: UserRecord) => void;
  onViewProfile: (user: UserRecord) => void;
  onResetPassword: (user: UserRecord) => void;
  onDeactivate: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
}

function sortArrow(sort: SortState, key: SortKey): string {
  if (sort.key !== key) return '';
  return sort.dir === 'asc' ? '▲' : '▼';
}

function ariaSort(sort: SortState, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.dir === 'asc' ? 'ascending' : 'descending';
}

export function UsersTable({
  users,
  total,
  loadedCount,
  sort,
  onSortChange,
  onRowClick,
  onViewProfile,
  onResetPassword,
  onDeactivate,
  onDelete,
}: UsersTableProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [users]);

  const {
    pageItems,
    page: currentPage,
    pageCount,
    startIndex,
    endIndex,
  } = paginateUsers(users, page);

  return (
    <div
      className="overflow-x-auto rounded-[14px] border"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      {users.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {SORT_COLUMNS.map(({ key }) => (
                  <TableHead
                    key={key}
                    aria-sort={ariaSort(sort, key)}
                    className="select-none"
                    style={{
                      color: sort.key === key ? 'var(--brand-600)' : 'var(--text-secondary)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSortChange(key)}
                      className="inline-flex cursor-pointer items-center gap-1 font-[inherit] text-inherit"
                    >
                      {t(COLUMN_LABEL_KEY[key])}
                      <span aria-hidden="true" className="text-[9px]">
                        {sortArrow(sort, key)}
                      </span>
                    </button>
                  </TableHead>
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((u) => {
                const acctTone = badgeTone(u.account === 'Business' ? 'Creator' : 'User');
                const statusTone = badgeTone(u.status);
                return (
                  <TableRow key={u.id} onClick={() => onRowClick(u)} className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                          style={{ background: u.avatarColor }}
                        >
                          {u.initials}
                        </div>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ color: acctTone.color, background: acctTone.background }}
                      >
                        {t(
                          u.account === 'Business'
                            ? 'admin.users.accountOptions.business'
                            : 'admin.users.accountOptions.personal',
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{u.plan ? t(PLAN_LABEL_KEY[u.plan]) : UNKNOWN_VALUE}</TableCell>
                    <TableCell className="tabular-nums">{u.followers}</TableCell>
                    <TableCell className="tabular-nums">{u.joined}</TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ color: statusTone.color, background: statusTone.background }}
                      >
                        {t(STATUS_LABEL_KEY[u.status])}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={t('admin.users.table.actionsFor', { name: u.name })}
                            className="rounded-md p-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width={18}
                              height={18}
                              stroke="currentColor"
                              fill="none"
                              strokeWidth={1.6}
                            >
                              <circle cx="5" cy="12" r="1.3" />
                              <circle cx="12" cy="12" r="1.3" />
                              <circle cx="19" cy="12" r="1.3" />
                            </svg>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onViewProfile(u)}>
                            {t('admin.users.table.viewProfile')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onResetPassword(u)}>
                            {t('admin.users.table.resetPassword')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onDeactivate(u)}
                            style={{ color: 'var(--warning)' }}
                          >
                            {u.status === 'Deactivated'
                              ? t('admin.users.table.reactivateAccount')
                              : t('admin.users.table.deactivateAccount')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onDelete(u)}
                            style={{ color: 'var(--danger)' }}
                          >
                            {t('admin.users.table.deleteAccount')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div
            className="flex items-center justify-between border-t px-4 py-3 text-[13px]"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <span>
              {loadedCount < total
                ? t('admin.users.footerTextPartial', {
                    start: users.length === 0 ? 0 : startIndex + 1,
                    end: endIndex,
                    loaded: loadedCount,
                    total,
                  })
                : t('admin.users.footerText', {
                    start: users.length === 0 ? 0 : startIndex + 1,
                    end: endIndex,
                    total,
                  })}
            </span>
            {pageCount > 1 ? (
              <nav aria-label={t('admin.users.table.pagination')} className="flex gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label={t('admin.users.table.previousPage')}
                  className="h-7 w-7 rounded-md border disabled:opacity-40"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  ‹
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === currentPage ? 'page' : undefined}
                    aria-label={t('admin.users.table.pageNumber', { number: n })}
                    className="h-7 w-7 rounded-md border"
                    style={{
                      borderColor: n === currentPage ? 'transparent' : 'var(--border-subtle)',
                      background: n === currentPage ? 'var(--brand-100)' : 'transparent',
                      color: n === currentPage ? 'var(--brand-600)' : 'var(--text-secondary)',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label={t('admin.users.table.nextPage')}
                  className="h-7 w-7 rounded-md border disabled:opacity-40"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  ›
                </button>
              </nav>
            ) : null}
          </div>
        </>
      ) : (
        <div
          className="flex flex-col items-center justify-center px-6 py-16 text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          <div
            className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full"
            style={{ background: 'var(--bg-surface)' }}
          >
            <svg
              viewBox="0 0 24 24"
              width={20}
              height={20}
              stroke="currentColor"
              fill="none"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-5.4l-1.6 3H9l-1.6-3H2" />
              <path d="M5.5 5h13l3.5 7v7a2 2 0 01-2 2H4a2 2 0 01-2-2v-7z" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('admin.users.emptyTitle')}
          </h3>
          <p className="max-w-[340px] text-[13.5px]">{t('admin.users.emptyDescription')}</p>
        </div>
      )}
    </div>
  );
}
