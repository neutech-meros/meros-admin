'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ResetPasswordTarget {
  name: string;
  email: string;
  phone: string;
}

interface ResetPasswordDialogProps {
  target: ResetPasswordTarget | null;
  onClose: () => void;
}

type Channel = 'email' | 'phone';

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

function isValid(channel: Channel, value: string): boolean {
  if (channel === 'email') return EMAIL_RE.test(value);
  return value.replace(/\D/g, '').length >= 8;
}

export function ResetPasswordDialog({ target, onClose }: ResetPasswordDialogProps) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState<Channel>('email');
  const [editing, setEditing] = useState<Channel | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');

  useEffect(() => {
    setChannel('email');
    setEditing(null);
    setEmailDraft(target?.email ?? '');
    setPhoneDraft(target?.phone ?? '');
  }, [target?.email, target?.phone]);

  if (!target) {
    return (
      <Dialog open={false} onOpenChange={(open) => !open && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const emailOk = isValid('email', emailDraft);
  const phoneOk = isValid('phone', phoneDraft);

  function startEdit(ch: Channel) {
    setEditing((cur) => (cur === ch ? null : ch));
    setChannel(ch);
  }

  function handleSend() {
    const ok = channel === 'phone' ? phoneOk : emailOk;
    const dest = channel === 'phone' ? phoneDraft : emailDraft;
    if (!ok) {
      setEditing(channel);
      toast.error(
        t(
          channel === 'phone'
            ? 'admin.users.resetPassword.invalidPhoneTitle'
            : 'admin.users.resetPassword.invalidEmailTitle',
        ),
        {
          description: dest
            ? t('admin.users.resetPassword.invalidHint')
            : t('admin.users.resetPassword.missingHint'),
        },
      );
      return;
    }
    toast.success(t('admin.users.resetPassword.sentTitle'), {
      description: t('admin.users.resetPassword.sentDescription', { destination: dest }),
    });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[440px] gap-0 overflow-hidden p-0"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="p-6 pb-0">
          <DialogTitle className="text-[17px] font-semibold tracking-tight">
            {t('admin.users.resetPassword.title')}
          </DialogTitle>
          <div
            className="mt-1 text-[13px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('admin.users.resetPassword.subtitle', { name: target.name })}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-6 pb-1 pt-5">
          <div
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('admin.users.resetPassword.sendLinkTo')}
          </div>

          <div
            onClick={() => setChannel('email')}
            className="flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3"
            style={{
              borderColor: channel === 'email' ? 'var(--brand-500)' : 'var(--border-subtle)',
              background: channel === 'email' ? 'var(--brand-100)' : 'var(--bg-elevated)',
            }}
          >
            <span
              className="h-4 w-4 flex-shrink-0 rounded-full"
              style={{
                border:
                  channel === 'email'
                    ? '5px solid var(--brand-500)'
                    : '1.5px solid var(--border-strong)',
                background: channel === 'email' ? 'var(--bg-elevated)' : 'transparent',
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium">
                {t('admin.users.resetPassword.email')}
              </span>
              {editing === 'email' ? (
                <input
                  autoFocus
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="name@mail.com"
                  className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none"
                  style={{
                    borderColor: 'var(--border-strong)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              ) : (
                <span
                  className="block text-[12.5px]"
                  style={{ color: emailOk ? 'var(--text-secondary)' : 'var(--danger)' }}
                >
                  {emailDraft || t('admin.users.resetPassword.noEmail')}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startEdit('email');
              }}
              className="flex-shrink-0 rounded-md p-1"
              style={{ color: emailOk ? 'var(--text-secondary)' : 'var(--danger)' }}
            >
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                stroke="currentColor"
                fill="none"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 20h4l10-10-4-4L4 16z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            </button>
          </div>

          <div
            onClick={() => setChannel('phone')}
            className="flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3"
            style={{
              borderColor: channel === 'phone' ? 'var(--brand-500)' : 'var(--border-subtle)',
              background: channel === 'phone' ? 'var(--brand-100)' : 'var(--bg-elevated)',
            }}
          >
            <span
              className="h-4 w-4 flex-shrink-0 rounded-full"
              style={{
                border:
                  channel === 'phone'
                    ? '5px solid var(--brand-500)'
                    : '1.5px solid var(--border-strong)',
                background: channel === 'phone' ? 'var(--bg-elevated)' : 'transparent',
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium">
                {t('admin.users.resetPassword.sms')}
              </span>
              {editing === 'phone' ? (
                <input
                  autoFocus
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="+55 00 00000-0000"
                  className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none"
                  style={{
                    borderColor: 'var(--border-strong)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              ) : (
                <span
                  className="tabular-nums block text-[12.5px]"
                  style={{ color: phoneOk ? 'var(--text-secondary)' : 'var(--danger)' }}
                >
                  {phoneDraft || t('admin.users.resetPassword.noPhone')}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startEdit('phone');
              }}
              className="flex-shrink-0 rounded-md p-1"
              style={{ color: phoneOk ? 'var(--text-secondary)' : 'var(--danger)' }}
            >
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                stroke="currentColor"
                fill="none"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 20h4l10-10-4-4L4 16z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="mx-6 mt-4 flex items-start gap-2.5 rounded-[10px] px-3.5 py-2.5 text-xs leading-relaxed"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
        >
          <svg
            viewBox="0 0 24 24"
            width={14}
            height={14}
            className="mt-0.5 flex-shrink-0"
            stroke="currentColor"
            fill="none"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v5h1" />
          </svg>
          {t('admin.users.resetPassword.expiryNote')}
        </div>

        <div className="flex justify-end gap-2.5 p-6 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-[10px] border px-4.5 py-2.5 text-[13.5px] font-medium"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {t('admin.users.resetPassword.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="inline-flex items-center rounded-[10px] px-4.5 py-2.5 text-[13.5px] font-semibold text-white"
            style={{ background: 'var(--brand-500)' }}
          >
            {channel === 'phone'
              ? t('admin.users.resetPassword.sendSms')
              : t('admin.users.resetPassword.sendEmail')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
