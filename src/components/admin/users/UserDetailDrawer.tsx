'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { badgeTone } from '@/lib/admin/badge-tone';
import { getUserHistory, getUserReports, getUserSubscriptions } from '@/lib/mocks/admin/users';
import type { UserRecord } from '@/lib/mocks/admin/users';

import { DrawerBlocks, type DrawerBlock } from '../drawer/DrawerBlocks';

export interface ProfileDraft {
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
}

type TabKey = 'perfil' | 'subscriptions' | 'historico' | 'denuncias';

const TAB_KEYS: TabKey[] = ['perfil', 'subscriptions', 'historico', 'denuncias'];

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

// `t` is threaded in explicitly (rather than calling useTranslation() here)
// because this is a plain function, not a component or hook — it's only
// ever called from inside UserDetailDrawer's render, which already has `t`
// from its own useTranslation() call.
function tabBlocks(
  user: UserRecord,
  tab: TabKey,
  t: (key: string, opts?: Record<string, unknown>) => string,
): DrawerBlock[] {
  if (tab === 'subscriptions') {
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
    const events = getUserHistory(user.id).map((e) => ({ title: e.title, time: e.time }));
    return [{ kind: 'timeline', events }];
  }
  if (tab === 'denuncias') {
    const reports = getUserReports(user.id);
    if (!reports.length) {
      return [
        {
          kind: 'empty',
          title: t('admin.users.drawer.noReportsTitle'),
          description: t('admin.users.drawer.noReportsDescription'),
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

interface UserDetailDrawerProps {
  user: UserRecord | null;
  onClose: () => void;
  onSaveProfile: (user: UserRecord, draft: ProfileDraft) => void;
}

export function UserDetailDrawer({ user, onClose, onSaveProfile }: UserDetailDrawerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('perfil');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  useEffect(() => {
    setTab('perfil');
    setEditing(false);
    setDraft(null);
  }, [user?.id]);

  if (!user) {
    return (
      <Sheet open={false} onOpenChange={(open) => !open && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const badge = badgeTone(user.type);
  const currentDraft = draft ?? draftFromUser(user);

  const stats = [
    { label: t('admin.users.drawer.statPlan'), value: user.plan },
    { label: t('admin.users.drawer.statFollowers'), value: user.followers },
    { label: t('admin.users.drawer.statFollowing'), value: user.following },
    {
      label: t('admin.users.drawer.statStatus'),
      value: user.status,
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
                <span className="text-lg font-semibold">{user.name}</span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ color: badge.color, background: badge.background }}
                >
                  {user.type}
                </span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {user.email}
              </div>
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

        <div
          role="tablist"
          className="flex flex-shrink-0 gap-1 overflow-x-auto border-b px-5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              type="button"
              onClick={() => setTab(key)}
              className="flex-shrink-0 whitespace-nowrap px-3 py-2 text-[13.5px] font-medium"
              style={{
                color: tab === key ? 'var(--brand-500)' : 'var(--text-secondary)',
                borderBottom: `2px solid ${tab === key ? 'var(--brand-500)' : 'transparent'}`,
                marginBottom: '-1px',
              }}
            >
              {t(TAB_LABEL_KEY[key])}
            </button>
          ))}
        </div>

        {tab === 'perfil' ? (
          !editing ? (
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
                  {(() => {
                    const acctTone = badgeTone(user.account === 'Business' ? 'Creator' : 'User');
                    return (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ color: acctTone.color, background: acctTone.background }}
                      >
                        {user.account === 'Business' ? 'Creator' : 'User'}
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
                  <div className="text-right font-medium">{user.plan}</div>
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
                        {user.status}
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
                onClick={() => {
                  setDraft(draftFromUser(user));
                  setEditing(true);
                }}
                className="inline-flex w-fit items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[13.5px] font-medium"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {t('admin.users.drawer.editProfile')}
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4.5 overflow-y-auto px-6 py-6">
              <div
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('admin.users.drawer.editProfileTitle')}
              </div>
              {(
                [
                  ['name', t('admin.users.drawer.fullName')],
                  ['email', t('admin.users.drawer.email')],
                  ['phone', t('admin.users.drawer.phone')],
                  ['location', t('admin.users.drawer.location')],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                  </label>
                  <input
                    value={currentDraft[field]}
                    onChange={(e) => setDraft({ ...currentDraft, [field]: e.target.value })}
                    className="rounded-[10px] border px-3 py-2.5 text-[13.5px] outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('admin.users.drawer.bioSection')}
                </label>
                <textarea
                  value={currentDraft.bio}
                  onChange={(e) => setDraft({ ...currentDraft, bio: e.target.value })}
                  rows={4}
                  className="resize-y rounded-[10px] border px-3 py-2.5 text-[13.5px] outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onSaveProfile(user, currentDraft);
                    setEditing(false);
                  }}
                  className="inline-flex items-center rounded-[10px] px-4.5 py-2.5 text-[13.5px] font-semibold text-white"
                  style={{ background: 'var(--brand-500)' }}
                >
                  {t('admin.users.drawer.saveChanges')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center rounded-[10px] border px-4.5 py-2.5 text-[13.5px] font-medium"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  {t('admin.users.drawer.cancel')}
                </button>
              </div>
            </div>
          )
        ) : (
          <DrawerBlocks blocks={tabBlocks(user, tab, t)} />
        )}
      </SheetContent>
    </Sheet>
  );
}
