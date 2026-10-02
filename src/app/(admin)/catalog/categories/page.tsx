'use client';

import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useAtom } from 'jotai';
import { toast } from 'sonner';

import {
  CategoryFormDialog,
  type CategoryFormState,
} from '@/components/admin/categories/CategoryFormDialog';
import { CategoryTreeTable } from '@/components/admin/categories/CategoryTreeTable';
import {
  DeactivateCascadeDialog,
  type DeactivateCascadeState,
} from '@/components/admin/categories/DeactivateCascadeDialog';
import {
  activeDescendantNames,
  addCategory,
  applyStatusCascade,
  buildCategoryRows,
  categoryExists,
  collapseAll,
  countLabel,
  defaultOpenMap,
  expandAll,
  findCategoryNode,
  slugify,
  updateCategory,
  type CategoryRow,
} from '@/lib/admin/categories-tree';
import { DEFAULT_CATEGORY_ICON } from '@/lib/admin/category-icons';
import type { CategoryNode } from '@/lib/mocks/admin/categories';
import { categoryTreeAtom } from '@/store/atoms/categories';

interface CascadeState extends DeactivateCascadeState {
  slug: string;
  status: CategoryNode['status'];
  icon: string;
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [tree, setTree] = useAtom(categoryTreeAtom);
  const [open, setOpen] = useState<Record<string, boolean> | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [formState, setFormState] = useState<CategoryFormState | null>(null);
  const [cascadeState, setCascadeState] = useState<CascadeState | null>(null);

  const rows = useMemo(() => buildCategoryRows(tree, open, query), [tree, open, query]);
  const counts = useMemo(() => countLabel(tree), [tree]);

  function handleToggle(row: CategoryRow) {
    if (!row.hasChildren) {
      toast.info(row.name, { description: t('admin.categories.toasts.leafCategoryDescription') });
      return;
    }
    setOpen((cur) => {
      const base = cur ?? defaultOpenMap();
      return { ...base, [row.slug]: !row.isOpen };
    });
  }

  function handleNewParent() {
    setFormState({
      mode: 'add',
      slug: null,
      parentName: null,
      name: '',
      status: 'Deactivated',
      icon: DEFAULT_CATEGORY_ICON,
    });
  }

  function handleAddChild(row: CategoryRow) {
    setFormState({
      mode: 'add',
      slug: row.slug,
      parentName: row.name,
      name: '',
      status: 'Deactivated',
      icon: DEFAULT_CATEGORY_ICON,
    });
  }

  function handleEdit(row: CategoryRow) {
    const hit = findCategoryNode(tree, row.slug);
    if (!hit) return;
    setFormState({
      mode: 'edit',
      slug: row.slug,
      parentName: null,
      name: row.name,
      status: row.status,
      icon: hit.node.icon,
    });
  }

  function statusWord(status: CategoryNode['status']): string {
    return status === 'Active'
      ? t('admin.categories.statusWord.active')
      : t('admin.categories.statusWord.deactivated');
  }

