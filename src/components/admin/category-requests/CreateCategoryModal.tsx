'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useAtomValue } from 'jotai';

import { IconPickerField } from '@/components/admin/categories/IconPickerField';
import { IconChevronDown } from '@/components/admin/icons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DEFAULT_CATEGORY_ICON, resolveCategoryIcon } from '@/lib/admin/category-icons';
import { matchParentPath } from '@/lib/admin/category-requests';
import type { CategoryNode } from '@/lib/mocks/admin/categories';
import type { CategoryRequest } from '@/lib/mocks/admin/category-requests';
import { categoryTreeAtom } from '@/store/atoms/categories';

type Level = 'Parent' | 'Subcategory' | 'Child category';

const LEVELS: Level[] = ['Parent', 'Subcategory', 'Child category'];

const LEVEL_LABEL_KEY: Record<Level, string> = {
  Parent: 'levelParent',
  Subcategory: 'levelSubcategory',
  'Child category': 'levelChildCategory',
};

export interface CreateCategoryResult {
  name: string;
  parentPath: string | null;
  parentSlug: string | null;
  icon: string;
  status: 'Active' | 'Deactivated';
}

interface CreateCategoryModalProps {
  request: CategoryRequest | null;
  onCancel: () => void;
  onCreate: (result: CreateCategoryResult) => void;
}

function findNode(tree: CategoryNode[], slug: string | null): CategoryNode | null {
  if (!slug) return null;
  for (const node of tree) {
    if (node.slug === slug) return node;
    const child = (node.children ?? []).find((c) => c.slug === slug);
    if (child) return child;
  }
  return null;
}

