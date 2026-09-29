'use client';

import { useTranslation } from 'react-i18next';

import { IconChevronRight } from '@/components/admin/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CategoryRow } from '@/lib/admin/categories-tree';

const LEVEL_LABEL_KEY: Record<CategoryRow['level'], string> = {
  Parent: 'admin.categories.level.parent',
  Subcategory: 'admin.categories.level.subcategory',
  Child: 'admin.categories.level.child',
};

interface CategoryTreeTableProps {
  rows: CategoryRow[];
  onToggle: (row: CategoryRow) => void;
  onAddChild: (row: CategoryRow) => void;
  onEdit: (row: CategoryRow) => void;
}

export function CategoryTreeTable({ rows, onToggle, onAddChild, onEdit }: CategoryTreeTableProps) {
  const { t } = useTranslation();

  return (
    <div
      className="overflow-x-auto rounded-[14px] border"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.categories.table.category')}</TableHead>
            <TableHead>{t('admin.categories.table.level')}</TableHead>
            <TableHead>{t('admin.categories.table.slug')}</TableHead>
            <TableHead>{t('admin.categories.table.children')}</TableHead>
            <TableHead>{t('admin.categories.table.places')}</TableHead>
            <TableHead>{t('admin.categories.table.status')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <TableRow key={row.slug} onClick={() => onToggle(row)} className="cursor-pointer">
                <TableCell style={{ paddingLeft: `${16 + row.depth * 28}px` }}>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-4 w-4 flex-shrink-0 items-center justify-center transition-transform"
                      style={{
                        visibility: row.hasChildren ? 'visible' : 'hidden',
                        color: 'var(--text-secondary)',
                        transform: row.isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      <IconChevronRight size={14} />
                    </span>
                    {!row.hasChildren && (
                      <span
                        aria-hidden="true"
                        className="mx-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: 'var(--border-strong)' }}
                      />
                    )}
                    {Icon && (
                      <span
                        className="flex flex-shrink-0 items-center justify-center rounded-[7px]"
                        style={{
                          width: row.depth === 0 ? '28px' : '24px',
                          height: row.depth === 0 ? '28px' : '24px',
                          background: 'var(--brand-100)',
                          color: 'var(--brand-500)',
                        }}
                      >
                        <Icon size={row.depth === 0 ? 18 : 16} />
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: row.depth === 0 ? '14.5px' : '13.5px',
                        fontWeight: row.depth === 0 ? 600 : row.depth === 1 ? 500 : 400,
                        color: row.depth === 2 ? 'var(--text-secondary)' : 'var(--text-primary)',
                      }}
                    >
                      {row.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell style={{ color: 'var(--text-secondary)' }} className="text-xs">
                  {t(LEVEL_LABEL_KEY[row.level])}
                </TableCell>
                <TableCell
                  className="tabular-nums text-[12.5px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {row.slug}
                </TableCell>
                <TableCell style={{ color: 'var(--text-secondary)' }}>
                  {row.hasChildren
                    ? t('admin.categories.childCount.subcategories', { count: row.childCount })
                    : '—'}
                </TableCell>
                <TableCell className="tabular-nums">
                  {t('admin.categories.itemsLabel', { count: row.items })}
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      color: row.status === 'Active' ? 'var(--success)' : 'var(--text-secondary)',
                      background:
                        row.status === 'Active' ? 'var(--success-bg)' : 'var(--bg-surface-hover)',
                    }}
                  >
                    {row.status === 'Active'
                      ? t('admin.categories.modal.statusActive')
                      : t('admin.categories.modal.statusDeactivated')}
                  </span>
                </TableCell>
                <TableCell
                  className="text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end gap-1.5">
                    {row.depth < 2 && (
                      <button
                        type="button"
                        onClick={() => onAddChild(row)}
                        className="rounded-[10px] border px-3 py-1.5 text-xs font-semibold"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {t('admin.categories.table.addChild')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="rounded-[10px] border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {t('admin.categories.table.edit')}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
