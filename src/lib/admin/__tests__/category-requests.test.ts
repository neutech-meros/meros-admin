import i18n from '@/i18n';

import {
  LEVEL_LABEL_KEY,
  requesterInitials,
  requestStatusTone,
  STATUS_LABEL_KEY,
} from '../category-requests';

describe('requestStatusTone', () => {
  it('maps every status to a distinct tone', () => {
    const pending = requestStatusTone('Pending');
    const approved = requestStatusTone('Approved');
    const rejected = requestStatusTone('Rejected');

    expect(pending).toEqual({ color: 'var(--warning)', background: 'var(--warning-bg)' });
    expect(approved).toEqual({ color: 'var(--success)', background: 'var(--success-bg)' });
    expect(rejected).toEqual({ color: 'var(--danger)', background: 'var(--danger-bg)' });

    const all = [pending, approved, rejected];
    const uniqueColors = new Set(all.map((tone) => tone.color));
    expect(uniqueColors.size).toBe(3);
  });
});

describe('LEVEL_LABEL_KEY', () => {
  it('points every tree level at an existing translation', () => {
    expect(Object.keys(LEVEL_LABEL_KEY).sort()).toEqual([
      'Child category',
      'Parent',
      'Subcategory',
    ]);
    for (const key of Object.values(LEVEL_LABEL_KEY)) {
      expect(i18n.exists(key)).toBe(true);
    }
  });
});

describe('STATUS_LABEL_KEY', () => {
  it('labels exactly the statuses the API has, each with an existing translation', () => {
    expect(Object.keys(STATUS_LABEL_KEY).sort()).toEqual(['Approved', 'Pending', 'Rejected']);
    for (const key of Object.values(STATUS_LABEL_KEY)) {
      expect(i18n.exists(key)).toBe(true);
    }
  });
});

describe('requesterInitials', () => {
  it('takes the first letter of up to two words', () => {
    expect(requesterInitials('ana souza lima')).toBe('AS');
    expect(requesterInitials('seed_alice')).toBe('S');
  });

  it('has no initials for an unavailable requester', () => {
    expect(requesterInitials('—')).toBe('');
  });
});
