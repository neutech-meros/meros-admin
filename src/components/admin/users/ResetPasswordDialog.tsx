'use client';

import { useEffect, useId, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

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

interface ChannelOptionProps {
  groupName: string;
  channel: Channel;
  selected: boolean;
  onSelect: () => void;
  title: string;
  editing: boolean;
  value: string;
  onValueChange: (value: string) => void;
  valid: boolean;
  emptyText: string;
  placeholder: string;
  inputLabel: string;
  editLabel: string;
  onEdit: () => void;
  numeric?: boolean;
}

function ChannelOption({
  groupName,
  channel,
  selected,
  onSelect,
  title,
  editing,
  value,
  onValueChange,
  valid,
  emptyText,
  placeholder,
  inputLabel,
  editLabel,
  onEdit,
  numeric = false,
}: ChannelOptionProps) {
  const radioId = `${groupName}-${channel}`;
  const inputId = `${radioId}-input`;

  return (
    <div
      className="relative grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl border px-3.5 py-3 has-[input[type=radio]:focus-visible]:outline-2 has-[input[type=radio]:focus-visible]:outline-offset-2"
      style={{
        borderColor: selected ? 'var(--brand-500)' : 'var(--border-subtle)',
        background: selected ? 'var(--brand-100)' : 'var(--bg-elevated)',
        outlineColor: 'var(--brand-500)',
      }}
    >
      <label htmlFor={radioId} className="contents cursor-pointer">
        <input
          id={radioId}
          type="radio"
          name={groupName}
          value={channel}
          checked={selected}
          onChange={onSelect}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className="row-span-2 h-4 w-4 flex-shrink-0 cursor-pointer rounded-full"
          style={{
            border: selected ? '5px solid var(--brand-500)' : '1.5px solid var(--border-strong)',
            background: selected ? 'var(--bg-elevated)' : 'transparent',
          }}
        />
        <span className="col-start-2 row-start-1 block cursor-pointer text-[13.5px] font-medium">
          {title}
        </span>
        {!editing && (
          <span
            className={`col-start-2 row-start-2 block cursor-pointer text-[12.5px]${numeric ? ' tabular-nums' : ''}`}
            style={{ color: valid ? 'var(--text-secondary)' : 'var(--danger)' }}
          >
            {value || emptyText}
          </span>
        )}
      </label>
      {editing && (
        <>
          <label htmlFor={inputId} className="sr-only">
            {inputLabel}
          </label>
          <input
            id={inputId}
            autoFocus
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={placeholder}
            className="col-start-2 row-start-2 mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          />
        </>
      )}
      <button
        type="button"
        aria-label={editLabel}
        onClick={onEdit}
        className="col-start-3 row-span-2 row-start-1 flex-shrink-0 rounded-md p-1"
        style={{ color: valid ? 'var(--text-secondary)' : 'var(--danger)' }}
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
          aria-hidden="true"
        >
          <path d="M4 20h4l10-10-4-4L4 16z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
      </button>
    </div>
  );
}

export function ResetPasswordDialog({ target, onClose }: ResetPasswordDialogProps) {
  const { t } = useTranslation();
  const [channel, setChannel] = useState<Channel>('email');
  const [editing, setEditing] = useState<Channel | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const groupName = useId();

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
          <DialogDescription
            className="mt-1 text-[13px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('admin.users.resetPassword.subtitle', { name: target.name })}
          </DialogDescription>
        </div>

        <div
          role="radiogroup"
          aria-labelledby={`${groupName}-label`}
          className="flex flex-col gap-2.5 px-6 pb-1 pt-5"
        >
          <div
            id={`${groupName}-label`}
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('admin.users.resetPassword.sendLinkTo')}
          </div>

          <ChannelOption
            groupName={groupName}
            channel="email"
            selected={channel === 'email'}
            onSelect={() => setChannel('email')}
            title={t('admin.users.resetPassword.email')}
            editing={editing === 'email'}
            value={emailDraft}
            onValueChange={setEmailDraft}
            valid={emailOk}
            emptyText={t('admin.users.resetPassword.noEmail')}
            placeholder="name@mail.com"
            inputLabel={t('admin.users.resetPassword.emailInputLabel')}
            editLabel={t('admin.users.resetPassword.editEmail')}
            onEdit={() => startEdit('email')}
          />
          <ChannelOption
            groupName={groupName}
            channel="phone"
            selected={channel === 'phone'}
            onSelect={() => setChannel('phone')}
            title={t('admin.users.resetPassword.sms')}
            editing={editing === 'phone'}
            value={phoneDraft}
            onValueChange={setPhoneDraft}
            valid={phoneOk}
            emptyText={t('admin.users.resetPassword.noPhone')}
            placeholder="+55 00 00000-0000"
            inputLabel={t('admin.users.resetPassword.phoneInputLabel')}
            editLabel={t('admin.users.resetPassword.editPhone')}
            onEdit={() => startEdit('phone')}
            numeric
          />
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
