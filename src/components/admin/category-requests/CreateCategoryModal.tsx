'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { IconPickerField } from '@/components/admin/categories/IconPickerField';
import {
  FIELD_STYLE,
  LABEL_CLASS,
  LABEL_STYLE,
  NodeSelect,
  ToggleButton,
} from '@/components/admin/category-requests/CreateCategoryModalFields';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { fetchCategoriesTree, type CategoryTreeNode } from '@/lib/admin/categories-api';
import { DEFAULT_CATEGORY_ICON, resolveCategoryIcon } from '@/lib/admin/category-icons';
import { LEVEL_LABEL_KEY, type CategoryRequestLevel } from '@/lib/admin/category-requests';
import type {
  ApproveCategoryRequestPayload,
  CategoryRequestItem,
} from '@/lib/admin/category-requests-api';

const K = 'admin.categoryRequests.createModal';
const LEVELS: CategoryRequestLevel[] = ['Parent', 'Subcategory', 'Child category'];

type TreeState =
  { status: 'loading' } | { status: 'error' } | { status: 'loaded'; tree: CategoryTreeNode[] };

export interface CreateCategorySummary {
  name: string;
  parentPath: string | null;
}

interface CreateCategoryModalProps {
  request: CategoryRequestItem | null;
  submitting: boolean;
  onCancel: () => void;
  onCreate: (payload: ApproveCategoryRequestPayload, summary: CreateCategorySummary) => void;
}

