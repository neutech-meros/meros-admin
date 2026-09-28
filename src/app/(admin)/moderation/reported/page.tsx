'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

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
import { statusStyle } from '@/lib/admin/status-styles';
import {
  getReportedQueue,
  getReviewedReports,
  type ReportDecision,
  type ReviewedItem,
} from '@/lib/mocks/admin/moderation';

type Tab = 'queue' | 'reviewed';

// No admin-identity concept exists yet; the mockup hardcodes the same reviewer.
const CURRENT_REVIEWER = 'Ana Martins';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Matches the seed data's display format ("19 Aug 2026, 16:40"). Built by hand rather than
// with Intl so the output doesn't depend on the runtime's ICU month abbreviations
// (e.g. en-GB renders September as "Sept" in recent ICU versions).
function formatReviewedAt(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

const HEAD_STYLE: CSSProperties = { color: 'var(--text-secondary)' };
const HEAD_CLASS = 'px-4 text-xs font-medium tracking-wide uppercase';
const CELL_CLASS = 'px-4 py-3';
const ROW_STYLE: CSSProperties = { borderColor: 'var(--border-subtle)' };

function Badge({ label }: { label: string }) {
  const tone = statusStyle(label);
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
      {label}
    </span>
  );
}

// Same visual structure as the dashboard's chart-error block: icon circle + heading + text.
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12 text-center"
      style={{ color: 'var(--text-secondary)' }}
    >
      <div
        className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
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
          <path d="M20 6L9 17l-5-5" />
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

export default function ReportedContentPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('queue');
  // Mock ids are literal and stable across calls, so filtering a fresh call each render would
  // also work; holding the seed in state keeps object identity stable across renders too.
  const [queue] = useState(getReportedQueue);
  const [resolved, setResolved] = useState<Set<string>>(() => new Set());
  const [reviewed, setReviewed] = useState<ReviewedItem[]>(getReviewedReports);
  const [drawerReportId, setDrawerReportId] = useState<string | null>(null);

  const queueItems = queue.filter((r) => !resolved.has(r.id));
  const drawerReport = queueItems.find((r) => r.id === drawerReportId) ?? null;

  const decide = (id: string, decision: ReportDecision) => {
    const item = queueItems.find((r) => r.id === id);
    if (!item) return;
    const n = item.reporters.length;
    const entry: ReviewedItem = {
      id: item.id,
      title: item.title,
      owner: item.owner,
      // Same plain-data phrasing as the seeded reviewed items (this field is display data,
      // like every other mock string, not UI chrome).
      reportsLabel: `${n} user report${n === 1 ? '' : 's'}`,
      decision,
      reviewedBy: CURRENT_REVIEWER,
      reviewedAt: formatReviewedAt(new Date()),
    };
    setReviewed((prev) => [entry, ...prev]);
    setResolved((prev) => new Set(prev).add(id));
    setDrawerReportId(null);
    if (decision === 'Kept') {
      toast.success(t('admin.moderation.toastKept'), { description: item.title });
    } else {
      toast.error(t('admin.moderation.toastRemoved'), { description: item.title });
    }
  };

  const tabs: Array<{ value: Tab; label: string; count: number }> = [
    { value: 'queue', label: t('admin.moderation.tabQueue'), count: queueItems.length },
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

      <div className="mb-4 flex gap-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {tabs.map((item) => {
          const active = tab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
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
            </button>
          );
        })}
      </div>

      <div
        className="rounded-[14px] border"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
      >
        {tab === 'queue' &&
          (queueItems.length === 0 ? (
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
                {queueItems.map((report) => (
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
                    <TableCell className={CELL_CLASS} style={{ color: 'var(--text-secondary)' }}>
                      {t('admin.moderation.reportCount', { count: report.reporters.length })}
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <Badge label={report.severity} />
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
          ))}

        {tab === 'reviewed' &&
          (reviewed.length === 0 ? (
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
                      {item.title}
                    </TableCell>
                    <TableCell className={CELL_CLASS} style={{ color: 'var(--text-primary)' }}>
                      {item.owner}
                    </TableCell>
                    <TableCell className={CELL_CLASS} style={{ color: 'var(--text-secondary)' }}>
                      {item.reportsLabel}
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <Badge label={item.decision} />
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
          ))}
      </div>

      <ReportDetailDrawer
        report={drawerReport}
        onClose={() => setDrawerReportId(null)}
        onKeep={(id) => decide(id, 'Kept')}
        onRemove={(id) => decide(id, 'Removed')}
      />
    </div>
  );
}
