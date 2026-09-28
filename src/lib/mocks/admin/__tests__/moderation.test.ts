import { getReportedQueue, getReviewedReports } from '../moderation';

describe('getReportedQueue', () => {
  it('returns the 3 seeded reports in order', () => {
    const queue = getReportedQueue();
    expect(queue).toHaveLength(3);
    expect(queue.map((r) => r.id)).toEqual(['report-1', 'report-2', 'report-3']);
    expect(queue.map((r) => r.kind)).toEqual(['Travel list', 'Comment', 'Profile']);
    expect(queue.map((r) => r.severity)).toEqual(['High', 'Average', 'Low']);
  });

  it('seeds the travel-list report with its full detail', () => {
    const [first] = getReportedQueue();
    expect(first).toMatchObject({
      title: 'Beaches secretas do litoral norte da Bahia',
      reason: 'Illegal or dangerous content',
      severity: 'High',
      where: 'Travel list · 14 stops · published 12/08/2026',
      owner: 'Marina Alves',
      handle: '@marina.alves',
      account: 'Creator · Verified',
      accountStatus: 'Active',
      priorAction: 'No prior moderation actions on this account.',
      initials: 'MA',
    });
    expect(first.reporters).toHaveLength(2);
    expect(first.reporters[1]).toEqual({
      name: 'Tiago Fonseca',
      handle: '@tiago.f',
      reason: 'Encourages illegal access',
      date: '13 Aug 2026, 18:42',
    });
  });

  it('models automatic detection as a reporter on the comment report', () => {
    const comment = getReportedQueue()[1];
    expect(comment.reporters).toHaveLength(3);
    expect(comment.reporters[0]).toMatchObject({
      name: 'Automatic detection',
      handle: 'AI moderation',
      reason: 'Offensive language · score 0.91',
    });
    expect(comment.initials).toBe('RN');
  });

  it('seeds the profile report with a single reporter and "Under review" status', () => {
    const profile = getReportedQueue()[2];
    expect(profile.accountStatus).toBe('Under review');
    expect(profile.reporters).toHaveLength(1);
  });

  it('gives every report a distinct avatar color', () => {
    const colors = getReportedQueue().map((r) => r.avatarColor);
    expect(new Set(colors).size).toBe(colors.length);
    colors.forEach((c) => expect(c).toMatch(/^#[0-9A-F]{6}$/i));
  });

  it('returns a fresh, independently mutable array on each call', () => {
    const first = getReportedQueue();
    first.pop();
    first[0].title = 'mutated';
    first[0].reporters.push({ name: 'x', handle: 'x', reason: 'x', date: 'x' });

    const second = getReportedQueue();
    expect(second).toHaveLength(3);
    expect(second[0].title).toBe('Beaches secretas do litoral norte da Bahia');
    expect(second[0].reporters).toHaveLength(2);
  });
});

describe('getReviewedReports', () => {
  it('returns the 2 seeded reviewed entries', () => {
    const reviewed = getReviewedReports();
    expect(reviewed).toHaveLength(2);
    expect(reviewed[0]).toMatchObject({
      title: 'Photo on list "Lisbon food itinerary"',
      owner: 'Larissa Prado',
      reportsLabel: '3 user reports',
      decision: 'Removed',
      reviewedBy: 'Ana Martins',
      reviewedAt: '19 Aug 2026, 16:40',
    });
    expect(reviewed[1]).toMatchObject({
      title: 'Comment on "A Family Weekend in Paraty"',
      decision: 'Kept',
      reviewedBy: 'Lucas Pereira',
    });
    expect(new Set(reviewed.map((r) => r.id)).size).toBe(2);
  });

  it('returns a fresh, independently mutable array on each call', () => {
    const first = getReviewedReports();
    first.shift();
    first[0].decision = 'Removed';

    const second = getReviewedReports();
    expect(second).toHaveLength(2);
    expect(second[1].decision).toBe('Kept');
  });
});
