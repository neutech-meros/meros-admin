export interface BadgeTone {
  color: string;
  background: string;
}

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_MAP: Record<Tone, BadgeTone> = {
  success: { color: 'var(--success)', background: 'var(--success-bg)' },
  warning: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  danger: { color: 'var(--danger)', background: 'var(--danger-bg)' },
  info: { color: 'var(--info)', background: 'var(--info-bg)' },
  neutral: { color: 'var(--text-secondary)', background: 'var(--bg-surface-hover)' },
};

const AUTO_TONE: Record<string, Tone> = {
  Published: 'success',
  Active: 'success',
  Paid: 'success',
  Completed: 'success',
  Approved: 'success',
  Won: 'success',
  'In review': 'warning',
  Pending: 'warning',
  Processing: 'warning',
  Requested: 'warning',
  'In dispute': 'warning',
  Suspended: 'warning',
  Reported: 'danger',
  Failed: 'danger',
  Denied: 'danger',
  Blocked: 'danger',
  Lost: 'danger',
  Received: 'danger',
  Creator: 'info',
  'Session atual': 'info',
};

export function badgeTone(status: string, toneOverride?: Tone): BadgeTone {
  return TONE_MAP[toneOverride ?? AUTO_TONE[status] ?? 'neutral'];
}
