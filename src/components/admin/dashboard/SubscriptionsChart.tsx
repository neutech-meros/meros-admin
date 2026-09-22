'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import type { SubscriptionSlice } from '@/lib/mocks/admin/dashboard';

export function SubscriptionsChart({ data }: { data: SubscriptionSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="68%"
          outerRadius="100%"
          paddingAngle={0}
          stroke="none"
        >
          {data.map((slice) => (
            <Cell key={slice.label} fill={slice.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
