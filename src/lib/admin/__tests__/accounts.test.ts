import { type DomainAccountRow, toUserRecord } from '../accounts';

function domainRow(overrides: Partial<DomainAccountRow> = {}): DomainAccountRow {
  return {
    id: 'acc-1',
    profileId: 'prof-1',
    name: 'Camila Duarte',
    email: 'camila@mail.com',
    phone: '+55 21 98888-1234',
    accountType: 'BUSINESS',
    status: 'ACTIVE',
    createdAt: '2025-03-12T10:00:00.000Z',
    ...overrides,
  };
}

describe('toUserRecord', () => {
  it('maps a full BUSINESS account with a profile to a UserRecord', () => {
    expect(toUserRecord(domainRow(), 0)).toEqual({
      id: 'acc-1',
      name: 'Camila Duarte',
      email: 'camila@mail.com',
      phone: '+55 21 98888-1234',
      location: '',
      bio: '',
      account: 'Business',
      plan: null,
      followers: '—',
      following: '—',
      joined: '12/03/2025',
      createdAtIso: '2025-03-12T10:00:00.000Z',
      status: 'Active',
      type: 'Creator',
      initials: 'CD',
      avatarColor: '#7F00FF',
    });
  });

  it('falls back to email for name and defaults phone/account/type for an account without a profile', () => {
    const user = toUserRecord(
      domainRow({
        profileId: null,
        name: null,
        phone: null,
        accountType: null,
        email: 'noprofile@mail.com',
      }),
      0,
    );

    expect(user.name).toBe('noprofile@mail.com');
    expect(user.email).toBe('noprofile@mail.com');
    expect(user.phone).toBe('');
    expect(user.account).toBe('Personal');
    expect(user.type).toBe('User');
  });

  it('falls back to the account id for name when both name and email are null', () => {
    const user = toUserRecord(domainRow({ id: 'acc-3', name: null, email: null }), 0);

    expect(user.name).toBe('acc-3');
    expect(user.email).toBe('');
  });

  it('maps upstream statuses and derives avatarColor from the index', () => {
    const statuses: DomainAccountRow['status'][] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'];
    const users = statuses.map((status, i) => toUserRecord(domainRow({ status }), i));

    expect(users.map((u) => u.status)).toEqual(['Active', 'Deactivated', 'Suspended', 'Deleted']);
    expect(users.map((u) => u.avatarColor)).toEqual(['#7F00FF', '#1A8245', '#7C5CDF', '#B7791F']);
  });

  it('computes joined in the viewer’s local timezone, not UTC (22:00 BRT signup)', () => {
    const user = toUserRecord(domainRow({ createdAt: '2025-03-13T01:00:00.000Z' }), 0);

    expect(user.joined).toBe('12/03/2025');
    expect(user.createdAtIso).toBe('2025-03-13T01:00:00.000Z');
  });
});
