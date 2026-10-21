import { deactivationHistoryResponseSchema } from '@/lib/admin/user-details';
import { createAdminUserProxy } from '@/lib/server/admin-user-proxy';

export const GET = createAdminUserProxy({
  resource: 'deactivation-history',
  label: 'deactivation history',
  schema: deactivationHistoryResponseSchema,
});
