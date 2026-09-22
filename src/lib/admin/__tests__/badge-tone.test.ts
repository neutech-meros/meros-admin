import { badgeTone } from '../badge-tone';

describe('badgeTone', () => {
  it('auto-colors a known success status', () => {
    expect(badgeTone('Active')).toEqual({
      color: 'var(--success)',
      background: 'var(--success-bg)',
    });
  });
  it('auto-colors Creator as info', () => {
    expect(badgeTone('Creator')).toEqual({
      color: 'var(--info)',
      background: 'var(--info-bg)',
    });
  });
  it('falls back to neutral for a status with no auto entry (e.g. Deleted)', () => {
    expect(badgeTone('Deleted')).toEqual({
      color: 'var(--text-secondary)',
      background: 'var(--bg-surface-hover)',
    });
  });
  it('falls back to neutral for User (no auto entry)', () => {
    expect(badgeTone('User')).toEqual({
      color: 'var(--text-secondary)',
      background: 'var(--bg-surface-hover)',
    });
  });
  it('respects an explicit tone override regardless of the status text', () => {
    expect(badgeTone('All categories', 'neutral')).toEqual({
      color: 'var(--text-secondary)',
      background: 'var(--bg-surface-hover)',
    });
  });
});
