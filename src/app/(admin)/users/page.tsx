'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import { ResetPasswordDialog } from '@/components/admin/users/ResetPasswordDialog';
import { UserDetailDrawer, type ProfileDraft } from '@/components/admin/users/UserDetailDrawer';
import { UsersFilters } from '@/components/admin/users/UsersFilters';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { type AccountsResponse, accountsResponseSchema, toUserRecord } from '@/lib/admin/accounts';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  SORT_COLUMNS,
  filterAndSortUsers,
  isAnyFilterActive,
  type SortKey,
  type UserFilters,
} from '@/lib/admin/users-table';
import { initialsOf } from '@/lib/mocks/admin/avatar';
import type { UserRecord } from '@/lib/mocks/admin/users';

type LoadStatus = 'loading' | 'loaded' | 'error';

async function fetchAccounts(): Promise<AccountsResponse> {
  const response = await fetch('/api/admin/accounts');
  if (!response.ok) throw new Error(`Accounts request failed with status ${response.status}`);
  return accountsResponseSchema.parse(await response.json());
}

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [drawerUser, setDrawerUser] = useState<UserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccounts()
      .then(({ items, total }) => {
        if (cancelled) return;
        setUsers(items.map(toUserRecord));
        setTotal(total);
        setLoadStatus('loaded');
      })
      .catch(() => {
        if (!cancelled) setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  function handleRetry() {
    setLoadStatus('loading');
    setLoadAttempt((attempt) => attempt + 1);
  }

  const visibleUsers = useMemo(
    () => filterAndSortUsers(users, filters, sort),
    [users, filters, sort],
  );
  const clearActive = isAnyFilterActive(filters, sort);

  function handleSortChange(key: SortKey) {
    setSort((cur) => {
      if (cur.key === key) return { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
      const defaultDir = SORT_COLUMNS.find((c) => c.key === key)?.defaultDir ?? 'asc';
      return { key, dir: defaultDir };
    });
  }

  function handleClear() {
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
  }

  function handleDeactivate(user: UserRecord) {
    const reactivating = user.status === 'Deactivated';
    toast.info(t('admin.users.toasts.notImplementedTitle'), {
      description: t(
        reactivating
          ? 'admin.users.toasts.reactivateNotImplemented'
          : 'admin.users.toasts.deactivateNotImplemented',
        { name: user.name },
      ),
    });
  }

  function handleDelete(user: UserRecord) {
    toast.info(t('admin.users.toasts.notImplementedTitle'), {
      description: t('admin.users.toasts.deleteNotImplemented', { name: user.name }),
    });
  }

  function handleSaveProfile(user: UserRecord, draft: ProfileDraft) {
    setUsers((cur) =>
      cur.map((u) => (u.id === user.id ? { ...u, ...draft, initials: initialsOf(draft.name) } : u)),
    );
    setDrawerUser((cur) =>
      cur && cur.id === user.id ? { ...cur, ...draft, initials: initialsOf(draft.name) } : cur,
    );
    toast.info(t('admin.users.toasts.notImplementedTitle'), {
      description: t('admin.users.toasts.profileSaveNotImplemented', {
        name: draft.name || user.name,
      }),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.users.title')}</h1>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.users.subtitle')}
          </div>
        </div>
      </div>

      <UsersFilters
        filters={filters}
        onFiltersChange={setFilters}
        showClear={clearActive}
        onClear={handleClear}
      />

      {loadStatus === 'loaded' ? (
        <UsersTable
          users={visibleUsers}
          total={total}
          loadedCount={users.length}
          sort={sort}
          onSortChange={handleSortChange}
          onRowClick={(u) => setDrawerUser(u)}
          onViewProfile={(u) => setDrawerUser(u)}
          onResetPassword={(u) => setResetTarget(u)}
          onDeactivate={handleDeactivate}
          onDelete={handleDelete}
        />
      ) : (
        <div
          role={loadStatus === 'error' ? 'alert' : 'status'}
          className="rounded-[14px] border px-6 py-16 text-center text-[13.5px]"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-elevated)',
            color: loadStatus === 'error' ? 'var(--danger)' : 'var(--text-secondary)',
          }}
        >
          {loadStatus === 'error' ? (
            <>
              <div>{t('admin.users.loadError')}</div>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-4 inline-flex items-center rounded-[10px] border px-4 py-2 text-[13.5px] font-medium"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                {t('admin.users.retry')}
              </button>
            </>
          ) : (
            t('admin.users.loading')
          )}
        </div>
      )}

      <UserDetailDrawer
        user={drawerUser}
        onClose={() => setDrawerUser(null)}
        onSaveProfile={handleSaveProfile}
      />
      <ResetPasswordDialog target={resetTarget} onClose={() => setResetTarget(null)} />
    </div>
  );
}
