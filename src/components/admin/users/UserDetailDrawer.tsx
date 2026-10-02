'use client';

import { useEffect, useId, useState } from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { z } from 'zod';

import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { UNKNOWN_VALUE } from '@/lib/admin/accounts';
import { badgeTone } from '@/lib/admin/badge-tone';
import {
  loadUserDetails,
  productPlan,
  type SubscriptionEvent,
  type SubscriptionStatus,
  type UserDetails,
} from '@/lib/admin/user-details';
import { PLAN_LABEL_KEY, ROLE_LABEL_KEY, STATUS_LABEL_KEY } from '@/lib/admin/users-table';
import { getUserHistory, getUserReports, getUserSubscriptions } from '@/lib/mocks/admin/users';
import type { UserRecord } from '@/lib/mocks/admin/users';

import { DrawerBlocks, type DrawerBlock } from '../drawer/DrawerBlocks';

// RevenueCat's known cancel_reason values. Unmapped values (a future reason RevenueCat adds,
// or any other unexpected string) fall back to the plain "Cancelled the subscription" copy
// rather than interpolating a raw enum into a translated sentence.
const CANCEL_REASON_I18N_KEY: Record<string, string> = {
  UNSUBSCRIBE: 'admin.users.drawer.cancelReason.unsubscribe',
  BILLING_ERROR: 'admin.users.drawer.cancelReason.billingError',
  DEVELOPER_INITIATED: 'admin.users.drawer.cancelReason.developerInitiated',
  PRICE_INCREASE: 'admin.users.drawer.cancelReason.priceIncrease',
  CUSTOMER_SUPPORT: 'admin.users.drawer.cancelReason.customerSupport',
  UNKNOWN: 'admin.users.drawer.cancelReason.unknown',
};

const profileSchema = z.object({
  name: z.string().trim().min(1, 'admin.users.drawer.nameRequired'),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || z.string().email().safeParse(value).success, {
      message: 'admin.users.drawer.invalidEmail',
    }),
  phone: z.string(),
  location: z.string(),
  bio: z.string(),
});

export type ProfileDraft = z.infer<typeof profileSchema>;

type TabKey = 'perfil' | 'subscriptions' | 'historico' | 'denuncias';

const TAB_KEYS: TabKey[] = ['perfil', 'subscriptions', 'historico', 'denuncias'];

const BLOCK_TAB_KEYS = ['subscriptions', 'historico', 'denuncias'] as const;

function isTabKey(value: string): value is TabKey {
  return (TAB_KEYS as string[]).includes(value);
}

const TAB_LABEL_KEY: Record<TabKey, string> = {
  perfil: 'admin.users.drawer.tabProfile',
  subscriptions: 'admin.users.drawer.tabSubscriptions',
  historico: 'admin.users.drawer.tabHistory',
  denuncias: 'admin.users.drawer.tabReports',
};

function draftFromUser(user: UserRecord): ProfileDraft {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
  };
}

type Translate = (key: string, opts?: Record<string, unknown>) => string;

const SUBSCRIPTION_STATUS: Record<
  SubscriptionStatus,
  { labelKey: string; tone: Parameters<typeof badgeTone>[1] }
> = {
  ACTIVE: { labelKey: 'admin.users.drawer.subscriptionStatus.active', tone: 'success' },
  CANCELLED: { labelKey: 'admin.users.drawer.subscriptionStatus.cancelled', tone: 'neutral' },
  GRACE_PERIOD: { labelKey: 'admin.users.drawer.subscriptionStatus.gracePeriod', tone: 'warning' },
  EXPIRED: { labelKey: 'admin.users.drawer.subscriptionStatus.expired', tone: 'danger' },
};

function planDisplay(plan: UserRecord['plan'], t: Translate): string {
  return plan ? t(PLAN_LABEL_KEY[plan]) : UNKNOWN_VALUE;
}

function planLabel(productId: string | null, t: Translate): string {
  if (productId === null) return UNKNOWN_VALUE;
  const plan = productPlan(productId);
  return plan === null ? productId : t(`admin.users.planOptions.${plan}`);
}

function subscriptionEventTitle(event: SubscriptionEvent, t: Translate): string {
  const plan = planLabel(event.newProductId, t);
  const subscribed =
    event.previousProductId === null || productPlan(event.previousProductId) === 'freemium';
  return subscribed
    ? t('admin.users.drawer.historySubscribed', { plan })
    : t('admin.users.drawer.historyPlanChanged', { plan });
}

