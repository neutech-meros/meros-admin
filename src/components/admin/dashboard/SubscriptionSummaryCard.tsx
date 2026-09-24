import type { SubscriptionSummary } from '@/lib/mocks/admin/dashboard';

export function SubscriptionSummaryCard({ data }: { data: SubscriptionSummary }) {
  return (
    <div
      className="rounded-[14px] border p-6"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{data.title}</h3>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.subtitle}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="mb-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.totalLabel}
          </div>
          <div className="text-2xl font-bold tabular-nums tracking-tight">{data.total}</div>
          <div className="mt-1 text-[11.5px] font-semibold" style={{ color: 'var(--success)' }}>
            {data.totalDelta}
          </div>
        </div>
        <div className="border-l pl-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="mb-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.cancelledLabel}
          </div>
          <div
            className="text-2xl font-bold tabular-nums tracking-tight"
            style={{ color: 'var(--danger)' }}
          >
            {data.cancelled}
          </div>
          <div
            className="mt-1 text-[11.5px] font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            {data.cancelledNote}
          </div>
        </div>
        <div className="border-l pl-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="mb-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.revenueLabel}
          </div>
          <div className="text-2xl font-bold tabular-nums tracking-tight">{data.revenue}</div>
          <div className="mt-1 text-[11.5px] font-semibold" style={{ color: 'var(--success)' }}>
            {data.revenueDelta}
          </div>
        </div>
      </div>
    </div>
  );
}
