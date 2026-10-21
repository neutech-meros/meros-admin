import { subscriptionEventsResponseSchema } from '@/lib/admin/user-details';
import { createAdminUserProxy } from '@/lib/server/admin-user-proxy';

export const GET = createAdminUserProxy({
  resource: 'subscription-events',
  label: 'subscription events',
  schema: subscriptionEventsResponseSchema,
});
