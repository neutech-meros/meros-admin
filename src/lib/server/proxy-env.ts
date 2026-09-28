import { z } from 'zod';

const DEV_API_URL = 'http://localhost:3005';
const DEV_ADMIN_API_KEY = 'dev-admin-key';

const apiUrl = z.string().url();
const adminApiKey = z.string().min(1);
const proxyEnabledFlag = (defaultValue: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true');

const productionSchema = z.object({
  MEROS_API_URL: apiUrl,
  MEROS_ADMIN_API_KEY: adminApiKey,
  // Off by default in production: this proxy has no admin-auth guard yet (same gap
  // flagged repeatedly on the Users & Creators PRs). Must be explicitly opted into
  // once that's tracked.
  ADMIN_MODERATION_PROXY_ENABLED: proxyEnabledFlag('false'),
});

const developmentSchema = z.object({
  MEROS_API_URL: apiUrl.default(DEV_API_URL),
  MEROS_ADMIN_API_KEY: adminApiKey.default(DEV_ADMIN_API_KEY),
  ADMIN_MODERATION_PROXY_ENABLED: proxyEnabledFlag('true'),
});

export type ProxyEnv = z.infer<typeof productionSchema>;

export function getProxyEnv(): ProxyEnv {
  const schema = process.env.NODE_ENV === 'production' ? productionSchema : developmentSchema;
  const result = schema.safeParse({
    MEROS_API_URL: process.env.MEROS_API_URL,
    MEROS_ADMIN_API_KEY: process.env.MEROS_ADMIN_API_KEY,
    ADMIN_MODERATION_PROXY_ENABLED: process.env.ADMIN_MODERATION_PROXY_ENABLED,
  });
  if (!result.success) {
    const invalidVars = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${invalidVars}`);
  }
  return result.data;
}
