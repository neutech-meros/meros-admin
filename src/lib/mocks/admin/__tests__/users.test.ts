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
    expect(new Set(users.map((u) => u.plan))).toEqual(new Set(['Free trial', 'Freemium', 'Premium']));
    expect(new Set(users.map((u) => u.status))).toEqual(new Set(['Active', 'Deactivated', 'Deleted']));
    expect(new Set(users.map((u) => u.type))).toEqual(new Set(['User', 'Creator']));
  });

  it('has at least one record where type and account disagree (independent fields)', () => {
    const users = getUsers();
    const disagree = users.some(
      (u) => (u.type === 'Creator') !== (u.account === 'Business'),
    );
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
