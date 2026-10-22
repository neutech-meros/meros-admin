'use client';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { CategoryRequestItem } from '@/lib/admin/category-requests-api';

const K = 'admin.categoryRequests.rejectDialog';
const MAX_REASON = 500;

function rejectFormSchema(tooLong: string) {
  return z.object({ reason: z.string().max(MAX_REASON, tooLong) });
}
type RejectForm = z.infer<ReturnType<typeof rejectFormSchema>>;

const FIELD_STYLE = {
  background: 'var(--bg-surface)',
  borderColor: 'var(--border-subtle)',
  color: 'var(--text-primary)',
};

interface RejectCategoryRequestDialogProps {
  request: CategoryRequestItem | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (reason: string | undefined) => void;
}

function RejectFormBody({
  request,
  submitting,
  onCancel,
  onConfirm,
}: RejectCategoryRequestDialogProps & { request: CategoryRequestItem }) {
  const { t } = useTranslation();
  const form = useForm<RejectForm>({
    resolver: zodResolver(rejectFormSchema(t(`${K}.tooLong`))),
    defaultValues: { reason: '' },
  });
  const length = form.watch('reason').length;

  function submit({ reason }: RejectForm) {
    const trimmed = reason.trim();
    onConfirm(trimmed === '' ? undefined : trimmed);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>{t(`${K}.title`)}</DialogTitle>
          <DialogDescription style={{ color: 'var(--text-secondary)' }}>
            {t(`${K}.description`, { name: request.name, requester: request.requester })}
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t(`${K}.reasonLabel`)}{' '}
                <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>
                  ({t(`${K}.optional`)})
                </span>
              </FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={4}
                  placeholder={t(`${K}.placeholder`)}
                  className="rounded-[10px] border px-3.5 py-3 text-sm"
                  style={FIELD_STYLE}
                />
              </FormControl>
              <div className="flex items-start justify-between gap-3">
                <FormMessage />
                <span
                  className="ml-auto text-xs tabular-nums"
                  style={{ color: length > MAX_REASON ? 'var(--danger)' : 'var(--text-secondary)' }}
                >
                  {t(`${K}.counter`, { count: length, max: MAX_REASON })}
                </span>
              </div>
            </FormItem>
          )}
        />

        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-[10px] border px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={FIELD_STYLE}
          >
            {t(`${K}.cancel`)}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-[10px] border px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ borderColor: 'var(--danger)', background: 'var(--danger)' }}
          >
            {t(`${K}.confirm`)}
          </button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function RejectCategoryRequestDialog(props: RejectCategoryRequestDialogProps) {
  const { request, submitting, onCancel } = props;
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && !submitting && onCancel()}>
      <DialogContent style={{ background: 'var(--bg-elevated)' }}>
        {request ? <RejectFormBody key={request.id} {...props} request={request} /> : null}
      </DialogContent>
    </Dialog>
  );
}
