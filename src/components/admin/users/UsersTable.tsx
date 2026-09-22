// src/components/admin/users/UsersTable.tsx
'use client';

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
import { badgeTone } from '@/lib/admin/badge-tone';
import { type SortKey, type SortState, SORT_COLUMNS } from '@/lib/admin/users-table';
import type { UserRecord } from '@/lib/mocks/admin/users';

const COLUMN_LABELS: Record<SortKey, string> = {
  name: 'Name',
  account: 'Account',
  plan: 'Plan',
  followers: 'Followers',
  joined: 'Joined',
  status: 'Status',
};

interface UsersTableProps {
  users: UserRecord[];
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

export function UsersTable({
  users,
  sort,
  onSortChange,
  onRowClick,
  onViewProfile,
  onResetPassword,
  onDeactivate,
  onDelete,
}: UsersTableProps) {
  const { t } = useTranslation();

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
                    onClick={() => onSortChange(key)}
                    className="cursor-pointer select-none"
                    style={{
                      color: sort.key === key ? 'var(--brand-600)' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {COLUMN_LABELS[key]}
                      <span className="text-[9px]">{sortArrow(sort, key)}</span>
                    </span>
                  </TableHead>
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
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
                        {u.account === 'Business' ? 'Creator' : 'User'}
                      </span>
                    </TableCell>
                    <TableCell>{u.plan}</TableCell>
                    <TableCell className="tabular-nums">{u.followers}</TableCell>
                    <TableCell className="tabular-nums">{u.joined}</TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ color: statusTone.color, background: statusTone.background }}
                      >
                        {u.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Actions for ${u.name}`}
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
                            View profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onResetPassword(u)}>
                            Reset password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onDeactivate(u)}
                            style={{ color: 'var(--warning)' }}
                          >
                            {u.status === 'Deactivated'
                              ? 'Reactivate account'
                              : 'Deactivate account'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onDelete(u)}
                            style={{ color: 'var(--danger)' }}
                          >
                            Delete account
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
            <span>{t('admin.users.footerText', { count: users.length })}</span>
            <div className="flex gap-1">
              {['‹', '1', '2', '3', '›'].map((label, i) => (
                <button
                  key={i}
                  type="button"
                  className="h-7 w-7 rounded-md border"
                  style={{
                    borderColor: i === 1 ? 'transparent' : 'var(--border-subtle)',
                    background: i === 1 ? 'var(--brand-100)' : 'transparent',
                    color: i === 1 ? 'var(--brand-600)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
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
