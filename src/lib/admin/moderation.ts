export type ReportSeverity = 'High' | 'Average' | 'Low';
export type ReportDecision = 'Kept' | 'Removed';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
export type AccountType = 'INDIVIDUAL' | 'BUSINESS';
export type TargetType = 'LIST' | 'PLACE_IN_LIST' | 'PROFILE';

export interface Reporter {
  name: string; // "Automatic detection" for AI-flagged reports
  handle: string; // "AI moderation" for AI-flagged reports
  reason: string; // raw reason code, e.g. "spam_or_misleading" — translate via REASON_I18N_KEY
  details: string | null; // reporter's free-text explanation; only ever present for the "other" reason code
  date: string; // display string, e.g. "12 Aug 2026, 09:14"
}

export interface ReportedItem {
  id: string;
  targetType?: TargetType; // present for real (API-backed) items, needed to call the decision endpoint
  targetId?: string;
  title: string; // the flagged content's own title
  reason: string; // raw reason code (top-line, shown in the queue row) — translate via REASON_I18N_KEY
  severity: ReportSeverity;
  excerpt: string | null; // the flagged content/snippet itself; null when the target has none (e.g. a profile with no bio)
  // Structured "where it lives" fields — the API sends no pre-composed English prose; this
  // screen composes its own translated summary from whichever of these apply to targetType.
  itemCount: number | null; // LIST: number of stops
  publishedAt: string | null; // LIST: display string
  listTitle: string | null; // PLACE_IN_LIST: the containing list's title
  venueCity: string | null; // PLACE_IN_LIST
  venueCountry: string | null; // PLACE_IN_LIST
  bio: string | null; // PROFILE
  profileCreatedAt: string | null; // PROFILE: display string
  owner: string;
  handle: string;
  accountType: AccountType | null; // null when the target has no resolvable owner; translate via ACCOUNT_TYPE_I18N_KEY
  accountStatus: AccountStatus | null; // null when the target has no resolvable owner
  priorRemovals: number; // count of prior "Removed" decisions on this account; 0 means none
  reporters: Reporter[];
  initials: string;
  avatarColor: string;
}

export interface ReviewedItem {
  id: string;
  title: string | null; // null when the target content was hard-deleted after being resolved
  owner: string | null; // null alongside title, same reason
  reportCount: number; // number of reports folded into this resolved group
  decision: ReportDecision;
  reviewedBy: string; // '—' when no reviewer was recorded
  reviewedAt: string; // display string
}
