import type { KpiCardData } from '@/lib/mocks/admin/dashboard';

import { Sparkline } from './Sparkline';

export function KpiCard({ kpi }: { kpi: KpiCardData }) {
  return (
    <div
      className="rounded-[14px] border p-6"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      <div className="mb-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        {kpi.label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[28px] font-bold tabular-nums tracking-tight">{kpi.value}</div>
        <div
          className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[12.5px] font-semibold"
          style={{
            color: kpi.positive ? 'var(--success)' : 'var(--danger)',
            background: kpi.positive ? 'var(--success-bg)' : 'var(--danger-bg)',
          }}
        >
          {kpi.deltaLabel}
        </div>
      </div>
      <Sparkline points={kpi.sparkPoints} color={kpi.sparkColor} />
    </div>
  );
}
