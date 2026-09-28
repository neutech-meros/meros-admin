'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { toast } from 'sonner';

import { ReportDetailDrawer } from '@/components/admin/moderation/ReportDetailDrawer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ReportedItem, ReviewedItem } from '@/lib/admin/moderation';
import {
  queueResponseSchema,
  reviewedResponseSchema,
  toReportedItem,
  toReviewedItem,
} from '@/lib/admin/moderation-api';
import { DECISION_I18N_KEY, SEVERITY_I18N_KEY } from '@/lib/admin/moderation-labels';
import { statusStyle } from '@/lib/admin/status-styles';

type Tab = 'queue' | 'reviewed';
type LoadStatus = 'loading' | 'loaded' | 'error';

// Locale-aware: renders in the admin's current UI language rather than always English, so a
// pt/es admin doesn't see English month names in an otherwise-translated screen.
function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

const HEAD_STYLE: CSSProperties = { color: 'var(--text-secondary)' };
const HEAD_CLASS = 'px-4 text-xs font-medium tracking-wide uppercase';
const CELL_CLASS = 'px-4 py-3';
const ROW_STYLE: CSSProperties = { borderColor: 'var(--border-subtle)' };

function Badge({ toneKey, children }: { toneKey: string; children: ReactNode }) {
  const tone = statusStyle(toneKey);
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5"
      style={{
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        color: tone.color,
        background: tone.background,
      }}
    >
      {children}
    </span>
  );
}

// Same visual structure as the dashboard's chart-error block: icon circle + heading + text.
function EmptyState({
  title,
  description,
  tone = 'success',
}: {
  title: string;
  description: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12 text-center"
      style={{ color: 'var(--text-secondary)' }}
    >
      <div
        className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{
          background: tone === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: tone === 'success' ? 'var(--success)' : 'var(--danger)',
        }}
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
          {tone === 'success' ? (
            <path d="M20 6L9 17l-5-5" />
          ) : (
            <>
              <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              <path d="M12 9v4M12 17h.01" />
            </>
          )}
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="max-w-[340px] text-[13.5px]">{description}</p>
    </div>
  );
}

function TwoLineCell({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
        {primary}
      </div>
      <div className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
        {secondary}
      </div>
    </div>
  );
}

async function fetchQueue(locale: string): Promise<ReportedItem[]> {
  const response = await fetch('/api/admin/moderation/reports');
  if (!response.ok) throw new Error(`Queue request failed with status ${response.status}`);
  const { items } = queueResponseSchema.parse(await response.json());
  return items.map((raw, index) =>
    toReportedItem(raw, index, (iso) => formatDateTime(iso, locale)),
  );
}

async function fetchReviewed(locale: string): Promise<ReviewedItem[]> {
  const response = await fetch('/api/admin/moderation/reviewed');
  if (!response.ok) throw new Error(`Reviewed request failed with status ${response.status}`);
  const { items } = reviewedResponseSchema.parse(await response.json());
  return items.map((raw) => toReviewedItem(raw, (iso) => formatDateTime(iso, locale)));
}

