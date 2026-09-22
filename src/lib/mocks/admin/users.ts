import { avatarColorForIndex, initialsOf } from './avatar';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  account: 'Personal' | 'Business';
  plan: 'Free trial' | 'Freemium' | 'Premium';
  followers: string;
  following: string;
  joined: string;
  status: 'Active' | 'Deactivated' | 'Deleted';
  type: 'User' | 'Creator';
  initials: string;
  avatarColor: string;
}

interface UserSeed {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  account: UserRecord['account'];
  plan: UserRecord['plan'];
  followers: string;
  following: string;
  joined: string;
  status: UserRecord['status'];
  type: UserRecord['type'];
}

// Mock (window.MEROS.USERS is not present in the source file). Covers every
// account/plan/status/type value, with at least one record where type and
// account disagree (they're independently-settable fields in the source).
const SEEDS: UserSeed[] = [
  {
    id: 'u1',
    name: 'Camila Duarte',
    email: 'camila.duarte@mail.com',
    phone: '+55 21 98888-1234',
    location: 'Rio de Janeiro, RJ',
    bio: 'Travel creator focused on budget backpacking across South America.',
    account: 'Business',
    plan: 'Premium',
    followers: '48.3k',
    following: '210',
    joined: '12/03/2025',
    status: 'Active',
    type: 'Creator',
  },
  {
    id: 'u2',
    name: 'Rafael Nogueira',
    email: 'rafael.nogueira@mail.com',
    phone: '+55 11 97777-2345',
    location: 'São Paulo, SP',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Freemium',
    followers: '312',
    following: '89',
    joined: '20/08/2026',
    status: 'Active',
    type: 'User',
  },
  {
    id: 'u3',
    name: 'Priscila Matos',
    email: 'priscila.matos@mail.com',
    phone: '+55 31 96666-3456',
    location: 'Belo Horizonte, MG',
    bio: 'Documenting Brazilian national parks, one trail at a time.',
    account: 'Business',
    plan: 'Premium',
    followers: '19.7k',
    following: '156',
    joined: '02/01/2026',
    status: 'Active',
    type: 'Creator',
  },
  {
    id: 'u4',
    name: 'Eduardo Lima',
    email: 'eduardo.lima@mail.com',
    phone: '+55 41 95555-4567',
    location: 'Curitiba, PR',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Free trial',
    followers: '54',
    following: '30',
    joined: '18/08/2026',
    status: 'Deactivated',
    type: 'User',
  },
  {
    id: 'u5',
    name: 'Marina Alves',
    email: 'marina.alves@mail.com',
    phone: '+55 21 94444-5678',
    location: 'Paraty, RJ',
    bio: 'Runs weekend itineraries for small groups along the Costa Verde.',
    account: 'Business',
    plan: 'Freemium',
    followers: '2.1k',
    following: '412',
    joined: '05/11/2025',
    status: 'Active',
    type: 'Creator',
  },
  {
    id: 'u6',
    name: 'Diego Fontes',
    email: 'diego.fontes@mail.com',
    phone: '+55 61 93333-6789',
    location: 'Brasília, DF',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Premium',
    followers: '1.4k',
    following: '75',
    joined: '30/06/2025',
    status: 'Active',
    type: 'User',
  },
  {
    id: 'u7',
    name: 'Helena Cardoso',
    email: 'helena.cardoso@mail.com',
    phone: '+55 71 92222-7890',
    location: 'Salvador, BA',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Freemium',
    followers: '98',
    following: '44',
    joined: '14/02/2026',
    status: 'Deleted',
    type: 'User',
  },
  {
    id: 'u8',
    name: 'Bruno Tavares',
    // Independent-field case: business account, but type is still 'User' —
    // the source allows this combination since account and type are set
    // separately.
    email: 'bruno.tavares@mail.com',
    phone: '+55 85 91111-8901',
    location: 'Fortaleza, CE',
    bio: 'No bio added.',
    account: 'Business',
    plan: 'Free trial',
    followers: '210',
    following: '18',
    joined: '01/09/2026',
    status: 'Active',
    type: 'User',
  },
  {
    id: 'u9',
    name: 'Isabela Ramos',
    email: 'isabela.ramos@mail.com',
    phone: '+55 51 90000-9012',
    location: 'Porto Alegre, RS',
    bio: 'Wine-country routes across the Vale dos Vinhedos.',
    account: 'Personal',
    plan: 'Premium',
    followers: '6.8k',
    following: '260',
    joined: '22/04/2025',
    status: 'Active',
    type: 'Creator',
  },
  {
    id: 'u10',
    name: 'Thiago Souza',
    email: 'thiago.souza@mail.com',
    phone: '+55 27 98765-0123',
    location: 'Vitória, ES',
    bio: 'No bio added.',
    account: 'Personal',
    plan: 'Freemium',
    followers: '132',
    following: '61',
    joined: '09/07/2026',
    status: 'Deactivated',
    type: 'User',
  },
];

