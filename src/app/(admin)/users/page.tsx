'use client';

import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import { ResetPasswordDialog } from '@/components/admin/users/ResetPasswordDialog';
import { UserDetailDrawer, type ProfileDraft } from '@/components/admin/users/UserDetailDrawer';
import { UsersFilters } from '@/components/admin/users/UsersFilters';
import { UsersTable } from '@/components/admin/users/UsersTable';
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
import { getUsers } from '@/lib/mocks/admin/users';
import type { UserRecord } from '@/lib/mocks/admin/users';

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserRecord[]>(() => getUsers());
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [drawerUser, setDrawerUser] = useState<UserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);

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
    toast.success(t('admin.users.toasts.accountUpdatedTitle'), {
      description: t(
        reactivating ? 'admin.users.toasts.reactivated' : 'admin.users.toasts.deactivated',
        { name: user.name },
      ),
    });
  }

  function handleDelete(user: UserRecord) {
    toast.success(t('admin.users.toasts.accountDeletedTitle'), {
      description: t('admin.users.toasts.deleted', { name: user.name }),
    });
  }

  function handleSaveProfile(user: UserRecord, draft: ProfileDraft) {
    setUsers((cur) =>
      cur.map((u) => (u.id === user.id ? { ...u, ...draft, initials: initialsOf(draft.name) } : u)),
    );
    setDrawerUser((cur) =>
      cur && cur.id === user.id ? { ...cur, ...draft, initials: initialsOf(draft.name) } : cur,
    );
    toast.success(t('admin.users.toasts.profileSavedTitle'), {
      description: t('admin.users.toasts.profileSaved', { name: draft.name || user.name }),
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

      <UsersTable
        users={visibleUsers}
        sort={sort}
        onSortChange={handleSortChange}
        onRowClick={(u) => setDrawerUser(u)}
        onViewProfile={(u) => setDrawerUser(u)}
        onResetPassword={(u) => setResetTarget(u)}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
      />

      <UserDetailDrawer
        user={drawerUser}
        onClose={() => setDrawerUser(null)}
        onSaveProfile={handleSaveProfile}
      />
      <ResetPasswordDialog target={resetTarget} onClose={() => setResetTarget(null)} />
    </div>
  );
}
