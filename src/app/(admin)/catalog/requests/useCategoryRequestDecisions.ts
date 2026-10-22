import { useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import type { CreateCategorySummary } from '@/components/admin/category-requests/CreateCategoryModal';
import {
  approveCategoryRequest,
  rejectCategoryRequest,
  type ApproveCategoryRequestPayload,
  type CategoryRequestItem,
} from '@/lib/admin/category-requests-api';

const K = 'admin.categoryRequests.toasts';

type Failure = 'not-found' | 'already-resolved' | 'name-exists' | 'error';

export function useCategoryRequestDecisions(onChanged: () => void) {
  const { t } = useTranslation();
  const [approving, setApproving] = useState<CategoryRequestItem | null>(null);
  const [rejecting, setRejecting] = useState<CategoryRequestItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  function close() {
    setApproving(null);
    setRejecting(null);
  }

  // Returns whether the dialog should stay open so the admin can adjust and retry.
  function reportFailure(kind: Failure, failedTitleKey: string, name: string): boolean {
    switch (kind) {
      case 'name-exists':
        toast.error(t(`${K}.nameExistsTitle`), {
          description: t(`${K}.nameExistsDescription`, { name }),
        });
        return true;
      case 'already-resolved':
        toast.error(t(`${K}.alreadyResolvedTitle`), {
          description: t(`${K}.alreadyResolvedDescription`),
        });
        return false;
      case 'not-found':
        toast.error(t(`${K}.notFoundTitle`), { description: t(`${K}.notFoundDescription`) });
        return false;
      case 'error':
        toast.error(t(failedTitleKey), { description: t(`${K}.actionFailedDescription`) });
        return true;
    }
  }

  async function run(action: () => Promise<boolean>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const keepOpen = await action();
      if (!keepOpen) {
        close();
        onChanged();
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  function confirmApprove(payload: ApproveCategoryRequestPayload, summary: CreateCategorySummary) {
    const request = approving;
    if (!request) return;
    void run(async () => {
      const outcome = await approveCategoryRequest(request.id, payload);
      if (outcome.kind !== 'ok') {
        return reportFailure(outcome.kind, `${K}.approveFailedTitle`, summary.name);
      }
      if (summary.parentPath === null) {
        toast.success(t('admin.categories.toasts.parentCreatedTitle'), {
          description: t('admin.categories.toasts.parentCreatedDescription', {
            name: summary.name,
          }),
        });
      } else {
        toast.success(t(`${K}.createdTitle`), {
          description: t(`${K}.createdDescription`, {
            name: summary.name,
            parent: summary.parentPath,
          }),
        });
      }
      return false;
    });
  }

  function confirmReject(reason: string | undefined) {
    const request = rejecting;
    if (!request) return;
    void run(async () => {
      const outcome = await rejectCategoryRequest(request.id, reason);
      if (outcome.kind !== 'ok') {
        return reportFailure(outcome.kind, `${K}.rejectFailedTitle`, request.name);
      }
      toast.success(t(`${K}.rejectedTitle`), {
        description: t(`${K}.rejectedDescription`, { requester: request.requester }),
      });
      return false;
    });
  }

  return {
    approving,
    rejecting,
    submitting,
    startApprove: setApproving,
    startReject: setRejecting,
    cancel: close,
    confirmApprove,
    confirmReject,
  };
}
