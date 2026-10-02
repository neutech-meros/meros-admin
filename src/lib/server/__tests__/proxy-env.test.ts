/**
 * @jest-environment node
 */
import { isProxyEnabled } from '../proxy-env';

const FLAGS = ['ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED', 'ADMIN_MODERATION_PROXY_ENABLED'] as const;
const originalEnv = { ...process.env };

function setNodeEnv(value: string) {
  Object.assign(process.env, { NODE_ENV: value });
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('isProxyEnabled', () => {
  it('reads each screen flag independently', () => {
    process.env.ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED = 'true';
    process.env.ADMIN_MODERATION_PROXY_ENABLED = 'false';
    expect(isProxyEnabled('ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED')).toBe(true);
    expect(isProxyEnabled('ADMIN_MODERATION_PROXY_ENABLED')).toBe(false);
  });

  it.each(FLAGS)('defaults %s to off in production', (flag) => {
    setNodeEnv('production');
    delete process.env[flag];
    expect(isProxyEnabled(flag)).toBe(false);
  });

  it.each(FLAGS)('defaults %s to on outside production', (flag) => {
    setNodeEnv('test');
    delete process.env[flag];
    expect(isProxyEnabled(flag)).toBe(true);
  });

  it('does not need the other proxy variables to answer', () => {
    setNodeEnv('production');
    delete process.env.MEROS_API_URL;
    delete process.env.MEROS_ADMIN_API_KEY;
    delete process.env.MEROS_ADMIN_ACTOR;
    process.env.ADMIN_MODERATION_PROXY_ENABLED = 'false';
    expect(isProxyEnabled('ADMIN_MODERATION_PROXY_ENABLED')).toBe(false);
  });
});
