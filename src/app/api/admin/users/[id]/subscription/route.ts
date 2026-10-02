import { subscriptionResponseSchema } from '@/lib/admin/user-details';
import { createAdminUserProxy } from '@/lib/server/admin-user-proxy';

export const GET = createAdminUserProxy({
  resource: 'subscription',
  label: 'subscription',
  schema: subscriptionResponseSchema,
});
