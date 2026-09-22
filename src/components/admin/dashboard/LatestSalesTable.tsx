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
import { statusStyle } from '@/lib/admin/status-styles';
import type { SaleRow } from '@/lib/mocks/admin/dashboard';

export function LatestSalesTable({ rows }: { rows: SaleRow[] }) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-[14px] border"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      <div className="px-6 pt-5">
        <h3 className="text-lg font-semibold">{t('admin.dashboard.latestSales')}</h3>
      </div>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.dashboard.buyer')}</TableHead>
            <TableHead>{t('admin.dashboard.list')}</TableHead>
            <TableHead>{t('admin.dashboard.amount')}</TableHead>
            <TableHead>{t('admin.dashboard.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o, i) => {
            const style = statusStyle(o.status);
            return (
              <TableRow key={i}>
                <TableCell>{o.buyer}</TableCell>
                <TableCell className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {o.list}
                </TableCell>
                <TableCell className="tabular-nums">{o.amount}</TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ color: style.color, background: style.background }}
                  >
                    {o.status}
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
