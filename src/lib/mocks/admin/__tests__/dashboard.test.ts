import {
  getAlerts,
  getDashboardKpis,
  getGrowthSeries,
  getLatestSales,
  getMonthOptions,
  getRecentUsers,
  getRevenueTrend,
  getSubscriptionSummaries,
  getSubscriptionsBreakdown,
} from '../dashboard';

describe('getDashboardKpis', () => {
  it('returns the 4 KPI cards with the exact source values', () => {
    const kpis = getDashboardKpis();
    expect(kpis).toHaveLength(4);
    expect(kpis[0]).toMatchObject({
      label: 'Total revenue',
      value: 'R$ 1.842.900',
      positive: true,
    });
    expect(kpis[2]).toMatchObject({ label: 'Personal account', value: '48.290' });
  });
});

describe('getSubscriptionSummaries', () => {
  it('returns the App and Creator subscription cards', () => {
    const [app, creator] = getSubscriptionSummaries();
    expect(app.title).toBe('App subscriptions');
    expect(app.total).toBe('4.650');
    expect(creator.title).toBe('Creator subscriptions');
    expect(creator.total).toBe('2.590');
  });
});

describe('getSubscriptionsBreakdown', () => {
  it('returns the 3 literal slices summing to 48200', () => {
    const slices = getSubscriptionsBreakdown();
    expect(slices.map((s) => s.value)).toEqual([6420, 34780, 7000]);
  });
});

describe('getGrowthSeries', () => {
  it('returns 7 months with matching-length users/creators series', () => {
    const series = getGrowthSeries();
    expect(series.labels).toEqual(['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']);
    expect(series.users).toEqual([31200, 34500, 37800, 41200, 44100, 46700, 48290]);
    expect(series.creators).toHaveLength(7);
  });
});

describe('getRevenueTrend', () => {
  it.each(['7d', '30d', '90d'] as const)(
    'returns matching-length labels/marketplace/subscriptions for %s',
    (period) => {
      const trend = getRevenueTrend(period);
      expect(trend.labels.length).toBeGreaterThan(0);
      expect(trend.marketplace).toHaveLength(trend.labels.length);
      expect(trend.subscriptions).toHaveLength(trend.labels.length);
    },
  );
});

describe('getAlerts / getLatestSales / getRecentUsers', () => {
  it('returns a non-empty, well-shaped alerts list', () => {
    const alerts = getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    alerts.forEach((a) => {
      expect(['danger', 'warning', 'info', 'success']).toContain(a.severity);
    });
  });

  it('returns 5 sale rows', () => {
    expect(getLatestSales()).toHaveLength(5);
  });

  it('returns 4 recent-user rows with initials derived from the name', () => {
    const users = getRecentUsers();
    expect(users).toHaveLength(4);
    users.forEach((u) => expect(u.initials.length).toBeGreaterThan(0));
  });
});

describe('getMonthOptions', () => {
  it('returns 12 months ending at the current month', () => {
    const months = getMonthOptions();
    expect(months).toHaveLength(12);
    expect(months[0].value).toBe('0');
  });
});
