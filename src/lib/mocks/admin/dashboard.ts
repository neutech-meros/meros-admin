export interface KpiCardData {
  label: string;
  value: string;
  deltaLabel: string;
  positive: boolean;
  sparkPoints: string;
  sparkColor: string;
}

// Literal values ported from Meros Admin (standalone).html, extracted template lines 462-493.
export function getDashboardKpis(): KpiCardData[] {
  return [
    {
      label: 'Total revenue',
      value: 'R$ 1.842.900',
      deltaLabel: '↑ 12,8%',
      positive: true,
      sparkPoints:
        '0,22 5,20 10,21 15,17 20,18 25,14 30,15 35,11 40,12 45,9 50,10 55,7 60,8 65,5 70,6 75,4 80,5 85,3 90,4 95,2 100,3',
      sparkColor: '#7F00FF',
    },
    {
      label: 'Monthly revenue',
      value: 'R$ 182.400',
      deltaLabel: '↑ 12,4%',
      positive: true,
      sparkPoints:
        '0,20 5,18 10,20 15,15 20,17 25,12 30,15 35,10 40,13 45,8 50,11 55,7 60,10 65,5 70,8 75,4 80,7 85,3 90,6 95,2 100,4',
      sparkColor: '#1A8245',
    },
    {
      label: 'Personal account',
      value: '48.290',
      deltaLabel: '↑ 8,2%',
      positive: true,
      sparkPoints:
        '0,20 5,15 10,18 15,10 20,14 25,8 30,12 35,6 40,10 45,4 50,8 55,3 60,7 65,2 70,6 75,1 80,5 85,0 90,4 95,1 100,3',
      sparkColor: '#7C5CDF',
    },
    {
      label: 'Business Account',
      value: '3.140',
      deltaLabel: '↑ 5,4%',
      positive: true,
      sparkPoints:
        '0,18 5,17 10,15 15,14 20,13 25,11 30,12 35,9 40,10 45,7 50,8 55,6 60,7 65,4 70,5 75,3 80,4 85,2 90,3 95,1 100,2',
      sparkColor: '#B7791F',
    },
  ];
}

export interface SubscriptionSummary {
  title: string;
  subtitle: string;
  totalLabel: string;
  total: string;
  totalDelta: string;
  cancelledLabel: string;
  cancelled: string;
  cancelledNote: string;
  revenueLabel: string;
  revenue: string;
  revenueDelta: string;
}

// Literal values ported from the source markup lines 496-550.
export function getSubscriptionSummaries(): SubscriptionSummary[] {
  return [
    {
      title: 'App subscriptions',
      subtitle: 'Plans users buy from Meros — August 2026',
      totalLabel: 'Total subscriptions',
      total: '4.650',
      totalDelta: '↑ 5,7% vs. July',
      cancelledLabel: 'Cancelled',
      cancelled: '52',
      cancelledNote: '1,1% churn',
      revenueLabel: 'Revenue this month',
      revenue: 'R$ 44.760',
      revenueDelta: '↑ 4,8% vs. July',
    },
    {
      title: 'Creator subscriptions',
      subtitle: 'Exclusive content — user subscribes to a profile',
      totalLabel: 'Total subscriptions',
      total: '2.590',
      totalDelta: '↑ 7,9% vs. July',
      cancelledLabel: 'Cancelled',
      cancelled: '32',
      cancelledNote: '1,2% churn',
      revenueLabel: 'Revenue this month',
      revenue: 'R$ 41.320',
      revenueDelta: '↑ 3,6% vs. July',
    },
  ];
}

export interface RevenuePeriodData {
  labels: string[];
  marketplace: number[];
  subscriptions: number[];
}

// Mock (window.MEROS.REVENUE_PERIODS is not present in the source file); values in R$ thousands.
const REVENUE_PERIODS: Record<'7d' | '30d' | '90d', RevenuePeriodData> = {
  '7d': {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    marketplace: [22, 24, 20, 26, 25, 30, 28],
    subscriptions: [10, 11, 10, 12, 11, 13, 12],
  },
  '30d': {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    marketplace: [86, 92, 88, 96],
    subscriptions: [40, 42, 41, 44],
  },
  '90d': {
    labels: ['Jun', 'Jul', 'Ago'],
    marketplace: [340, 360, 382],
    subscriptions: [150, 158, 168],
  },
};

