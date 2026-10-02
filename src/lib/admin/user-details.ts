import { z } from 'zod';

const isoDateTime = z.string().datetime({ offset: true });

// The drawer never renders the client IP, so it's deliberately left out of
// this schema: zod strips undeclared keys, meaning the IP never leaves the
// server even though the upstream response includes it.
export const passwordResetLogsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      outcome: z.enum(['SUCCESS', 'FAILURE']),
      createdAt: isoDateTime,
    }),
  ),
});

export const subscriptionEventsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['INITIAL_PURCHASE', 'PRODUCT_CHANGE']),
      previousProductId: z.string().nullable(),
      newProductId: z.string().nullable(),
      createdAt: isoDateTime,
    }),
  ),
});

export const subscriptionStatusSchema = z.enum(['ACTIVE', 'CANCELLED', 'GRACE_PERIOD', 'EXPIRED']);

export const subscriptionResponseSchema = z.object({
  subscription: z
    .object({
      status: subscriptionStatusSchema,
      period: z.enum(['MONTHLY', 'ANNUAL']),
      periodType: z.enum(['NORMAL', 'TRIAL', 'INTRO']),
      productId: z.string(),
      subscriberSince: isoDateTime,
      currentPeriodEnd: isoDateTime,
      willRenew: z.boolean(),
      fallbackPrice: z.string(),
    })
    .nullable(),
});

export const planCancellationsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      cancelledAt: isoDateTime,
      reason: z.string().nullable(),
    }),
  ),
});

export const deactivationHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      deactivatedAt: isoDateTime,
      // #249's spec leaves room for a reason to be added later; z.null() would reject the
      // whole response the day that ships, while this accepts both today's always-null
      // value and a future real one.
      reason: z.string().nullable(),
    }),
  ),
});

export type PasswordResetLogsResponse = z.infer<typeof passwordResetLogsResponseSchema>;
export type SubscriptionEventsResponse = z.infer<typeof subscriptionEventsResponseSchema>;
export type SubscriptionEvent = SubscriptionEventsResponse['items'][number];
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type UserSubscription = NonNullable<SubscriptionResponse['subscription']>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type PlanCancellationsResponse = z.infer<typeof planCancellationsResponseSchema>;
export type DeactivationHistoryResponse = z.infer<typeof deactivationHistoryResponseSchema>;

export type LoadResult<T> = { ok: true; data: T } | { ok: false };

export interface UserDetails {
  userId: string;
  passwordResetLogs: LoadResult<PasswordResetLogsResponse>;
  subscriptionEvents: LoadResult<SubscriptionEventsResponse>;
  subscription: LoadResult<SubscriptionResponse>;
  planCancellations: LoadResult<PlanCancellationsResponse>;
  deactivationHistory: LoadResult<DeactivationHistoryResponse>;
}

// Load failures are surfaced to the caller via `{ ok: false }`, not logged here: this
// runs in every admin's browser console, and the proxy already logs the same failure
// server-side (with more detail than is safe to expose to the client anyway).
async function loadDetail<T extends z.ZodTypeAny>(
  userId: string,
  resource: string,
  schema: T,
): Promise<LoadResult<z.infer<T>>> {
  try {
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/${resource}`);
    if (!response.ok) {
      return { ok: false };
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      return { ok: false };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false };
  }
}

export async function loadUserDetails(userId: string): Promise<UserDetails> {
  const [
    passwordResetLogs,
    subscriptionEvents,
    subscription,
    planCancellations,
    deactivationHistory,
  ] = await Promise.all([
    loadDetail(userId, 'password-reset-logs', passwordResetLogsResponseSchema),
    loadDetail(userId, 'subscription-events', subscriptionEventsResponseSchema),
    loadDetail(userId, 'subscription', subscriptionResponseSchema),
    loadDetail(userId, 'plan-cancellations', planCancellationsResponseSchema),
    loadDetail(userId, 'deactivation-history', deactivationHistoryResponseSchema),
  ]);
  return {
    userId,
    passwordResetLogs,
    subscriptionEvents,
    subscription,
    planCancellations,
    deactivationHistory,
  };
}

export type ProductPlan = 'freeTrial' | 'premium' | 'freemium';

// Best-effort presentation heuristic, not authoritative data: there is no
// SKU-to-plan table anywhere in the system and dev/test SKUs may not match
// production ones, so plans are guessed from substrings of the raw SKU.
// `null` means no match — callers should show the raw SKU instead.
//
// Known gap: this can't detect a trial purchase. MER-786 marks trials via
// `periodType: 'TRIAL'` on the *subscription*, not via a distinct SKU — the
// meros-app subscription-events endpoint doesn't expose periodType per event,
// so a trial purchase's SKU (e.g. meros_premium_monthly) matches 'premium'
// here and History shows it as "Subscribed to the Premium plan" instead of
// mentioning the trial. Fixing this needs a meros-app API change (periodType
// per event), not just a heuristic tweak here.
export function productPlan(productId: string): ProductPlan | null {
  const sku = productId.toLowerCase();
  if (sku.includes('trial')) return 'freeTrial';
  if (sku.includes('freemium')) return 'freemium';
  if (sku.includes('premium')) return 'premium';
  return null;
}
