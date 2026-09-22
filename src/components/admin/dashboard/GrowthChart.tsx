'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { GrowthSeries } from '@/lib/mocks/admin/dashboard';

export function GrowthChart({ data }: { data: GrowthSeries }) {
  const rows = data.labels.map((label, i) => ({
    label,
    Users: data.users[i],
    Creators: data.creators[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={rows}>
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v / 1000}k`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            color: 'var(--text-primary)',
          }}
          labelStyle={{ color: 'var(--text-primary)' }}
          itemStyle={{ color: 'var(--text-primary)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11.5 }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="Users"
          stroke="var(--brand-500)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="Creators"
          stroke="#B7791F"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