export function CreateCategoryModal({ request, onCancel, onCreate }: CreateCategoryModalProps) {
  const { t } = useTranslation();
  const K = 'admin.categoryRequests.createModal';

  const tree = useAtomValue(categoryTreeAtom);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Level>('Parent');
  const [parentSlug, setParentSlug] = useState<string | null>(null);
  const [subSlug, setSubSlug] = useState<string | null>(null);
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [status, setStatus] = useState<'Active' | 'Deactivated'>('Active');

  useEffect(() => {
    if (!request) return;
    const match = matchParentPath(tree, request.parent);
    const requestLevel: Level = (['Parent', 'Subcategory', 'Child category'] as Level[]).includes(
      request.level as Level,
    )
      ? (request.level as Level)
      : 'Parent';
    setName(request.name);
    setLevel(requestLevel);
    setParentSlug(match.parentSlug);
    setSubSlug(match.subcategorySlug);
    setStatus('Active');
    const immediateParentSlug =
      requestLevel === 'Child category' ? match.subcategorySlug : match.parentSlug;
    setIcon(findNode(tree, immediateParentSlug)?.icon ?? DEFAULT_CATEGORY_ICON);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  if (!request) {
    return (
      <Dialog open={false} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent />
      </Dialog>
    );
  }

  const parentNode = findNode(tree, parentSlug);
  const subNode = level === 'Child category' ? findNode(tree, subSlug) : null;
  const subcategoryOptions = parentNode?.children ?? [];

  function handleLevelChange(next: Level) {
    setLevel(next);
    if (next === 'Parent') {
      setParentSlug(null);
      setSubSlug(null);
    } else if (next === 'Subcategory') {
      setSubSlug(null);
    } else if (next === 'Child category' && parentNode && !subSlug) {
      setSubSlug(parentNode.children?.[0]?.slug ?? null);
    }
  }

  function handleParentChange(slug: string) {
    setParentSlug(slug);
    const node = findNode(tree, slug);
    setSubSlug(node?.children?.[0]?.slug ?? null);
  }

  const previewPath = [
    level !== 'Parent' ? parentNode?.name : null,
    level === 'Child category' ? subNode?.name : null,
    name || t(`${K}.namePlaceholder`),
  ]
    .filter(Boolean)
    .join(' › ');

  const parentPath =
    level === 'Parent'
      ? null
      : level === 'Subcategory'
        ? (parentNode?.name ?? null)
        : parentNode && subNode
          ? `${parentNode.name} › ${subNode.name}`
          : null;

  const PreviewIcon = resolveCategoryIcon(icon);

  const immediateParentSlug =
    level === 'Parent'
      ? null
      : level === 'Subcategory'
        ? (parentNode?.slug ?? null)
        : (subNode?.slug ?? null);

  function handleCreate() {
    onCreate({ name: name.trim(), parentPath, parentSlug: immediateParentSlug, icon, status });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        className="max-h-[90vh] max-w-[440px] gap-0 overflow-y-auto p-5"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <DialogTitle className="text-[17px] font-semibold tracking-tight">
          {t(`${K}.title`)}
        </DialogTitle>
        <DialogDescription
          className="mb-4 text-[12.5px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t(`${K}.subtitle`, { requester: request.requester })}
        </DialogDescription>

        <label
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t(`${K}.levelLabel`)}
        </label>
        <div className="mb-4 flex gap-2">
          {LEVELS.map((option) => {
            const on = level === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleLevelChange(option)}
                className="flex-1 rounded-[10px] border px-2 py-2 text-[13px]"
                style={{
                  borderColor: on ? 'var(--brand-500)' : 'var(--border-subtle)',
                  background: on ? 'var(--brand-100)' : 'var(--bg-elevated)',
                  color: on ? 'var(--brand-500)' : 'var(--text-secondary)',
                  fontWeight: on ? 600 : 500,
                }}
              >
                {t(`${K}.${LEVEL_LABEL_KEY[option]}`)}
              </button>
            );
          })}
        </div>

        {level !== 'Parent' && (
          <div className={level === 'Child category' ? 'mb-4 grid grid-cols-2 gap-3' : 'mb-4'}>
            <div>
              <label
                htmlFor="create-category-parent"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t(`${K}.parentCategoryLabel`)}
              </label>
              <div className="relative">
                <select
                  id="create-category-parent"
                  value={parentSlug ?? ''}
                  onChange={(e) => handleParentChange(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-[10px] border py-2 pl-3 pr-9 text-sm outline-none"
                  style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {tree.map((node) => (
                    <option key={node.slug} value={node.slug}>
                      {node.name}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-secondary)' }}
                />
              </div>
            </div>

            {level === 'Child category' && (
              <div>
                <label
                  htmlFor="create-category-subcategory"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t(`${K}.subcategoryLabel`)}
                </label>
                <div className="relative">
                  <select
                    id="create-category-subcategory"
                    value={subSlug ?? ''}
                    onChange={(e) => setSubSlug(e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-[10px] border py-2 pl-3 pr-9 text-sm outline-none"
                    style={{
                      background: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {subcategoryOptions.map((node) => (
                      <option key={node.slug} value={node.slug}>
                        {node.name}
                      </option>
                    ))}
                  </select>
                  <IconChevronDown
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <label
          htmlFor="create-category-name"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t(`${K}.nameLabel`)}
        </label>
        <input
          id="create-category-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(`${K}.namePlaceholder`)}
          className="mb-4 w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />

        <div className="mb-4">
          <IconPickerField
            id="create-category-icon"
            label={t('admin.categories.modal.iconLabel')}
            value={icon}
            onChange={setIcon}
          />
        </div>

        <label
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('admin.categories.modal.statusLabel')}
        </label>
        <div className="mb-4 flex gap-2">
          {(['Active', 'Deactivated'] as const).map((option) => {
            const on = status === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className="flex-1 rounded-[10px] border px-3 py-2 text-[13px]"
                style={{
                  borderColor: on
                    ? option === 'Active'
                      ? 'var(--success)'
                      : 'var(--border-strong)'
                    : 'var(--border-subtle)',
                  background: on
                    ? option === 'Active'
                      ? 'var(--success-bg)'
                      : 'var(--bg-surface-hover)'
                    : 'var(--bg-elevated)',
                  color: on
                    ? option === 'Active'
                      ? 'var(--success)'
                      : 'var(--text-primary)'
                    : 'var(--text-secondary)',
                  fontWeight: on ? 600 : 500,
                }}
              >
                {option === 'Active'
                  ? t('admin.categories.modal.statusActive')
                  : t('admin.categories.modal.statusDeactivated')}
              </button>
            );
          })}
        </div>

        <div
          className="rounded-[10px] border p-3 text-[13px]"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div
            className="mb-1 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
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
            className="rounded-[10px] border px-4 py-2 text-[13.5px] font-semibold"
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
            disabled={!name.trim()}
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