export function CreateCategoryModal({
  request,
  submitting,
  onCancel,
  onCreate,
}: CreateCategoryModalProps) {
  const { t } = useTranslation();
  const [treeState, setTreeState] = useState<TreeState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [level, setLevel] = useState<CategoryRequestLevel>('Parent');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const requestId = request?.id ?? null;

  useEffect(() => {
    if (requestId === null) return;
    let cancelled = false;
    setTreeState({ status: 'loading' });
    fetchCategoriesTree().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setTreeState({ status: 'error' });
        return;
      }
      setTreeState({ status: 'loaded', tree: result.tree });
      const [firstGroup] = result.tree;
      setGroupId(firstGroup?.id ?? null);
      setCategoryId(firstGroup?.children[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, reloadKey]);

  useEffect(() => {
    if (!request) return;
    setLevel(request.level ?? 'Parent');
    setIcon(DEFAULT_CATEGORY_ICON);
    setStatus('ACTIVE');
    // Reset only when a different request is opened, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  if (!request) {
    return (
      <Dialog open={false} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent />
      </Dialog>
    );
  }

  const tree = treeState.status === 'loaded' ? treeState.tree : [];
  const group = tree.find((node) => node.id === groupId) ?? null;
  const category = group?.children.find((node) => node.id === categoryId) ?? null;
  const missingParent =
    (level !== 'Parent' && group === null) || (level === 'Child category' && category === null);
  const canCreate = treeState.status === 'loaded' && !submitting && !missingParent;

  function handleGroupChange(id: string) {
    setGroupId(id);
    setCategoryId(tree.find((node) => node.id === id)?.children[0]?.id ?? null);
  }

  function handleCreate() {
    if (!request || !canCreate) return;
    const common = { iconKey: icon, status };
    if (level === 'Parent') {
      onCreate({ level: 'GROUP', ...common }, { name: request.name, parentPath: null });
    } else if (level === 'Subcategory' && group) {
      onCreate(
        { level: 'CATEGORY', groupId: group.id, ...common },
        { name: request.name, parentPath: group.name },
      );
    } else if (group && category) {
      onCreate(
        { level: 'SUBCATEGORY', categoryId: category.id, ...common },
        { name: request.name, parentPath: `${group.name} › ${category.name}` },
      );
    }
  }

  const previewPath = [
    level !== 'Parent' ? group?.name : null,
    level === 'Child category' ? category?.name : null,
    request.name,
  ]
    .filter(Boolean)
    .join(' › ');
  const PreviewIcon = resolveCategoryIcon(icon);

  function renderTreeState() {
    if (treeState.status === 'loading') {
      return (
        <div role="status" className="mb-4 text-[13px]" style={LABEL_STYLE}>
          {t(`${K}.treeLoading`)}
        </div>
      );
    }
    if (treeState.status === 'error') {
      return (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-[10px] border p-3 text-[13px]"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--danger)' }}
        >
          <span>{t(`${K}.treeError`)}</span>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-[10px] border px-3 py-1.5 text-xs font-semibold"
            style={FIELD_STYLE}
          >
            {t(`${K}.retry`)}
          </button>
        </div>
      );
    }
    if (level === 'Parent') return null;
    return (
      <div className="mb-4 flex flex-col gap-4">
        <NodeSelect
          id="create-category-parent"
          label={t(`${K}.parentCategoryLabel`)}
          value={groupId}
          options={tree}
          onChange={handleGroupChange}
        />
        {level === 'Child category' ? (
          <NodeSelect
            id="create-category-subcategory"
            label={t(`${K}.subcategoryLabel`)}
            value={categoryId}
            options={group?.children ?? []}
            onChange={setCategoryId}
          />
        ) : null}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !submitting && onCancel()}>
      <DialogContent
        className="max-h-[90vh] max-w-[440px] gap-0 overflow-y-auto p-5"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <DialogTitle className="text-[17px] font-semibold tracking-tight">
          {t(`${K}.title`)}
        </DialogTitle>
        <DialogDescription className="mb-4 text-[12.5px]" style={LABEL_STYLE}>
          {t(`${K}.subtitle`, { requester: request.requester })}
        </DialogDescription>

        <div className={LABEL_CLASS} style={LABEL_STYLE}>
          {t(`${K}.levelLabel`)}
        </div>
        <div className="mb-4 flex gap-2">
          {LEVELS.map((option) => (
            <ToggleButton key={option} on={level === option} onClick={() => setLevel(option)}>
              {t(LEVEL_LABEL_KEY[option])}
            </ToggleButton>
          ))}
        </div>

        {renderTreeState()}

        <div className={LABEL_CLASS} style={LABEL_STYLE}>
          {t(`${K}.nameLabel`)}
        </div>
        <div
          data-testid="proposed-name"
          className="mb-4 rounded-[10px] border px-3 py-2 text-sm"
          style={FIELD_STYLE}
        >
          {request.name}
        </div>

        <div className="mb-4">
          <IconPickerField
            id="create-category-icon"
            label={t('admin.categories.modal.iconLabel')}
            value={icon}
            onChange={setIcon}
          />
        </div>

        <div className={LABEL_CLASS} style={LABEL_STYLE}>
          {t('admin.categories.modal.statusLabel')}
        </div>
        <div className="mb-4 flex gap-2">
          <ToggleButton on={status === 'ACTIVE'} onClick={() => setStatus('ACTIVE')}>
            {t('admin.categories.modal.statusActive')}
          </ToggleButton>
          <ToggleButton on={status === 'INACTIVE'} onClick={() => setStatus('INACTIVE')}>
            {t('admin.categories.modal.statusDeactivated')}
          </ToggleButton>
        </div>

        <div
          className="rounded-[10px] border p-3 text-[13px]"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={LABEL_STYLE}>
            {t(`${K}.previewLabel`)}
          </div>
          <div className="flex items-center gap-1.5">
            <PreviewIcon size={14} style={{ color: 'var(--brand-500)' }} />
            <span>{previewPath}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-[10px] border px-4 py-2 text-[13.5px] font-semibold disabled:opacity-50"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            {t('admin.categories.modal.cancel')}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="rounded-[10px] border px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-50"
            style={{ borderColor: 'var(--brand-500)', background: 'var(--brand-500)' }}
          >
            {t('admin.categories.modal.createCta')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
