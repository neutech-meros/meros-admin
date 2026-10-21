import { planCancellationsResponseSchema } from '@/lib/admin/user-details';
import { createAdminUserProxy } from '@/lib/server/admin-user-proxy';

export const GET = createAdminUserProxy({
  resource: 'plan-cancellations',
  label: 'plan cancellations',
  schema: planCancellationsResponseSchema,
});
