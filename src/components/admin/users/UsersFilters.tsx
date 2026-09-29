'use client';

import { useId } from 'react';

import { useTranslation } from 'react-i18next';

import type { UserFilters } from '@/lib/admin/users-table';

import { IconClose, IconSearch } from '../icons';

type AccountOption = Exclude<UserFilters['account'], 'all'>;
type PlanOption = Exclude<UserFilters['plan'], 'all'>;
type StatusOption = Exclude<UserFilters['status'], 'all'>;

const ACCOUNT_OPTIONS: Array<[AccountOption, string]> = [
  ['Personal', 'admin.users.accountOptions.personal'],
  ['Business', 'admin.users.accountOptions.business'],
];

const PLAN_OPTIONS: Array<[PlanOption, string]> = [
  ['Free trial', 'admin.users.planOptions.freeTrial'],
  ['Freemium', 'admin.users.planOptions.freemium'],
  ['Premium', 'admin.users.planOptions.premium'],
];

const STATUS_OPTIONS: Array<[StatusOption, string]> = [
  ['Active', 'admin.users.statusOptions.active'],
  ['Deactivated', 'admin.users.statusOptions.deactivated'],
  ['Deleted', 'admin.users.statusOptions.deleted'],
];

interface UsersFiltersProps {
  filters: UserFilters;
  onFiltersChange: (next: UserFilters) => void;
  showClear: boolean;
  onClear: () => void;
}

export function UsersFilters({ filters, onFiltersChange, showClear, onClear }: UsersFiltersProps) {
  const { t } = useTranslation();
  const searchId = useId();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <div
        className="flex min-w-[300px] max-w-[360px] flex-1 items-center gap-2 rounded-[10px] border px-3 py-1.5 text-[13px]"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        <IconSearch size={16} />
        <label htmlFor={searchId} className="sr-only">
          {t('admin.users.searchLabel')}
        </label>
        <input
          id={searchId}
          value={filters.query}
          onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
          placeholder={t('admin.users.searchPlaceholder')}
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      <select
        value={filters.account}
        onChange={(e) =>
          onFiltersChange({ ...filters, account: e.target.value as UserFilters['account'] })
        }
        title={t('admin.users.filterByAccount')}
        className="min-w-[150px] cursor-pointer appearance-none rounded-lg border px-3 py-2 text-[13px]"
        style={{
          borderColor: filters.account === 'all' ? 'var(--border-subtle)' : 'var(--brand-500)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="all">{t('admin.users.allAccounts')}</option>
        {ACCOUNT_OPTIONS.map(([value, labelKey]) => (
          <option key={value} value={value}>
            {t(labelKey)}
          </option>
        ))}
      </select>

      <select
        value={filters.plan}
        onChange={(e) =>
          onFiltersChange({ ...filters, plan: e.target.value as UserFilters['plan'] })
        }
        title={t('admin.users.filterByPlan')}
        className="min-w-[150px] cursor-pointer appearance-none rounded-lg border px-3 py-2 text-[13px]"
        style={{
          borderColor: filters.plan === 'all' ? 'var(--border-subtle)' : 'var(--brand-500)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="all">{t('admin.users.allPlans')}</option>
        {PLAN_OPTIONS.map(([value, labelKey]) => (
          <option key={value} value={value}>
            {t(labelKey)}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) =>
          onFiltersChange({ ...filters, status: e.target.value as UserFilters['status'] })
        }
        title={t('admin.users.filterByStatus')}
        className="min-w-[150px] cursor-pointer appearance-none rounded-lg border px-3 py-2 text-[13px]"
        style={{
          borderColor: filters.status === 'all' ? 'var(--border-subtle)' : 'var(--brand-500)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="all">{t('admin.users.allStatuses')}</option>
        {STATUS_OPTIONS.map(([value, labelKey]) => (
          <option key={value} value={value}>
            {t(labelKey)}
          </option>
        ))}
      </select>

      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-[10px] border px-4 py-3 text-sm font-medium"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
          }}
        >
          <IconClose size={18} />
          {t('admin.users.clearFilters')}
        </button>
      )}
    </div>
  );
}