  function handleSave() {
    if (!formState) return;
    const name = formState.name.trim();
    if (!name) {
      toast.error(t('admin.categories.toasts.nameRequiredTitle'), {
        description: t('admin.categories.toasts.nameRequiredDescription'),
      });
      return;
    }

    if (formState.mode === 'edit') {
      const hit = findCategoryNode(tree, formState.slug!);
      if (!hit) return;
      const nextStatus = formState.status;
      const deactivating = hit.node.status === 'Active' && nextStatus !== 'Active';
      const activeNames = deactivating ? activeDescendantNames(hit.node) : [];
      if (activeNames.length > 0) {
        setCascadeState({
          slug: formState.slug!,
          name,
          status: nextStatus,
          icon: formState.icon,
          names: activeNames,
        });
        return;
      }
      const oldName = hit.node.name;
      setTree((cur) =>
        updateCategory(cur, formState.slug!, { name, status: nextStatus, icon: formState.icon }),
      );
      setFormState(null);
      if (oldName !== name) {
        toast.success(t('admin.categories.toasts.renamedTitle'), {
          description: t('admin.categories.toasts.renamedDescription', { oldName, newName: name }),
        });
      } else {
        toast.success(t('admin.categories.toasts.updatedTitle'), {
          description: t('admin.categories.toasts.updatedDescription', {
            name,
            status: statusWord(nextStatus),
          }),
        });
      }
      return;
    }

    const slug = formState.slug ? `${formState.slug}/${slugify(name)}` : slugify(name);
    if (categoryExists(tree, slug)) {
      toast.error(t('admin.categories.toasts.alreadyExistsTitle'), {
        description: t('admin.categories.toasts.alreadyExistsDescription'),
      });
      return;
    }

    if (formState.slug) {
      const hit = findCategoryNode(tree, formState.slug);
      if (!hit) return;
      if (hit.depth >= 2) {
        toast.error(t('admin.categories.toasts.maxDepthTitle'), {
          description: t('admin.categories.toasts.maxDepthDescription'),
        });
        return;
      }
      const parentSlug = formState.slug;
      setTree((cur) => addCategory(cur, parentSlug, name, formState.status, formState.icon));
      setOpen((cur) => ({ ...(cur ?? defaultOpenMap()), [parentSlug]: true }));
      setFormState(null);
      toast.success(t('admin.categories.toasts.createdTitle'), {
        description: t('admin.categories.toasts.createdDescription', {
          name,
          parentName: hit.node.name,
        }),
      });
    } else {
      setTree((cur) => addCategory(cur, null, name, formState.status, formState.icon));
      setFormState(null);
      toast.success(t('admin.categories.toasts.parentCreatedTitle'), {
        description: t('admin.categories.toasts.parentCreatedDescription', { name }),
      });
    }
  }

  function handleCascadeConfirm() {
    if (!cascadeState) return;
    setTree((cur) =>
      applyStatusCascade(
        cur,
        cascadeState.slug,
        cascadeState.name,
        cascadeState.icon,
        cascadeState.status,
      ),
    );
    const count = cascadeState.names.length;
    const name = cascadeState.name;
    setCascadeState(null);
    setFormState(null);
    toast.success(t('admin.categories.toasts.deactivatedTitle'), {
      description: t('admin.categories.toasts.deactivatedDescription', {
        name,
        count,
        status: statusWord(cascadeState.status),
      }),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.categories.title')}</h1>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.categories.subtitle')}
          </div>
        </div>
        <button
          type="button"
          onClick={handleNewParent}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-[10px] border px-4 py-3 text-sm font-medium text-white"
          style={{ borderColor: 'var(--brand-500)', background: 'var(--brand-500)' }}
        >
          <span aria-hidden="true">+</span> {t('admin.categories.newParentCategory')}
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div
          className="flex min-w-[280px] items-center gap-2 rounded-[10px] border px-3 py-1.5 text-[13px]"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.categories.searchPlaceholder')}
            className="flex-1 bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(expandAll(tree))}
          className="rounded-[10px] border px-3 py-2 text-xs font-semibold"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
          }}
        >
          {t('admin.categories.expandAll')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(collapseAll())}
          className="rounded-[10px] border px-3 py-2 text-xs font-semibold"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
          }}
        >
          {t('admin.categories.collapseAll')}
        </button>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('admin.categories.countLabel', counts)}
        </span>
      </div>

      <CategoryTreeTable
        rows={rows}
        onToggle={handleToggle}
        onAddChild={handleAddChild}
        onEdit={handleEdit}
      />

      <CategoryFormDialog
        state={formState}
        onNameChange={(name) => setFormState((cur) => (cur ? { ...cur, name } : cur))}
        onStatusChange={(status) => setFormState((cur) => (cur ? { ...cur, status } : cur))}
        onIconChange={(icon) => setFormState((cur) => (cur ? { ...cur, icon } : cur))}
        onCancel={() => setFormState(null)}
        onSave={handleSave}
      />
      <DeactivateCascadeDialog
        state={cascadeState ? { name: cascadeState.name, names: cascadeState.names } : null}
        onCancel={() => setCascadeState(null)}
        onConfirm={handleCascadeConfirm}
      />
    </div>
  );
}
