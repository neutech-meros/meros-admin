export interface StatusStyle {
  color: string;
  background: string;
}

const NEUTRAL: StatusStyle = {
  color: 'var(--text-secondary)',
  background: 'var(--bg-surface-hover)',
};

const STATUS_MAP: Record<string, StatusStyle> = {
  Paid: { color: 'var(--success)', background: 'var(--success-bg)' },
  Active: { color: 'var(--success)', background: 'var(--success-bg)' },
  Published: { color: 'var(--success)', background: 'var(--success-bg)' },
  Approved: { color: 'var(--success)', background: 'var(--success-bg)' },
  Pending: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  Processing: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  'More info': { color: 'var(--brand-600)', background: 'var(--brand-100)' },
  Deactivated: NEUTRAL,
  Deleted: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  'In review': { color: 'var(--warning)', background: 'var(--warning-bg)' },
  Refunded: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  Failed: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  Blocked: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  Rejected: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  Chargeback: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  // Report severity (moderation queue).
  High: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  Average: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  Low: NEUTRAL,
  // Report decision (moderation reviewed tab).
  Kept: { color: 'var(--success)', background: 'var(--success-bg)' },
  Removed: { color: 'var(--danger)', background: 'var(--danger-bg)' },
};

export function statusStyle(status: string): StatusStyle {
  return STATUS_MAP[status] || NEUTRAL;
}

export function typeStyle(type: string): StatusStyle {
  if (type === 'Creator') return { color: 'var(--info)', background: 'var(--info-bg)' };
  return NEUTRAL;
}
