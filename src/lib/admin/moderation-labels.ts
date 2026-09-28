import type { AccountStatus, ReportDecision, ReportSeverity } from '@/lib/admin/moderation';

// Maps each internal (English) enum value to its translation key. The English value itself
// stays the lookup key for statusStyle()'s tone map — only the *displayed* text goes through
// i18n, so badge colors don't need their own i18n layer.
export const SEVERITY_I18N_KEY: Record<ReportSeverity, string> = {
  High: 'admin.moderation.severityHigh',
  Average: 'admin.moderation.severityAverage',
  Low: 'admin.moderation.severityLow',
};

export const DECISION_I18N_KEY: Record<ReportDecision, string> = {
  Kept: 'admin.moderation.decisionKept',
  Removed: 'admin.moderation.decisionRemoved',
};

export const ACCOUNT_STATUS_I18N_KEY: Record<AccountStatus, string> = {
  ACTIVE: 'admin.moderation.accountStatusActive',
  INACTIVE: 'admin.moderation.accountStatusInactive',
  SUSPENDED: 'admin.moderation.accountStatusSuspended',
  DELETED: 'admin.moderation.accountStatusDeleted',
};
