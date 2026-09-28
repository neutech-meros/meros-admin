'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import {
  BUSINESS_REQUEST_STATUS_I18N_KEY,
  BusinessAccountDetailDrawer,
  REJECT_REASONS,
  type RejectReason,
} from '@/components/admin/moderation/BusinessAccountDetailDrawer';
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
  getBusinessAccountRequests,
  type BusinessAccountRequest,
  type BusinessAccountRequestStatus,
} from '@/lib/mocks/admin/businessAccounts';

const K = 'admin.businessAccounts';

// "More info" rows have no tab of their own (the mockup never renders one); they only show
// up under "All requests".
type Tab = 'Pending' | 'Approved' | 'Rejected' | 'all';

const COMPLETE_DOCS = '3 of 3';

const HEAD_STYLE: CSSProperties = { color: 'var(--text-secondary)' };
const HEAD_CLASS = 'px-4 text-xs font-medium tracking-wide uppercase';
const CELL_CLASS = 'px-4 py-3';
const ROW_STYLE: CSSProperties = { borderColor: 'var(--border-subtle)' };
const CARD_STYLE: CSSProperties = {
  padding: '24px',
  borderRadius: '14px',
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-elevated)',
};

function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={CARD_STYLE}>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</div>
      <div
        data-testid="kpi-value"
        className="mt-2 tabular-nums"
        style={{ fontSize: '28px', fontWeight: 700, ...(color ? { color } : {}) }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BusinessAccountRequestStatus }) {
  const { t } = useTranslation();
  const tone = statusStyle(status);
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
      {t(BUSINESS_REQUEST_STATUS_I18N_KEY[status])}
    </span>
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

// Same visual structure as the dashboard's chart-error block: icon circle + heading + text.
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12 text-center"
      style={{ color: 'var(--text-secondary)' }}
    >
      <div
        className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width={18}
          height={18}
          stroke="currentColor"
          fill="none"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="max-w-[340px] text-[13.5px]">{description}</p>
    </div>
  );
}

export default function BusinessAccountsPage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState(() => getBusinessAccountRequests());
  const [tab, setTab] = useState<Tab>('Pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Looked up fresh each render so the drawer always reflects the latest state.
  const selected = accounts.find((a) => a.id === selectedId) ?? null;
  const countOf = (status: BusinessAccountRequestStatus) =>
    accounts.filter((a) => a.status === status).length;
  const rows = tab === 'all' ? accounts : accounts.filter((a) => a.status === tab);

  const updateAccount = (id: string, patch: Partial<BusinessAccountRequest>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const handleRequestInfo = (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return;
    // Matches the mockup: requesting info notifies the requester but doesn't change status.
    toast.info(t(`${K}.toastInfoTitle`), {
      description: t(`${K}.toastInfoDescription`, { requester: account.requester }),
    });
  };

  const handleApprove = (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return;
    updateAccount(id, { status: 'Approved' });
    toast.success(t(`${K}.toastApprovedTitle`), {
      description: t(`${K}.toastApprovedDescription`, { name: account.name }),
    });
  };

  const handleReject = (id: string, reason: RejectReason, details: string | null) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return;
    // Judgment call: the rejection reason (plus any details) replaces the review note, the
    // same convention the seeded Rejected row follows (its note is its rejection reason).
    // The canonical English reason is stored, like the rest of the mock data.
    updateAccount(id, {
      status: 'Rejected',
      note: details ? `${reason} — ${details}` : reason,
    });
    const reasonKey = REJECT_REASONS.find((r) => r.value === reason)?.i18nKey;
    const reasonLabel = reasonKey ? t(`${K}.drawer.${reasonKey}`) : reason;
    toast.error(t(`${K}.toastRejectedTitle`), {
      description: t(`${K}.toastRejectedDescription`, {
        name: account.name,
        reason: reasonLabel.toLowerCase(),
        email: account.email,
      }),
    });
  };

  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'Pending', label: t(`${K}.tabPending`, { count: countOf('Pending') }) },
    { value: 'Approved', label: t(`${K}.tabApproved`, { count: countOf('Approved') }) },
    { value: 'Rejected', label: t(`${K}.tabRejected`, { count: countOf('Rejected') }) },
    { value: 'all', label: t(`${K}.tabAll`) },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t(`${K}.title`)}</h1>
        <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t(`${K}.subtitle`)}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-6">
        <KpiCard label={t(`${K}.kpiPending`)} value={countOf('Pending')} color="var(--warning)" />
        <KpiCard label={t(`${K}.kpiWaitingDocuments`)} value={countOf('More info')} />
        <KpiCard label={t(`${K}.kpiApproved`)} value={countOf('Approved')} color="var(--success)" />
        <KpiCard label={t(`${K}.kpiRejected`)} value={countOf('Rejected')} color="var(--danger)" />
      </div>

      <div className="mb-4 flex gap-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {tabs.map((item) => {
          const active = tab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(item.value)}
              className="-mb-px inline-flex items-center gap-2 pb-2.5 text-sm"
              style={{
                borderBottom: `2px solid ${active ? 'var(--brand-500)' : 'transparent'}`,
                color: active ? 'var(--brand-500)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 500,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        className="rounded-[14px] border"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
      >
        {rows.length === 0 ? (
          <EmptyState title={t(`${K}.emptyTitle`)} description={t(`${K}.emptyDescription`)} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow style={ROW_STYLE} className="hover:bg-transparent">
                <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                  {t(`${K}.colBusiness`)}
                </TableHead>
                <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                  {t(`${K}.colTaxId`)}
                </TableHead>
                <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                  {t(`${K}.colCategory`)}
                </TableHead>
                <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                  {t(`${K}.colRequestedBy`)}
                </TableHead>
                <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                  {t(`${K}.colDocuments`)}
                </TableHead>
                <TableHead className={HEAD_CLASS} style={HEAD_STYLE}>
                  {t(`${K}.colStatus`)}
                </TableHead>
                <TableHead className={HEAD_CLASS} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((account) => {
                const underReview = account.status === 'Pending' || account.status === 'More info';
                const docsIncomplete = account.docs !== COMPLETE_DOCS;
                return (
                  <TableRow
                    key={account.id}
                    onClick={() => setSelectedId(account.id)}
                    className="cursor-pointer"
                    style={ROW_STYLE}
                  >
                    <TableCell className={`${CELL_CLASS} max-w-[260px]`}>
                      <TwoLineCell primary={account.name} secondary={account.city} />
                    </TableCell>
                    <TableCell
                      className={`${CELL_CLASS} tabular-nums`}
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {account.cnpj}
                    </TableCell>
                    <TableCell className={CELL_CLASS} style={{ color: 'var(--text-primary)' }}>
                      {account.category}
                    </TableCell>
                    <TableCell className={`${CELL_CLASS} max-w-[240px]`}>
                      <TwoLineCell primary={account.requester} secondary={account.email} />
                    </TableCell>
                    <TableCell
                      className={CELL_CLASS}
                      data-incomplete={docsIncomplete}
                      style={{
                        color: docsIncomplete ? 'var(--warning)' : 'var(--text-secondary)',
                      }}
                    >
                      {account.docs}
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <StatusBadge status={account.status} />
                    </TableCell>
                    <TableCell className={`${CELL_CLASS} text-right`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(account.id);
                        }}
                        className="rounded-[10px] border px-3 py-1.5 text-[13px] font-medium"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {underReview ? t(`${K}.review`) : t(`${K}.view`)}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <BusinessAccountDetailDrawer
        request={selected}
        onClose={() => setSelectedId(null)}
        onRequestInfo={handleRequestInfo}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
