/**
 * @jest-environment node
 */
import { getProxyEnv, isProxyEnabled } from './proxy-env';

describe('getProxyEnv and isProxyEnabled', () => {
  const originalEnv = process.env;

  function setEnv(env: Record<string, string>) {
    process.env = { ...env } as NodeJS.ProcessEnv;
  }

  afterEach(() => {
    process.env = originalEnv;
  });

  it('falls back to the dev defaults in development when the vars are unset', () => {
    setEnv({ NODE_ENV: 'development' });

    expect(getProxyEnv()).toEqual({
      MEROS_API_URL: 'http://localhost:3005',
      MEROS_ADMIN_API_KEY: 'dev-admin-key',
      MEROS_ADMIN_ACTOR: 'meros-admin',
    });
  });

  it('falls back to the dev defaults under test when the vars are unset', () => {
    setEnv({ NODE_ENV: 'test' });

    expect(getProxyEnv()).toEqual({
      MEROS_API_URL: 'http://localhost:3005',
      MEROS_ADMIN_API_KEY: 'dev-admin-key',
      MEROS_ADMIN_ACTOR: 'meros-admin',
    });
  });

  it('uses the configured vars in development when they are set', () => {
    setEnv({
      NODE_ENV: 'development',
      MEROS_API_URL: 'https://api.dev.test',
      MEROS_ADMIN_API_KEY: 'dev-configured-key',
    });

    expect(getProxyEnv()).toEqual({
      MEROS_API_URL: 'https://api.dev.test',
      MEROS_ADMIN_API_KEY: 'dev-configured-key',
      MEROS_ADMIN_ACTOR: 'meros-admin',
    });
  });

  it('uses the configured vars in production when they are set', () => {
    setEnv({
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'prod-key',
      MEROS_ADMIN_ACTOR: 'meros-admin',
    });

    expect(getProxyEnv()).toEqual({
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'prod-key',
      MEROS_ADMIN_ACTOR: 'meros-admin',
    });
  });

  it('defaults the accounts proxy to disabled in production, even if the other vars are set', () => {
    setEnv({
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'prod-key',
    });

    expect(isProxyEnabled('ADMIN_ACCOUNTS_PROXY_ENABLED')).toBe(false);
  });

  it('enables the accounts proxy in production only when explicitly set to true', () => {
    setEnv({
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'prod-key',
      ADMIN_ACCOUNTS_PROXY_ENABLED: 'true',
    });

    expect(isProxyEnabled('ADMIN_ACCOUNTS_PROXY_ENABLED')).toBe(true);
  });

  it('rejects a garbage value for the accounts proxy flag instead of silently enabling it', () => {
    setEnv({
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'prod-key',
      ADMIN_ACCOUNTS_PROXY_ENABLED: 'yes',
    });

    expect(() => isProxyEnabled('ADMIN_ACCOUNTS_PROXY_ENABLED')).toThrow(
      /ADMIN_ACCOUNTS_PROXY_ENABLED/,
    );
  });

  it('throws in production when the admin API key is missing, without leaking values', () => {
    setEnv({
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_ACTOR: 'meros-admin',
    });

    expect(() => getProxyEnv()).toThrow(/MEROS_ADMIN_API_KEY/);
    expect(() => getProxyEnv()).not.toThrow(/api\.example\.test/);
  });

  it('throws in production when the API URL is missing', () => {
    setEnv({
      NODE_ENV: 'production',
      MEROS_ADMIN_API_KEY: 'prod-key',
      MEROS_ADMIN_ACTOR: 'meros-admin',
    });

    expect(() => getProxyEnv()).toThrow(/MEROS_API_URL/);
  });

  it('throws in production when the admin API key is an empty string', () => {
    setEnv({
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: '',
      MEROS_ADMIN_ACTOR: 'meros-admin',
    });

    expect(() => getProxyEnv()).toThrow(/MEROS_ADMIN_API_KEY/);
  });

  it('throws in production when the admin actor is missing', () => {
    setEnv({
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'prod-key',
    });

    expect(() => getProxyEnv()).toThrow(/MEROS_ADMIN_ACTOR/);
  });
});
