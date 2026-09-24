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
import { statusStyle, typeStyle } from '@/lib/admin/status-styles';
import type { RecentUserRow } from '@/lib/mocks/admin/dashboard';

export function RecentUsersTable({ rows }: { rows: RecentUserRow[] }) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-[14px] border"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      <div className="px-6 pt-5">
        <h3 className="text-lg font-semibold">{t('admin.dashboard.latestUsers')}</h3>
      </div>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.dashboard.name')}</TableHead>
            <TableHead>{t('admin.dashboard.type')}</TableHead>
            <TableHead>{t('admin.dashboard.joined')}</TableHead>
            <TableHead>{t('admin.dashboard.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((u, i) => {
            const sStyle = statusStyle(u.status);
            const tStyle = typeStyle(u.type);
            return (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ background: u.avatarColor }}
                    >
                      {u.initials}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ color: tStyle.color, background: tStyle.background }}
                  >
                    {u.type}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">{u.joined}</TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ color: sStyle.color, background: sStyle.background }}
                  >
                    {u.status}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