export default function ReportedContentPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('queue');
  const [queue, setQueue] = useState<ReportedItem[]>([]);
  const [reviewed, setReviewed] = useState<ReviewedItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [drawerReportId, setDrawerReportId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadStatus('loading');
    Promise.all([fetchQueue(i18n.language), fetchReviewed(i18n.language)])
      .then(([queueItems, reviewedItems]) => {
        if (cancelled) return;
        setQueue(queueItems);
        setReviewed(reviewedItems);
        setLoadStatus('loaded');
      })
      .catch(() => {
        if (!cancelled) setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, i18n.language]);

  function handleRetry() {
    setLoadAttempt((attempt) => attempt + 1);
  }

  const drawerReport = queue.find((r) => r.id === drawerReportId) ?? null;

  async function decide(id: string, decision: 'Kept' | 'Removed') {
    const item = queue.find((r) => r.id === id);
    if (!item || !item.targetType || !item.targetId) return;
    setDrawerReportId(null);

    try {
      const response = await fetch(
        `/api/admin/moderation/reports/${item.targetType}/${item.targetId}/decision`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision: decision === 'Kept' ? 'KEPT' : 'REMOVED' }),
        },
      );
      if (!response.ok) throw new Error(`Decision request failed with status ${response.status}`);
    } catch {
      toast.error(t('admin.moderation.toastDecisionFailed'), { description: item.title });
      return;
    }

    if (decision === 'Kept') {
      toast.success(t('admin.moderation.toastKept'), { description: item.title });
    } else {
      toast.error(t('admin.moderation.toastRemoved'), { description: item.title });
    }

    // The decision above already succeeded; a failure here only means the lists are stale,
    // not that the decision itself was lost — so it gets its own, less alarming toast.
    try {
      const [queueItems, reviewedItems] = await Promise.all([
        fetchQueue(i18n.language),
        fetchReviewed(i18n.language),
      ]);
      setQueue(queueItems);
      setReviewed(reviewedItems);
    } catch {
      toast.error(t('admin.moderation.toastRefreshFailed'), { description: item.title });
    }
  }

  const tabs: Array<{ value: Tab; label: string; count: number }> = [
    { value: 'queue', label: t('admin.moderation.tabQueue'), count: queue.length },
    { value: 'reviewed', label: t('admin.moderation.tabReviewed'), count: reviewed.length },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.moderation.title')}</h1>
        <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('admin.moderation.subtitle')}
        </div>
      </div>

      {loadStatus !== 'loaded' ? (
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
              <div>{t('admin.moderation.loadError')}</div>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-4 inline-flex items-center rounded-[10px] border px-4 py-2 text-[13.5px] font-medium"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                {t('admin.moderation.retry')}
              </button>
            </>
          ) : (
            t('admin.moderation.loading')
          )}
        </div>
      ) : (
        <TabsPrimitive.Root value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <TabsPrimitive.List
            className="mb-4 flex gap-6 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {tabs.map((item) => {
              const active = tab === item.value;
              return (
                <TabsPrimitive.Trigger
                  key={item.value}
                  value={item.value}
                  className="-mb-px inline-flex items-center gap-2 pb-2.5 text-sm"
                  style={{
                    borderBottom: `2px solid ${active ? 'var(--brand-500)' : 'transparent'}`,
                    color: active ? 'var(--brand-500)' : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {item.label}
                  <span
                    className="inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums"
                    style={{
                      background: active ? 'var(--brand-100)' : 'var(--bg-surface-hover)',
                      color: active ? 'var(--brand-600)' : 'var(--text-secondary)',
                    }}
                  >
                    {item.count}
                  </span>
                </TabsPrimitive.Trigger>
              );
            })}
          </TabsPrimitive.List>

          <div
            className="rounded-[14px] border"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
          >
            <TabsPrimitive.Content value="queue">
              {queue.length === 0 ? (
                <EmptyState
                  title={t('admin.moderation.queueEmptyTitle')}
                  description={t('admin.moderation.queueEmptyDescription')}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow style={ROW_STYLE} className="hover:bg-transparent">
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colFlaggedItem')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colReason')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colAccount')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colReportedBy')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colSeverity')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map((report) => (
                      <TableRow
                        key={report.id}
                        onClick={() => setDrawerReportId(report.id)}
                        className="cursor-pointer"
                        style={ROW_STYLE}
                      >
                        <TableCell className={`${CELL_CLASS} max-w-[320px]`}>
                          <TwoLineCell primary={report.title} secondary={report.kind} />
                        </TableCell>
                        <TableCell className={CELL_CLASS} style={{ color: 'var(--text-primary)' }}>
                          {report.reason}
                        </TableCell>
                        <TableCell className={CELL_CLASS}>
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                              style={{ background: report.avatarColor }}
                              aria-hidden="true"
                            >
                              {report.initials}
                            </span>
                            <TwoLineCell primary={report.owner} secondary={report.handle} />
                          </div>
                        </TableCell>
                        <TableCell
                          className={CELL_CLASS}
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {t('admin.moderation.reportCount', { count: report.reporters.length })}
                        </TableCell>
                        <TableCell className={CELL_CLASS}>
                          <Badge toneKey={report.severity}>
                            {t(SEVERITY_I18N_KEY[report.severity])}
                          </Badge>
                        </TableCell>
                        <TableCell className={`${CELL_CLASS} text-right`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerReportId(report.id);
                            }}
                            className="rounded-[10px] border px-3 py-1.5 text-[13px] font-medium"
                            style={{
                              borderColor: 'var(--border-subtle)',
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {t('admin.moderation.review')}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="reviewed">
              {reviewed.length === 0 ? (
                <EmptyState
                  title={t('admin.moderation.reviewedEmptyTitle')}
                  description={t('admin.moderation.reviewedEmptyDescription')}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow style={ROW_STYLE} className="hover:bg-transparent">
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colItem')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colAccount')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colReports')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colDecision')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colReviewedBy')}
                      </TableHead>
                      <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                        {t('admin.moderation.colWhen')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewed.map((item) => (
                      <TableRow key={item.id} style={ROW_STYLE}>
                        <TableCell
                          className={`${CELL_CLASS} max-w-[320px] truncate font-medium`}
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.title ?? t('admin.moderation.reviewedTitleUnavailable')}
                        </TableCell>
                        <TableCell className={CELL_CLASS} style={{ color: 'var(--text-primary)' }}>
                          {item.owner ?? '—'}
                        </TableCell>
                        <TableCell
                          className={CELL_CLASS}
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {t('admin.moderation.reportCount', { count: item.reportCount })}
                        </TableCell>
                        <TableCell className={CELL_CLASS}>
                          <Badge toneKey={item.decision}>
                            {t(DECISION_I18N_KEY[item.decision])}
                          </Badge>
                        </TableCell>
                        <TableCell className={CELL_CLASS} style={{ color: 'var(--text-primary)' }}>
                          {item.reviewedBy}
                        </TableCell>
                        <TableCell
                          className={`${CELL_CLASS} tabular-nums`}
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {item.reviewedAt}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsPrimitive.Content>
          </div>
        </TabsPrimitive.Root>
      )}

      <ReportDetailDrawer
        key={drawerReport?.id ?? 'closed'}
        report={drawerReport}
        onClose={() => setDrawerReportId(null)}
        onKeep={(id) => decide(id, 'Kept')}
        onRemove={(id) => decide(id, 'Removed')}
      />
    </div>
  );
}
