'use client';

import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import { CategoryRequestDetailDrawer } from '@/components/admin/category-requests/CategoryRequestDetailDrawer';
import { CategoryRequestsTable } from '@/components/admin/category-requests/CategoryRequestsTable';
import { countByStatus, filterByTab } from '@/lib/admin/category-requests';
import {
  getCategoryRequests,
  type CategoryRequest,
  type CategoryRequestStatus,
} from '@/lib/mocks/admin/category-requests';

const TAB_ORDER: Array<CategoryRequestStatus | 'all'> = [
  'Pending',
  'More info',
  'Approved',
  'Rejected',
  'all',
];

const TAB_LABEL_KEY: Record<CategoryRequestStatus | 'all', string> = {
  Pending: 'admin.categoryRequests.tabPending',
  'More info': 'admin.categoryRequests.tabMoreInfo',
  Approved: 'admin.categoryRequests.tabApproved',
  Rejected: 'admin.categoryRequests.tabRejected',
  all: 'admin.categoryRequests.tabAll',
};

export default function CategoryRequestsPage() {
  const { t } = useTranslation();
  const [requests] = useState<CategoryRequest[]>(() => getCategoryRequests());
  const [tab, setTab] = useState<CategoryRequestStatus | 'all'>('Pending');
  const [drawerRequest, setDrawerRequest] = useState<CategoryRequest | null>(null);

  const visible = useMemo(() => filterByTab(requests, tab), [requests, tab]);

  const kpis = [
    {
      label: t('admin.categoryRequests.kpiPending'),
      value: countByStatus(requests, 'Pending'),
      color: 'var(--warning)',
    },
    {
      label: t('admin.categoryRequests.kpiMoreInfo'),
      value: countByStatus(requests, 'More info'),
      color: 'inherit',
    },
    {
      label: t('admin.categoryRequests.kpiApproved'),
      value: countByStatus(requests, 'Approved'),
      color: 'var(--success)',
    },
    {
      label: t('admin.categoryRequests.kpiRejected'),
      value: countByStatus(requests, 'Rejected'),
      color: 'var(--danger)',
    },
  ];

  function handleApprove(request: CategoryRequest) {
    toast.success(t('admin.categoryRequests.toasts.createdTitle'), {
      description: t('admin.categoryRequests.toasts.createdDescription', {
        name: request.name,
        parent: request.parent,
      }),
    });
    setDrawerRequest(null);
  }

  function handleReject(request: CategoryRequest) {
    toast.error(t('admin.categoryRequests.toasts.rejectedTitle'), {
      description: t('admin.categoryRequests.toasts.rejectedDescription', {
        requester: request.requester,
      }),
    });
    setDrawerRequest(null);
  }

  function handleAskForDetails(request: CategoryRequest) {
    toast.info(t('admin.categoryRequests.toasts.detailsRequestedTitle'), {
      description: t('admin.categoryRequests.toasts.detailsRequestedDescription', {
        requester: request.requester,
      }),
    });
    setDrawerRequest(null);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('admin.categoryRequests.title')}
        </h1>
        <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('admin.categoryRequests.subtitle')}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[14px] border p-6"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
          >
            <div className="mb-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {kpi.label}
            </div>
            <div
              className="text-[28px] font-bold tabular-nums tracking-tight"
              style={{ color: kpi.color }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mb-5 flex gap-1 overflow-x-auto border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {TAB_ORDER.map((key) => {
          const active = tab === key;
          const label =
            key === 'all'
              ? t(TAB_LABEL_KEY[key])
              : t(TAB_LABEL_KEY[key], { count: countByStatus(requests, key) });
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="flex-shrink-0 whitespace-nowrap px-3 py-2 text-[13.5px] font-medium"
              style={{
                color: active ? 'var(--brand-500)' : 'var(--text-secondary)',
                borderBottom: `2px solid ${active ? 'var(--brand-500)' : 'transparent'}`,
                marginBottom: '-1px',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <CategoryRequestsTable
        requests={visible}
        onRowClick={setDrawerRequest}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <CategoryRequestDetailDrawer
        request={drawerRequest}
        onClose={() => setDrawerRequest(null)}
        onAskForDetails={handleAskForDetails}
        onReject={handleReject}
        onApprove={handleApprove}
      />
    </div>
  );
}
