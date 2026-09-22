'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { RevenuePeriodData } from '@/lib/mocks/admin/dashboard';

import type { TooltipValueType } from 'recharts';

export function RevenueChart({ data }: { data: RevenuePeriodData }) {
  const rows = data.labels.map((label, i) => ({
    label,
    Marketplace: data.marketplace[i],
    Subscriptions: data.subscriptions[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={270}>
      <AreaChart data={rows} stackOffset="none">
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$ ${v}k`}
        />
        <Tooltip formatter={(v: TooltipValueType | undefined) => `R$ ${v}k`} />
        <Legend wrapperStyle={{ fontSize: 11.5 }} />
        <Area
          type="monotone"
          dataKey="Marketplace"
          stackId="revenue"
          stroke="var(--brand-500)"
          fill="var(--brand-500)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="Subscriptions"
          stackId="revenue"
          stroke="var(--success)"
          fill="var(--success)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