export function getRevenueTrend(period: '7d' | '30d' | '90d'): RevenuePeriodData {
  return REVENUE_PERIODS[period];
}

export interface SubscriptionSlice {
  label: string;
  value: number;
  color: string;
}

// Literal values ported from subsData(), source lines 4961-4968.
export function getSubscriptionsBreakdown(): SubscriptionSlice[] {
  return [
    { label: 'In trial period', value: 6420, color: 'var(--success)' },
    { label: 'Freemium post trial', value: 34780, color: '#9AA1AA' },
    { label: 'Premium', value: 7000, color: 'var(--brand-500)' },
  ];
}

export interface GrowthSeries {
  labels: string[];
  users: number[];
  creators: number[];
}

// Literal values ported from syncCharts(), source lines 3362-3369.
export function getGrowthSeries(): GrowthSeries {
  return {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
    users: [31200, 34500, 37800, 41200, 44100, 46700, 48290],
    creators: [2100, 2350, 2600, 2780, 2900, 3020, 3140],
  };
}

export interface Alert {
  severity: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  linkLabel: string;
  navKey: string;
}

// Mock (window.MEROS.ALERTS is not present in the source file).
export function getAlerts(): Alert[] {
  return [
    {
      severity: 'danger',
      title: 'Pagamento Stripe falhou',
      description: '12 transações não foram processadas nas últimas 24h.',
      linkLabel: 'Ver detalhes',
      navKey: 'finance-stripe',
    },
    {
      severity: 'warning',
      title: '8 listas aguardando revisão',
      description: 'Conteúdo sinalizado pelo sistema de moderação automática.',
      linkLabel: 'Revisar agora',
      navKey: 'moderation-reported',
    },
    {
      severity: 'warning',
      title: '3 contas business pendentes',
      description: 'Solicitações de verificação aguardando aprovação.',
      linkLabel: 'Ver contas',
      navKey: 'moderation-business',
    },
    {
      severity: 'info',
      title: 'Novo recurso disponível',
      description: 'Split de comissão por categoria já pode ser configurado.',
      linkLabel: 'Configurar',
      navKey: 'finance-split',
    },
  ];
}

export interface SaleRow {
  buyer: string;
  list: string;
  amount: string;
  status: string;
}

// Mock (window.MEROS.ORDERS is not present in the source file).
export function getLatestSales(): SaleRow[] {
  return [
    { buyer: 'Marina Alves', list: '10 dias na Patagônia', amount: 'R$ 1.240', status: 'Paid' },
    { buyer: 'Diego Fontes', list: 'Roteiro Lisboa + Porto', amount: 'R$ 680', status: 'Processing' },
    { buyer: 'Helena Cardoso', list: 'Trilhas na Chapada Diamantina', amount: 'R$ 420', status: 'Paid' },
    { buyer: 'Bruno Tavares', list: 'Tóquio essencial em 7 dias', amount: 'R$ 990', status: 'Pending' },
    { buyer: 'Isabela Ramos', list: 'Vinícolas do Vale dos Vinhedos', amount: 'R$ 350', status: 'Refunded' },
  ];
}

export interface RecentUserRow {
  name: string;
  type: 'User' | 'Creator';
  joined: string;
  status: string;
  initials: string;
  avatarColor: string;
}

const AVATAR_COLORS = ['#7F00FF', '#1A8245', '#7C5CDF', '#B7791F', '#DF2339'];

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// Mock (window.MEROS.RECENT_USERS is not present in the source file).
export function getRecentUsers(): RecentUserRow[] {
  const rows: Array<Omit<RecentUserRow, 'initials' | 'avatarColor'>> = [
    { name: 'Camila Duarte', type: 'Creator', joined: '21/08/2026', status: 'Active' },
    { name: 'Rafael Nogueira', type: 'User', joined: '20/08/2026', status: 'Active' },
    { name: 'Priscila Matos', type: 'Creator', joined: '19/08/2026', status: 'Pending' },
    { name: 'Eduardo Lima', type: 'User', joined: '18/08/2026', status: 'Deactivated' },
  ];
  return rows.map((u, i) => ({
    ...u,
    initials: initialsOf(u.name),
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

export interface MonthOption {
  value: string;
  label: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Ported from monthList(), source lines 3374-3383.
export function getMonthOptions(): MonthOption[] {
  const now = new Date();
  const out: MonthOption[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ value: String(i), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
}