export function getUsers(): UserRecord[] {
  return SEEDS.map((u, i) => ({
    ...u,
    initials: initialsOf(u.name),
    avatarColor: avatarColorForIndex(i),
  }));
}

const SUBSCRIPTIONS: Record<string, SubscriptionRow[]> = {
  u1: [{ plan: 'Premium', amount: 'R$ 39,90/mo', since: '12/03/2025', status: 'Active' }],
  u3: [{ plan: 'Premium', amount: 'R$ 39,90/mo', since: '02/01/2026', status: 'Active' }],
  u5: [{ plan: 'Freemium', amount: 'R$ 0,00', since: '05/11/2025', status: 'Active' }],
  u9: [
    { plan: 'Premium', amount: 'R$ 39,90/mo', since: '22/04/2025', status: 'Active' },
    { plan: 'Freemium', amount: 'R$ 0,00', since: '10/01/2024', status: 'Cancelled' },
  ],
};

export interface SubscriptionRow {
  plan: string;
  amount: string;
  since: string;
  status: string;
}

export function getUserSubscriptions(userId: string): SubscriptionRow[] {
  return SUBSCRIPTIONS[userId] ?? [];
}

export interface HistoryEvent {
  title: string;
  time: string;
}

const HISTORY: Record<string, HistoryEvent[]> = {
  u1: [
    { title: 'Published new list "10 dias na Patagônia"', time: '18 Sep 2026, 09:12' },
    { title: 'Upgraded to Premium', time: '12 Mar 2025, 14:30' },
    { title: 'Account created', time: '02 Feb 2025, 10:00' },
  ],
  u2: [{ title: 'Account created', time: '20 Aug 2026, 16:45' }],
  u3: [
    { title: 'Business verification submitted', time: '02 Jan 2026, 11:20' },
    { title: 'Account created', time: '28 Dec 2025, 09:00' },
  ],
  u4: [
    { title: 'Account deactivated', time: '18 Aug 2026, 08:15' },
    { title: 'Account created', time: '18 Aug 2026, 08:00' },
  ],
  u5: [
    { title: 'Published new list "Roteiro Costa Verde"', time: '01 Sep 2026, 13:00' },
    { title: 'Account created', time: '05 Nov 2025, 09:30' },
  ],
  u6: [{ title: 'Account created', time: '30 Jun 2025, 15:00' }],
  u7: [
    { title: 'Account deleted', time: '01 Mar 2026, 10:00' },
    { title: 'Account created', time: '14 Feb 2026, 12:00' },
  ],
  u8: [{ title: 'Account created', time: '01 Sep 2026, 17:20' }],
  u9: [
    { title: 'Published new list "Vinícolas do Vale dos Vinhedos"', time: '15 Jun 2025, 10:00' },
    { title: 'Account created', time: '22 Apr 2025, 08:45' },
  ],
  u10: [
    { title: 'Account deactivated', time: '09 Jul 2026, 09:00' },
    { title: 'Account created', time: '09 Jul 2026, 08:50' },
  ],
};

export function getUserHistory(userId: string): HistoryEvent[] {
  return HISTORY[userId] ?? [];
}

export interface ReportRow {
  type: string;
  reason: string;
  status: string;
  date: string;
}

const REPORTS: Record<string, ReportRow[]> = {
  u4: [
    {
      type: 'Received',
      reason: 'Suspicious payment activity',
      status: 'Pending',
      date: '17/08/2026',
    },
  ],
  u7: [
    {
      type: 'Received',
      reason: 'Fake profile information',
      status: 'Approved',
      date: '28/02/2026',
    },
    {
      type: 'Sent',
      reason: 'Spam messages from another account',
      status: 'Denied',
      date: '20/02/2026',
    },
  ],
};

export function getUserReports(userId: string): ReportRow[] {
  return REPORTS[userId] ?? [];
}