interface DatedEvent {
  at: string;
  title: string;
}

function realHistoryEvents(details: UserDetails, t: Translate): DatedEvent[] {
  const passwordChanges = details.passwordResetLogs.ok
    ? details.passwordResetLogs.data.items
        .filter((log) => log.outcome === 'SUCCESS')
        .map((log) => ({
          at: log.createdAt,
          title: t('admin.users.drawer.historyPasswordChanged'),
        }))
    : [];
  const planChanges = details.subscriptionEvents.ok
    ? details.subscriptionEvents.data.items.map((event) => ({
        at: event.createdAt,
        title: subscriptionEventTitle(event, t),
      }))
    : [];
  const cancellations = details.planCancellations.ok
    ? details.planCancellations.data.items.map((cancellation) => {
        const reasonKey =
          cancellation.reason !== null ? CANCEL_REASON_I18N_KEY[cancellation.reason] : undefined;
        return {
          at: cancellation.cancelledAt,
          title: reasonKey
            ? t('admin.users.drawer.historyCancelledWithReason', { reason: t(reasonKey) })
            : t('admin.users.drawer.historyCancelled'),
        };
      })
    : [];
  const deactivations = details.deactivationHistory.ok
    ? details.deactivationHistory.data.items.map((deactivation) => ({
        at: deactivation.deactivatedAt,
        title: t('admin.users.drawer.historyDeactivated'),
      }))
    : [];
  return [...passwordChanges, ...planChanges, ...cancellations, ...deactivations];
}

const ACTIVE_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'ACTIVE',
  'GRACE_PERIOD',
]);

interface TabContext {
  createdAtDisplay: string | undefined;
  details: UserDetails | null;
  formatDate: (iso: string) => string;
}

