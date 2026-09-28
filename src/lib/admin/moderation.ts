export type ReportSeverity = 'High' | 'Average' | 'Low';
export type ReportDecision = 'Kept' | 'Removed';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';

export interface Reporter {
  name: string; // "Automatic detection" for AI-flagged reports
  handle: string; // "AI moderation" for AI-flagged reports
  reason: string;
  date: string; // display string, e.g. "12 Aug 2026, 09:14"
}

export interface ReportedItem {
  id: string;
  targetType?: 'LIST' | 'PLACE_IN_LIST' | 'PROFILE'; // present for real (API-backed) items, needed to call the decision endpoint
  targetId?: string;
  title: string; // the flagged content's own title
  kind: string; // "Travel list" | "Comment" | "Profile" | …
  reason: string; // top-line reason shown in the queue row
  severity: ReportSeverity;
  excerpt: string | null; // the flagged content/snippet itself; null when the target has none (e.g. a profile with no bio)
  where: string;
  owner: string;
  handle: string;
  account: string; // "Business" | "Individual" — the API has no "Creator · Verified"/"Traveler" style label; see MER-795's spec
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
