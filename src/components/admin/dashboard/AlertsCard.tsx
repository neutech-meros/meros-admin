'use client';

import { useTranslation } from 'react-i18next';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { navHref } from '@/components/admin/nav-config';
import type { Alert } from '@/lib/mocks/admin/dashboard';

const SEVERITY_STYLE: Record<
  Alert['severity'],
  { bg: string; color: string; Icon: typeof AlertTriangle }
> = {
  danger: { bg: 'var(--danger-bg)', color: 'var(--danger)', Icon: AlertTriangle },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning)', Icon: AlertTriangle },
  info: { bg: 'var(--info-bg)', color: 'var(--info)', Icon: Info },
  success: { bg: 'var(--success-bg)', color: 'var(--success)', Icon: CheckCircle2 },
};

export function AlertsCard({ alerts }: { alerts: Alert[] }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div
      className="rounded-[14px] border p-6"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      <h3 className="mb-4 text-lg font-semibold">{t('admin.dashboard.alertsTitle')}</h3>
      {alerts.map((a, i) => {
        const { bg, color, Icon } = SEVERITY_STYLE[a.severity];
        return (
          <div
            key={i}
            className="flex gap-3 border-b py-3 last:border-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ background: bg, color }}
            >
              <Icon size={15} />
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-medium">{a.title}</div>
              <div className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                {a.description}
              </div>
              <button
                type="button"
                onClick={() => router.push(navHref(a.navKey))}
                className="mt-1 text-[12.5px] font-semibold"
                style={{ color: 'var(--brand-500)' }}
              >
                {a.linkLabel} →
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