// `t` is threaded in explicitly (rather than calling useTranslation() here)
// because this is a plain function, not a component or hook — it's only
// ever called from inside UserDetailDrawer's render, which already has `t`
// from its own useTranslation() call.
function tabBlocks(
  user: UserRecord,
  tab: TabKey,
  t: Translate,
  { createdAtDisplay, details, formatDate }: TabContext,
  onRetry: () => void,
): DrawerBlock[] {
  if ((tab === 'subscriptions' || tab === 'historico') && details === null) {
    return [{ kind: 'loading', label: t('admin.users.drawer.loadingDetails') }];
  }
  const isRealAccount = Boolean(createdAtDisplay);
  if (tab === 'subscriptions') {
    // A real account's own data failing to load is a fetch problem, not "no
    // subscription" — conflating the two would report an outage as a fact
    // about the user. Mock accounts always fail this fetch (they aren't real
    // upstream ids), so this only applies once we know the account is real.
    if (isRealAccount && details && !details.subscription.ok) {
      return [
        {
          kind: 'empty',
          title: t('admin.users.drawer.loadErrorTitle'),
          description: t('admin.users.drawer.loadErrorDescription'),
          onRetry,
          retryLabel: t('admin.users.drawer.retry'),
        },
      ];
    }
    const real = details?.subscription.ok ? details.subscription.data.subscription : null;
    const cancelledInPeriod =
      real?.status === 'CANCELLED' && new Date(real.currentPeriodEnd).getTime() > Date.now();
    if (real && (ACTIVE_SUBSCRIPTION_STATUSES.has(real.status) || cancelledInPeriod)) {
      const status = SUBSCRIPTION_STATUS[real.status];
      const tone = badgeTone(real.status, status.tone);
      return [
        { kind: 'kv', label: t('admin.users.drawer.subPlan'), value: planDisplay(user.plan, t) },
        {
          kind: 'kv',
          label: t('admin.users.drawer.subListPrice'),
          value: real.fallbackPrice,
          numeric: true,
        },
        {
          kind: 'kv',
          label: t('admin.users.drawer.subSince'),
          value: formatDate(real.subscriberSince),
          numeric: true,
        },
        {
          kind: 'kv',
          label: t('admin.users.drawer.subStatus'),
          value: t(status.labelKey),
          badge: true,
          toneColor: tone.color,
          toneBackground: tone.background,
        },
        ...(cancelledInPeriod
          ? [
              {
                kind: 'kv' as const,
                label: t('admin.users.drawer.subAccessUntil'),
                value: formatDate(real.currentPeriodEnd),
                numeric: true,
              },
            ]
          : []),
      ];
    }
    // A real account's subscription fetch already succeeded by this point (the failed-fetch
    // case returned above) — a null/inactive `real` here is a definitive "no active
    // subscription" answer, not an "we haven't wired this up" placeholder.
    if (isRealAccount) {
      return [
        {
          kind: 'empty',
          title: t('admin.users.drawer.noSubscriptionTitle'),
          description: t(
            user.plan === 'Premium'
              ? 'admin.users.drawer.noStoreSubscriptionPremiumDescription'
              : 'admin.users.drawer.noSubscriptionDescription',
          ),
        },
      ];
    }
    const subs = getUserSubscriptions(user.id);
    if (!subs.length) {
      return [
        {
          kind: 'empty',
          title: t('admin.users.drawer.noSubscriptionTitle'),
          description: t('admin.users.drawer.noSubscriptionDescription'),
        },
      ];
    }
    return subs.flatMap((s): DrawerBlock[] => {
      const tone = badgeTone(s.status);
      return [
        { kind: 'kv', label: t('admin.users.drawer.subPlan'), value: s.plan },
        { kind: 'kv', label: t('admin.users.drawer.subAmount'), value: s.amount, numeric: true },
        { kind: 'kv', label: t('admin.users.drawer.subSince'), value: s.since, numeric: true },
        {
          kind: 'kv',
          label: t('admin.users.drawer.subStatus'),
          value: s.status,
          badge: true,
          toneColor: tone.color,
          toneBackground: tone.background,
        },
      ];
    });
  }
  if (tab === 'historico') {
    const allSourcesFailed =
      isRealAccount &&
      details !== null &&
      !details.passwordResetLogs.ok &&
      !details.subscriptionEvents.ok &&
      !details.planCancellations.ok &&
      !details.deactivationHistory.ok;
    if (allSourcesFailed) {
      return [
        {
          kind: 'empty',
          title: t('admin.users.drawer.loadErrorTitle'),
          description: t('admin.users.drawer.loadErrorDescription'),
          onRetry,
          retryLabel: t('admin.users.drawer.retry'),
        },
      ];
    }
    const real = details ? realHistoryEvents(details, t) : [];
    if (real.length > 0) {
      const created: DatedEvent[] = user.createdAtIso
        ? [{ at: user.createdAtIso, title: t('admin.users.drawer.historyAccountCreated') }]
        : [];
      const events = [...created, ...real]
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
        .map((e) => ({ title: e.title, time: formatDate(e.at) }));
      return [{ kind: 'timeline', events }];
    }
    const seeded = getUserHistory(user.id);
    const events =
      seeded.length === 0 && createdAtDisplay
        ? [{ title: t('admin.users.drawer.historyAccountCreated'), time: createdAtDisplay }]
        : seeded.map((e) => ({ title: e.title, time: e.time }));
    return [{ kind: 'timeline', events }];
  }
  if (tab === 'denuncias') {
    const reports = getUserReports(user.id);
    if (!reports.length) {
      return [
        {
          kind: 'empty',
          title: isRealAccount
            ? t('admin.users.drawer.notAvailableTitle')
            : t('admin.users.drawer.noReportsTitle'),
          description: isRealAccount
            ? t('admin.users.drawer.notAvailableDescription')
            : t('admin.users.drawer.noReportsDescription'),
        },
      ];
    }
    return [
      {
        kind: 'table',
        columns: [
          t('admin.users.drawer.reportType'),
          t('admin.users.drawer.reportReason'),
          t('admin.users.drawer.reportStatus'),
          t('admin.users.drawer.reportDate'),
        ],
        rows: reports.map((r) => {
          const typeTone = badgeTone(r.type, r.type === 'Received' ? 'danger' : 'neutral');
          const statusTone = badgeTone(r.status);
          return {
            cells: [
              {
                text: r.type,
                badge: true,
                toneColor: typeTone.color,
                toneBackground: typeTone.background,
              },
              { text: r.reason, maxWidth: '180px' },
              {
                text: r.status,
                badge: true,
                toneColor: statusTone.color,
                toneBackground: statusTone.background,
              },
              { text: r.date, numeric: true },
            ],
          };
        }),
      },
    ];
  }
  return [];
}

const FIELD_STYLE = {
  borderColor: 'var(--border-subtle)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
};

const TEXT_FIELDS = [
  ['name', 'admin.users.drawer.fullName'],
  ['email', 'admin.users.drawer.email'],
  ['phone', 'admin.users.drawer.phone'],
  ['location', 'admin.users.drawer.location'],
] as const;

