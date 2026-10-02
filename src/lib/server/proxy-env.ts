import 'server-only';

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
});

const developmentSchema = z.object({
  MEROS_API_URL: apiUrl.default(DEV_API_URL),
  MEROS_ADMIN_API_KEY: adminApiKey.default(DEV_ADMIN_API_KEY),
});

export type ProxyEnv = z.infer<typeof productionSchema>;

// Off by default in production: this proxy has no admin-auth guard yet (same gap
// flagged repeatedly on the Users & Creators PRs). Must be explicitly opted into
// once that's tracked.
const productionFlag = proxyEnabledFlag('false');
const developmentFlag = proxyEnabledFlag('true');

// Reads only the feature flag, independent of the other (required-in-production) vars, so a
// disabled route 404s even when the rest of the proxy config isn't set up yet, instead of
// throwing out of getProxyEnv() and surfacing as a 502.
export function isProxyEnabled(): boolean {
  const schema = process.env.NODE_ENV === 'production' ? productionFlag : developmentFlag;
  return schema.parse(process.env.ADMIN_MODERATION_PROXY_ENABLED);
}

export function getProxyEnv(): ProxyEnv {
  const schema = process.env.NODE_ENV === 'production' ? productionSchema : developmentSchema;
  const result = schema.safeParse({
    MEROS_API_URL: process.env.MEROS_API_URL,
    MEROS_ADMIN_API_KEY: process.env.MEROS_ADMIN_API_KEY,
  });
  if (!result.success) {
    const invalidVars = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${invalidVars}`);
  }
  return result.data;
}
