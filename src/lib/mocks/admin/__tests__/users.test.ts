import { getUserHistory, getUserReports, getUserSubscriptions, getUsers } from '../users';

describe('getUsers', () => {
  it('returns 10 records with initials/avatarColor derived from name/index', () => {
    const users = getUsers();
    expect(users).toHaveLength(10);
    users.forEach((u) => {
      expect(u.initials.length).toBeGreaterThan(0);
      expect(u.avatarColor).toMatch(/^#/);
    });
  });

  it('covers every account/plan/status/type value at least once', () => {
    const users = getUsers();
    expect(new Set(users.map((u) => u.account))).toEqual(new Set(['Personal', 'Business']));
    expect(new Set(users.map((u) => u.plan))).toEqual(
      new Set(['Free trial', 'Freemium', 'Premium']),
    );
    expect(new Set(users.map((u) => u.status))).toEqual(
      new Set(['Active', 'Deactivated', 'Deleted']),
    );
    expect(new Set(users.map((u) => u.type))).toEqual(new Set(['User', 'Creator']));
  });

  it('has at least one record where type and account disagree (independent fields)', () => {
    const users = getUsers();
    const disagree = users.some((u) => (u.type === 'Creator') !== (u.account === 'Business'));
    expect(disagree).toBe(true);
  });

  it('has unique ids', () => {
    const ids = getUsers().map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('per-user tab data', () => {
  it('has at least one user with no subscriptions', () => {
    const users = getUsers();
    expect(users.some((u) => getUserSubscriptions(u.id).length === 0)).toBe(true);
  });

  it('gives every user at least one history event', () => {
    const users = getUsers();
    users.forEach((u) => expect(getUserHistory(u.id).length).toBeGreaterThan(0));
  });

  it('dates every "Account created" history event on the same day as the user joined', () => {
    const MONTHS = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const historyDay = (time: string) => {
      const [day, month, year] = time.split(',')[0].split(' ');
      return `${day}/${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}/${year}`;
    };
    const users = getUsers();
    const checked = users.flatMap((u) =>
      getUserHistory(u.id)
        .filter((e) => e.title === 'Account created')
        .map((e) => [u.id, historyDay(e.time)]),
    );
    expect(checked).toHaveLength(users.length);
    expect(checked).toEqual(users.map((u) => [u.id, u.joined]));
  });

  it('has at least one user with reports and most with none', () => {
    const users = getUsers();
    const withReports = users.filter((u) => getUserReports(u.id).length > 0);
    expect(withReports.length).toBeGreaterThan(0);
    expect(withReports.length).toBeLessThan(users.length);
  });

  it('returns an empty array for an unknown id', () => {
    expect(getUserSubscriptions('nope')).toEqual([]);
    expect(getUserReports('nope')).toEqual([]);
  });
});

describe('getUserHistory', () => {
  it('is a pure one-argument mock-data lookup', () => {
    expect(getUserHistory).toHaveLength(1);
  });

  it('returns the seeded history for a seeded id', () => {
    expect(getUserHistory('u1')).toEqual([
      { title: 'Published new list "10 dias na Patagônia"', time: '18 Sep 2026, 09:12' },
      { title: 'Upgraded to Premium', time: '12 Mar 2025, 14:30' },
      { title: 'Account created', time: '02 Feb 2025, 10:00' },
    ]);
  });

  it('returns an empty array for an id with no seeded history', () => {
    expect(getUserHistory('real-account-id')).toEqual([]);
  });
});
