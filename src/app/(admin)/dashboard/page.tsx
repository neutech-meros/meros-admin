'use client';

import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { AlertsCard } from '@/components/admin/dashboard/AlertsCard';
import { GrowthChart } from '@/components/admin/dashboard/GrowthChart';
import { KpiCard } from '@/components/admin/dashboard/KpiCard';
import { LatestSalesTable } from '@/components/admin/dashboard/LatestSalesTable';
import { RecentUsersTable } from '@/components/admin/dashboard/RecentUsersTable';
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart';
import { SubscriptionsChart } from '@/components/admin/dashboard/SubscriptionsChart';
import { SubscriptionSummaryCard } from '@/components/admin/dashboard/SubscriptionSummaryCard';
import {
  getAlerts,
  getDashboardKpis,
  getGrowthSeries,
  getLatestSales,
  getMonthOptions,
  getRecentUsers,
  getRevenueTrend,
  getSubscriptionSummaries,
  getSubscriptionsBreakdown,
} from '@/lib/mocks/admin/dashboard';

const REV_PERIODS: Array<{ value: '7d' | '30d' | '90d'; labelKey: string }> = [
  { value: '7d', labelKey: 'admin.dashboard.period7d' },
  { value: '30d', labelKey: 'admin.dashboard.period30d' },
  { value: '90d', labelKey: 'admin.dashboard.period90d' },
];

export default function DashboardPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState('0');
  const [revPeriod, setRevPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [revError, setRevError] = useState(false);

  const kpis = getDashboardKpis();
  const subs = getSubscriptionSummaries();
  const breakdown = getSubscriptionsBreakdown();
  const growth = getGrowthSeries();
  const alerts = getAlerts();
  const sales = getLatestSales();
  const users = getRecentUsers();
  const months = getMonthOptions();
  const revenue = getRevenueTrend(revPeriod);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.dashboard.title')}</h1>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.dashboard.subtitle')}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-[10px] border px-3.5 py-3 text-sm font-medium"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[10px] border px-4 py-3 text-sm font-medium"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
          >
            {t('admin.dashboard.export')}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        {subs.map((s) => (
          <SubscriptionSummaryCard key={s.title} data={s} />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-[2fr_1fr] gap-6">
        <div
          className="rounded-[14px] border p-6"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t('admin.dashboard.revenueTitle')}</h3>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('admin.dashboard.revenueSubtitle')}
              </div>
            </div>
            <div className="flex gap-2">
              {REV_PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setRevPeriod(p.value)}
                  className="rounded-[10px] border px-3 py-1.5 text-[13px]"
                  style={{
                    background: revPeriod === p.value ? 'var(--brand-100)' : 'var(--bg-elevated)',
                    borderColor: revPeriod === p.value ? 'transparent' : 'var(--border-subtle)',
                    color: revPeriod === p.value ? 'var(--brand-600)' : 'var(--text-secondary)',
                    fontWeight: revPeriod === p.value ? 600 : 400,
                  }}
                >
                  {t(p.labelKey)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRevError(true)}
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
            </div>
          </div>
          {revError ? (
            <div
              className="flex flex-col items-center justify-center px-4 py-8 text-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div
                className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  stroke="currentColor"
                  fill="none"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
              </div>
              <h3 className="mb-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('admin.dashboard.chartErrorTitle')}
              </h3>
              <p className="mb-5 max-w-[340px] text-[13.5px]">
                {t('admin.dashboard.chartErrorDescription')}
              </p>
              <button
                type="button"
                onClick={() => setRevError(false)}
                className="inline-flex items-center gap-2 rounded-[10px] px-4 py-3 text-sm font-medium text-white"
                style={{ background: 'var(--brand-500)' }}
              >
                {t('admin.dashboard.chartErrorRetry')}
              </button>
            </div>
          ) : (
            <RevenueChart data={revenue} />
          )}
        </div>

        <div
          className="rounded-[14px] border p-6"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
        >
          <h3 className="mb-4 text-lg font-semibold">{t('admin.dashboard.subscriptionsTitle')}</h3>
          <SubscriptionsChart data={breakdown} />
          <div className="mt-4 flex flex-col gap-2.5 text-[13px]">
            {breakdown.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                {s.label}
                <span className="ml-auto font-semibold tabular-nums">
                  {s.value.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
            <div
              className="mt-1 flex items-center gap-2 border-t pt-2.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {t('admin.dashboard.conversionRate')}
              <span className="ml-auto font-semibold">14,5%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-[2fr_1fr] gap-6">
        <div
          className="rounded-[14px] border p-6"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{t('admin.dashboard.growthTitle')}</h3>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('admin.dashboard.growthSubtitle')}
            </div>
          </div>
          <GrowthChart data={growth} />
        </div>
        <AlertsCard alerts={alerts} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <LatestSalesTable rows={sales} />
        <RecentUsersTable rows={users} />
      </div>
    </div>
  );
}
