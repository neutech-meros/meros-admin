import { z } from 'zod';

const DEV_API_URL = 'http://localhost:3005';
const DEV_ADMIN_API_KEY = 'dev-admin-key';
const DEV_ADMIN_ACTOR = 'meros-admin';

const apiUrl = z.string().url();
const adminApiKey = z.string().min(1);
// There is no real per-admin-operator identity in meros-admin today (one shared static admin
// key, no login) — this identifies the tool making the request, the same honest scope every
// other admin credential here already has, not a fabricated person's name.
const adminActor = z.string().min(1);
const proxyEnabledFlag = (defaultValue: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true');

const productionSchema = z.object({
  MEROS_API_URL: apiUrl,
  MEROS_ADMIN_API_KEY: adminApiKey,
  MEROS_ADMIN_ACTOR: adminActor,
  // Off by default in production: this proxy has no admin-auth guard yet (same gap flagged
  // repeatedly across every admin proxy this app has). Must be explicitly opted into once
  // that's tracked.
  ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED: proxyEnabledFlag('false'),
});

const developmentSchema = z.object({
  MEROS_API_URL: apiUrl.default(DEV_API_URL),
  MEROS_ADMIN_API_KEY: adminApiKey.default(DEV_ADMIN_API_KEY),
  MEROS_ADMIN_ACTOR: adminActor.default(DEV_ADMIN_ACTOR),
  ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED: proxyEnabledFlag('true'),
});

export type ProxyEnv = z.infer<typeof productionSchema>;

export function getProxyEnv(): ProxyEnv {
  const schema = process.env.NODE_ENV === 'production' ? productionSchema : developmentSchema;
  const result = schema.safeParse({
    MEROS_API_URL: process.env.MEROS_API_URL,
    MEROS_ADMIN_API_KEY: process.env.MEROS_ADMIN_API_KEY,
    MEROS_ADMIN_ACTOR: process.env.MEROS_ADMIN_ACTOR,
    ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED: process.env.ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED,
  });
  if (!result.success) {
    const invalidVars = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${invalidVars}`);
  }
  return result.data;
}
