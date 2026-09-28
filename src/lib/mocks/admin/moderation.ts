export type ReportSeverity = 'High' | 'Average' | 'Low';
export type ReportDecision = 'Kept' | 'Removed';

export interface Reporter {
  name: string; // "Automatic detection" for AI-flagged reports
  handle: string; // "AI moderation" for AI-flagged reports
  reason: string;
  date: string; // display string, e.g. "12 Aug 2026, 09:14"
}

export interface ReportedItem {
  id: string;
  title: string; // the flagged content's own title
  kind: string; // "Travel list" | "Comment" | "Profile" | …
  reason: string; // top-line reason shown in the queue row
  severity: ReportSeverity;
  excerpt: string; // the flagged content/snippet itself
  where: string;
  owner: string;
  handle: string;
  account: string; // "Creator · Verified" | "Traveler" | …
  accountStatus: string; // "Active" | "Under review" | …
  priorAction: string; // account-history free text
  reporters: Reporter[];
  initials: string;
  avatarColor: string;
}

export interface ReviewedItem {
  id: string;
  title: string;
  owner: string;
  reportsLabel: string; // "3 user reports" / "1 user report"
  decision: ReportDecision;
  reviewedBy: string;
  reviewedAt: string; // display string
}

// Same avatar palette as the dashboard's recent-users mock.
const AVATAR_COLORS = ['#7F00FF', '#1A8245', '#7C5CDF', '#B7791F', '#DF2339'];

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// Literal values ported from the mockup's REPORT_DETAILS (Meros Admin (standalone).html).
// Built fresh on every call so callers can own and mutate the result.
export function getReportedQueue(): ReportedItem[] {
  const rows: Array<Omit<ReportedItem, 'initials' | 'avatarColor'>> = [
    {
      id: 'report-1',
      title: 'Beaches secretas do litoral norte da Bahia',
      kind: 'Travel list',
      reason: 'Illegal or dangerous content',
      severity: 'High',
      excerpt:
        'Beaches secretas do litoral norte da Bahia — includes exact GPS pins for three protected beaches inside an environmental reserve, plus a note on how to bypass the ranger checkpoint.',
      where: 'Travel list · 14 stops · published 12/08/2026',
      owner: 'Marina Alves',
      handle: '@marina.alves',
      account: 'Creator · Verified',
      accountStatus: 'Active',
      priorAction: 'No prior moderation actions on this account.',
      reporters: [
        {
          name: 'Beatriz Lima',
          handle: '@bia.lima',
          reason: 'Protected area exposed',
          date: '12 Aug 2026, 09:14',
        },
        {
          name: 'Tiago Fonseca',
          handle: '@tiago.f',
          reason: 'Encourages illegal access',
          date: '13 Aug 2026, 18:42',
        },
      ],
    },
    {
      id: 'report-2',
      title: 'Comment on "Vale dos Vinhedos wineries"',
      kind: 'Comment',
      reason: 'Offensive language',
      severity: 'Average',
      excerpt:
        '[masked] — comment flagged for offensive language toward the list creator. Full text visible to trust reviewers only.',
      where: 'Comment on list "Vale dos Vinhedos wineries" · 22/08/2026',
      owner: 'Rafael Nogueira',
      handle: '@rafael.n',
      account: 'Traveler',
      accountStatus: 'Active',
      priorAction: '1 warning issued in June 2026.',
      reporters: [
        {
          name: 'Automatic detection',
          handle: 'AI moderation',
          reason: 'Offensive language · score 0.91',
          date: '22 Aug 2026, 11:03',
        },
        {
          name: 'Beatriz Lima',
          handle: '@bia.lima',
          reason: 'Harassment toward the creator',
          date: '22 Aug 2026, 12:20',
        },
        {
          name: 'Larissa Prado',
          handle: '@larissa.p',
          reason: 'Offensive language',
          date: '23 Aug 2026, 08:55',
        },
      ],
    },
    {
      id: 'report-3',
      title: 'Duplicate profile suspected',
      kind: 'Profile',
      reason: 'Impersonation / duplicate account',
      severity: 'Low',
      excerpt:
        'Profile photo, bio and city match an existing account (@r.nogueira). Same device fingerprint and payment method.',
      where: 'Profile created 04/08/2026 · 3 lists, 0 sales',
      owner: 'Rafael Nogueira',
      handle: '@rafael.n',
      account: 'Traveler',
      accountStatus: 'Under review',
      priorAction: 'Duplicate-account check pending.',
      reporters: [
        {
          name: 'Marina Alves',
          handle: '@marina.alves',
          reason: 'Impersonation / duplicate account',
          date: '20 Aug 2026, 15:31',
        },
      ],
    },
  ];
  return rows.map((r, i) => ({
    ...r,
    initials: initialsOf(r.owner),
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

// Literal values ported from the mockup's MOD_REVIEWED_SEED.
// Built fresh on every call so callers can own and mutate the result.
export function getReviewedReports(): ReviewedItem[] {
  return [
    {
      id: 'reviewed-1',
      title: 'Photo on list "Lisbon food itinerary"',
      owner: 'Larissa Prado',
      reportsLabel: '3 user reports',
      decision: 'Removed',
      reviewedBy: 'Ana Martins',
      reviewedAt: '19 Aug 2026, 16:40',
    },
    {
      id: 'reviewed-2',
      title: 'Comment on "A Family Weekend in Paraty"',
      owner: 'Eduardo Costa',
      reportsLabel: '1 user report',
      decision: 'Kept',
      reviewedBy: 'Lucas Pereira',
      reviewedAt: '17 Aug 2026, 10:12',
    },
  ];
}
