import type {
  AccountStatus,
  AccountType,
  ReportDecision,
  ReportedItem,
  ReportSeverity,
  TargetType,
} from '@/lib/admin/moderation';

type Translate = (key: string, options?: Record<string, unknown>) => string;

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

export const ACCOUNT_TYPE_I18N_KEY: Record<AccountType, string> = {
  INDIVIDUAL: 'admin.moderation.accountTypeIndividual',
  BUSINESS: 'admin.moderation.accountTypeBusiness',
};

export const TARGET_KIND_I18N_KEY: Record<TargetType, string> = {
  LIST: 'admin.moderation.kindList',
  PLACE_IN_LIST: 'admin.moderation.kindPlaceInList',
  PROFILE: 'admin.moderation.kindProfile',
};

// The mobile app's fixed ReportSheet reason codes (apps/mobile ReportSheet.tsx) are the only
// values a real client ever sends, but the API's reason field stays an open string contract —
// an unrecognized code falls back to being shown as-is (see reasonLabel()) rather than crashing.
export const REASON_I18N_KEY: Record<string, string> = {
  spam_or_misleading: 'admin.moderation.reasonSpamOrMisleading',
  inappropriate_content: 'admin.moderation.reasonInappropriateContent',
  copyright_violation: 'admin.moderation.reasonCopyrightViolation',
  incorrect_information: 'admin.moderation.reasonIncorrectInformation',
  other: 'admin.moderation.reasonOther',
};

// Falls back to the raw code for a reason value this admin hasn't shipped a translation for
// yet, instead of throwing or showing a blank — safer than trusting the API's open contract
// to only ever send the 5 codes above.
export function reasonLabel(t: Translate, reasonCode: string): string {
  const key = REASON_I18N_KEY[reasonCode];
  return key ? t(key) : reasonCode;
}

export function targetKindLabel(t: Translate, targetType: TargetType | undefined): string {
  return targetType ? t(TARGET_KIND_I18N_KEY[targetType]) : '—';
}

// Composes the drawer's "Where it lives" field from the structured, per-target-kind data the
// API sends — the API itself sends no pre-composed prose (see MER-795's review), so this is
// the one place that assembles it, entirely through i18n.
export function whereItLivesLabel(t: Translate, report: ReportedItem): string {
  switch (report.targetType) {
    case 'LIST':
      return report.itemCount === null
        ? t('admin.moderation.whereListUnknownCount', { date: report.publishedAt ?? '—' })
        : t('admin.moderation.whereList', {
            count: report.itemCount,
            date: report.publishedAt ?? '—',
          });
    case 'PLACE_IN_LIST':
      return t('admin.moderation.wherePlace', {
        list: report.listTitle ?? '—',
        city: report.venueCity ?? '—',
        country: report.venueCountry ?? '—',
      });
    case 'PROFILE':
      return t('admin.moderation.whereProfile', {
        date: report.profileCreatedAt ?? '—',
        bio: report.bio ?? t('admin.moderation.noBio'),
      });
    default:
      return '—';
  }
}
