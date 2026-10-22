'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { CategoryRequestDetailDrawer } from '@/components/admin/category-requests/CategoryRequestDetailDrawer';
import { CategoryRequestsTable } from '@/components/admin/category-requests/CategoryRequestsTable';
import { CreateCategoryModal } from '@/components/admin/category-requests/CreateCategoryModal';
import { RejectCategoryRequestDialog } from '@/components/admin/category-requests/RejectCategoryRequestDialog';
import {
  fetchCategoryRequests,
  fetchCategoryRequestTotals,
  type CategoryRequestApiStatus,
  type CategoryRequestItem,
  type CategoryRequestTotalsResult,
} from '@/lib/admin/category-requests-api';

import { useCategoryRequestDecisions } from './useCategoryRequestDecisions';

type Tab = CategoryRequestApiStatus | 'all';
type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'disabled' }
  | { status: 'loaded'; items: CategoryRequestItem[]; total: number };

const K = 'admin.categoryRequests';
const PAGE_SIZE = 20;
const UNAVAILABLE = '—';

const TABS: Array<{ key: Tab; labelKey: string }> = [
  { key: 'PENDING', labelKey: `${K}.tabPending` },
  { key: 'APPROVED', labelKey: `${K}.tabApproved` },
  { key: 'REJECTED', labelKey: `${K}.tabRejected` },
  { key: 'all', labelKey: `${K}.tabAll` },
];

const KPIS: Array<{ key: CategoryRequestApiStatus; labelKey: string; color: string }> = [
  { key: 'PENDING', labelKey: `${K}.kpiPending`, color: 'var(--warning)' },
  { key: 'APPROVED', labelKey: `${K}.kpiApproved`, color: 'var(--success)' },
  { key: 'REJECTED', labelKey: `${K}.kpiRejected`, color: 'var(--danger)' },
];

const TOTAL_KEY = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' } as const;

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
}

export default function CategoryRequestsPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [totals, setTotals] = useState<CategoryRequestTotalsResult | null>(null);
  const [openRequest, setOpenRequest] = useState<CategoryRequestItem | null>(null);
  const decisions = useCategoryRequestDecisions(() => setReloadKey((key) => key + 1));

  function approve(request: CategoryRequestItem) {
    setOpenRequest(null);
    decisions.startApprove(request);
  }

  function reject(request: CategoryRequestItem) {
    setOpenRequest(null);
    decisions.startReject(request);
  }

  useEffect(() => {
    let cancelled = false;
    setList({ status: 'loading' });
    fetchCategoryRequests(
      { status: tab === 'all' ? undefined : tab, page, limit: PAGE_SIZE },
      (iso) => formatDate(iso, i18n.language),
    ).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setList({ status: result.disabled ? 'disabled' : 'error' });
        return;
      }
      // A decision can empty the page the admin is on; land on the last page that still has rows.
      if (result.items.length === 0 && page > 1 && result.total > 0) {
        setPage(Math.ceil(result.total / PAGE_SIZE));
        return;
      }
      setList({ status: 'loaded', items: result.items, total: result.total });
    });
    return () => {
      cancelled = true;
    };
  }, [tab, page, reloadKey, i18n.language]);

  useEffect(() => {
    let cancelled = false;
    fetchCategoryRequestTotals().then((result) => {
      if (!cancelled) setTotals(result);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function totalFor(status: CategoryRequestApiStatus): number | string {
    return totals?.ok ? totals.totals[TOTAL_KEY[status]] : UNAVAILABLE;
  }

  function selectTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  function renderList() {
    if (list.status === 'loaded') {
      return (
        <CategoryRequestsTable
          requests={list.items}
          total={list.total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onRowClick={setOpenRequest}
          onApprove={approve}
          onReject={reject}
        />
      );
    }
    if (list.status === 'error' || list.status === 'disabled') {
      return (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-[14px] border px-6 py-14 text-center text-[13.5px]"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-elevated)',
            color: 'var(--danger)',
          }}
        >
          <div>{t(list.status === 'disabled' ? `${K}.disabled` : `${K}.loadError`)}</div>
          {list.status === 'error' ? (
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="rounded-[10px] border px-3.5 py-1.5 text-xs font-semibold"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              {t(`${K}.retry`)}
            </button>
          ) : null}
        </div>
      );
    }
    return (
      <div
        role="status"
        className="rounded-[14px] border px-6 py-14 text-center text-[13.5px]"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
        }}
      >
        {t(`${K}.loading`)}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t(`${K}.title`)}</h1>
        <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t(`${K}.subtitle`)}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-6">
        {KPIS.map((kpi) => (
          <div
            key={kpi.key}
            className="rounded-[14px] border p-6"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
          >
            <div className="mb-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {t(kpi.labelKey)}
            </div>
            <div
              className="text-[28px] font-bold tabular-nums tracking-tight"
              style={{ color: kpi.color }}
            >
              {totalFor(kpi.key)}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mb-5 flex gap-1 overflow-x-auto border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {TABS.map(({ key, labelKey }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => selectTab(key)}
              className="flex-shrink-0 whitespace-nowrap px-3 py-2 text-[13.5px] font-medium"
              style={{
                color: active ? 'var(--brand-500)' : 'var(--text-secondary)',
                borderBottom: `2px solid ${active ? 'var(--brand-500)' : 'transparent'}`,
                marginBottom: '-1px',
              }}
            >
              {key === 'all' ? t(labelKey) : t(labelKey, { count: totalFor(key) })}
            </button>
          );
        })}
      </div>

      {renderList()}

      <CategoryRequestDetailDrawer
        request={openRequest}
        onClose={() => setOpenRequest(null)}
        onApprove={approve}
        onReject={reject}
      />

      <CreateCategoryModal
        request={decisions.approving}
        submitting={decisions.submitting}
        onCancel={decisions.cancel}
        onCreate={decisions.confirmApprove}
      />

      <RejectCategoryRequestDialog
        request={decisions.rejecting}
        submitting={decisions.submitting}
        onCancel={decisions.cancel}
        onConfirm={decisions.confirmReject}
      />
    </div>
  );
}
