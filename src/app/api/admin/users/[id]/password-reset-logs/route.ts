import { passwordResetLogsResponseSchema } from '@/lib/admin/user-details';
import { createAdminUserProxy } from '@/lib/server/admin-user-proxy';

export const GET = createAdminUserProxy({
  resource: 'password-reset-logs',
  label: 'password reset logs',
  schema: passwordResetLogsResponseSchema,
});