interface ProfileEditFormProps {
  user: UserRecord;
  onSave: (values: ProfileDraft) => void;
  onCancel: () => void;
}

function ProfileEditForm({ user, onSave, onCancel }: ProfileEditFormProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileDraft>({
    resolver: zodResolver(profileSchema),
    defaultValues: draftFromUser(user),
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSave)}
      className="flex flex-1 flex-col gap-4.5 overflow-y-auto px-6 py-6"
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-secondary)' }}
      >
        {t('admin.users.drawer.editProfileTitle')}
      </div>
      {TEXT_FIELDS.map(([field, labelKey]) => {
        const inputId = `${idPrefix}-${field}`;
        const errorId = `${inputId}-error`;
        const error = errors[field]?.message;
        return (
          <div key={field} className="flex flex-col gap-1.5">
            <label
              htmlFor={inputId}
              className="text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t(labelKey)}
            </label>
            <input
              id={inputId}
              type={field === 'email' ? 'email' : 'text'}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              {...register(field)}
              className="rounded-[10px] border px-3 py-2.5 text-[13.5px] outline-none"
              style={{
                ...FIELD_STYLE,
                borderColor: error ? 'var(--danger)' : FIELD_STYLE.borderColor,
              }}
            />
            {error && (
              <p id={errorId} className="text-xs" style={{ color: 'var(--danger)' }}>
                {t(error)}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${idPrefix}-bio`}
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('admin.users.drawer.bioSection')}
        </label>
        <textarea
          id={`${idPrefix}-bio`}
          {...register('bio')}
          rows={4}
          className="resize-y rounded-[10px] border px-3 py-2.5 text-[13.5px] outline-none"
          style={FIELD_STYLE}
        />
      </div>
      <div className="flex gap-2.5 pt-1">
        <button
          type="submit"
          className="inline-flex items-center rounded-[10px] px-4.5 py-2.5 text-[13.5px] font-semibold text-white"
          style={{ background: 'var(--brand-500)' }}
        >
          {t('admin.users.drawer.saveChanges')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-[10px] border px-4.5 py-2.5 text-[13.5px] font-medium"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {t('admin.users.drawer.cancel')}
        </button>
      </div>
    </form>
  );
}

interface UserDetailDrawerProps {
  user: UserRecord | null;
  onClose: () => void;
  onSaveProfile: (user: UserRecord, draft: ProfileDraft) => void;
}

export function UserDetailDrawer({ user, onClose, onSaveProfile }: UserDetailDrawerProps) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<TabKey>('perfil');
  const [editing, setEditing] = useState(false);

  const [loadedDetails, setLoadedDetails] = useState<UserDetails | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    setTab('perfil');
    setEditing(false);
  }, [user?.id]);

  useEffect(() => {
    if (userId === undefined) return;
    let cancelled = false;
    loadUserDetails(userId).then((details) => {
      if (!cancelled) setLoadedDetails(details);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, retryToken]);

  function retryLoadDetails() {
    setLoadedDetails(null);
    setRetryToken((n) => n + 1);
  }

  if (!user) {
    return (
      <Sheet open={false} onOpenChange={(open) => !open && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const badge = badgeTone(user.type);
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formatDate = (iso: string) => dateFormat.format(new Date(iso));
  const createdAtDisplay = user.createdAtIso ? formatDate(user.createdAtIso) : undefined;
  const details = loadedDetails?.userId === user.id ? loadedDetails : null;

  const stats = [
    { label: t('admin.users.drawer.statPlan'), value: planDisplay(user.plan, t) },
    { label: t('admin.users.drawer.statFollowers'), value: user.followers },
    { label: t('admin.users.drawer.statFollowing'), value: user.following },
    {
      label: t('admin.users.drawer.statStatus'),
      value: t(STATUS_LABEL_KEY[user.status]),
      color: badgeTone(user.status).color,
    },
  ];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full gap-0 p-0 sm:max-w-none"
        style={{
          width: '480px',
          maxWidth: '92vw',
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="flex flex-shrink-0 items-center justify-between gap-3 border-b p-5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
              style={{ background: user.avatarColor }}
            >
              {user.initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg font-semibold">{user.name}</SheetTitle>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ color: badge.color, background: badge.background }}
                >
                  {t(ROLE_LABEL_KEY[user.type])}
                </span>
              </div>
              <SheetDescription className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {user.email}
              </SheetDescription>
            </div>
          </div>
        </div>

        <div
          className="flex gap-2 border-b px-5 pb-5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {stats.map((s) => (
            <div key={s.label} className="min-w-0 flex-1">
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {s.label}
              </div>
              <div
                className="tabular-nums text-sm font-medium"
                style={{ color: s.color ?? 'inherit' }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <TabsPrimitive.Root
          value={tab}
          onValueChange={(value) => isTabKey(value) && setTab(value)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsPrimitive.List
            className="flex flex-shrink-0 flex-wrap gap-1 border-b px-5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {TAB_KEYS.map((key) => (
              <TabsPrimitive.Trigger
                key={key}
                value={key}
                className="flex-shrink-0 whitespace-nowrap px-3 py-2 text-[13.5px] font-medium"
                style={{
                  color: tab === key ? 'var(--brand-500)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${tab === key ? 'var(--brand-500)' : 'transparent'}`,
                  marginBottom: '-1px',
                }}
              >
                {t(TAB_LABEL_KEY[key])}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          <TabsPrimitive.Content
            value="perfil"
            className="flex min-h-0 flex-1 flex-col outline-none"
          >
            {!editing ? (
              <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 py-6">
                <div>
                  <div
                    className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('admin.users.drawer.contactSection')}
                  </div>
                  {[
                    [t('admin.users.drawer.fullName'), user.name],
                    [t('admin.users.drawer.email'), user.email],
                    [t('admin.users.drawer.phone'), user.phone],
                    [t('admin.users.drawer.location'), user.location],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-4 border-b py-2.5 text-[13.5px]"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {label}
                      </div>
                      <div className="text-right font-medium">{value}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div
                    className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('admin.users.drawer.accountSection')}
                  </div>
                  <div
                    className="flex items-center justify-between gap-4 border-b py-2.5 text-[13.5px]"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {t('admin.users.drawer.accountType')}
                    </div>
                    {/* `account` and `type` are independent fields in the source data
                      model and may legitimately disagree for a given user (e.g. seed
                      `u8`: account 'Business' but type 'User') — this is not a bug to
                      reconcile, the header badge above intentionally reflects `type`
                      while this one reflects `account`. */}
                    {(() => {
                      const role = user.account === 'Business' ? 'Creator' : 'User';
                      const acctTone = badgeTone(role);
                      return (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ color: acctTone.color, background: acctTone.background }}
                        >
                          {t(ROLE_LABEL_KEY[role])}
                        </span>
                      );
                    })()}
                  </div>
                  <div
                    className="flex items-baseline justify-between gap-4 border-b py-2.5 text-[13.5px]"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {t('admin.users.drawer.plan')}
                    </div>
                    <div className="text-right font-medium">{planDisplay(user.plan, t)}</div>
                  </div>
                  <div
                    className="flex items-baseline justify-between gap-4 border-b py-2.5 text-[13.5px]"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {t('admin.users.drawer.joinedOn')}
                    </div>
                    <div className="tabular-nums text-right font-medium">{user.joined}</div>
                  </div>
                  <div
                    className="flex items-center justify-between gap-4 border-b py-2.5 text-[13.5px]"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {t('admin.users.drawer.status')}
                    </div>
                    {(() => {
                      const statusTone = badgeTone(user.status);
                      return (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ color: statusTone.color, background: statusTone.background }}
                        >
                          {t(STATUS_LABEL_KEY[user.status])}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <div
                    className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('admin.users.drawer.bioSection')}
                  </div>
                  <div className="text-[13.5px] leading-relaxed">
                    {user.bio || t('admin.users.drawer.noBio')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex w-fit items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[13.5px] font-medium"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  {t('admin.users.drawer.editProfile')}
                </button>
              </div>
            ) : (
              <ProfileEditForm
                user={user}
                onSave={(values) => {
                  onSaveProfile(user, values);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            )}
          </TabsPrimitive.Content>
          {BLOCK_TAB_KEYS.map((key) => (
            <TabsPrimitive.Content
              key={key}
              value={key}
              className="flex min-h-0 flex-1 flex-col outline-none"
            >
              <DrawerBlocks
                blocks={tabBlocks(
                  user,
                  key,
                  t,
                  { createdAtDisplay, details, formatDate },
                  retryLoadDetails,
                )}
              />
            </TabsPrimitive.Content>
          ))}
        </TabsPrimitive.Root>
      </SheetContent>
    </Sheet>
  );
}
