/**
 * @jest-environment node
 */
import { GET } from './route';

interface Subscription {
  status: 'ACTIVE' | 'CANCELLED' | 'GRACE_PERIOD' | 'EXPIRED';
  period: 'MONTHLY' | 'ANNUAL';
  periodType: 'NORMAL' | 'TRIAL' | 'INTRO';
  productId: string;
  subscriberSince: string;
  currentPeriodEnd: string;
  willRenew: boolean;
  fallbackPrice: string;
}

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    status: 'ACTIVE',
    period: 'MONTHLY',
    periodType: 'NORMAL',
    productId: 'com.meros.premium.monthly',
    subscriberSince: '2025-03-12T10:00:00.000Z',
    currentPeriodEnd: '2025-10-12T10:00:00.000Z',
    willRenew: true,
    fallbackPrice: '$7.00',
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function call(id: string) {
  return GET(new Request(`http://localhost/api/admin/users/${id}/subscription`), {
    params: Promise.resolve({ id }),
  });
}

const SAFE_ERROR = { error: 'Failed to reach the subscription API' };

describe('GET /api/admin/users/[id]/subscription', () => {
  const originalEnv = process.env;
  let fetchMock: jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;
  let consoleErrorMock: jest.SpyInstance<void, Parameters<typeof console.error>>;

  function expectFailureLoggedWithoutSecrets() {
    expect(consoleErrorMock).toHaveBeenCalled();
    const logged = JSON.stringify(consoleErrorMock.mock.calls);
    expect(logged).not.toContain('dev-admin-key');
    expect(logged).not.toContain('secret-key');
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MEROS_API_URL;
    delete process.env.MEROS_ADMIN_API_KEY;
    fetchMock = jest.spyOn(global, 'fetch');
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockRestore();
    consoleErrorMock.mockRestore();
    process.env = originalEnv;
  });

  it('returns the validated subscription', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { subscription: subscription() }));

    const response = await call('acc-1');

    expect(consoleErrorMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ subscription: subscription() });
  });

  it('passes a null subscription through as a normal 200 response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { subscription: null }));

    const response = await call('acc-1');

    expect(consoleErrorMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ subscription: null });
  });

  it('does not forward fields the upstream sends beyond the documented shape', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        subscription: { ...subscription(), revenueCatCustomerId: 'rc_secret' },
        debug: true,
      }),
    );

    const response = await call('acc-1');

    const text = await response.text();
    expect(text).not.toContain('revenueCatCustomerId');
    expect(text).not.toContain('debug');
  });

  it('calls the default upstream URL with the default admin key and no caching', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { subscription: null }));

    await call('acc-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3005/admin/users/acc-1/subscription');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer dev-admin-key');
    expect(init?.cache).toBe('no-store');
  });

  it('calls the configured upstream URL with the configured admin key', async () => {
    process.env.MEROS_API_URL = 'https://api.example.test';
    process.env.MEROS_ADMIN_API_KEY = 'secret-key';
    fetchMock.mockResolvedValue(jsonResponse(200, { subscription: null }));

    await call('acc-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/admin/users/acc-1/subscription');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret-key');
  });

  it('encodes the user id as a single path segment', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { subscription: null }));

    await call('a/b');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3005/admin/users/a%2Fb/subscription');
  });

  it('returns 404 in production when the proxy flag is off, even with no other vars set', async () => {
    process.env = { ...process.env, NODE_ENV: 'production' };

    const response = await call('acc-1');

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a logged 502 (not an unhandled rejection) in production when the proxy env vars are missing', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ADMIN_USER_DETAILS_PROXY_ENABLED: 'true',
    };

    const response = await call('acc-1');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(SAFE_ERROR);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(consoleErrorMock.mock.calls)).toContain('MEROS_API_URL');
  });

  it('returns 404 without calling upstream in production when the proxy flag is unset (fail-closed default)', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'secret-key',
    };

    const response = await call('acc-1');

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls upstream in production when the proxy flag is explicitly enabled', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'secret-key',
      MEROS_ADMIN_ACTOR: 'meros-admin',
      ADMIN_USER_DETAILS_PROXY_ENABLED: 'true',
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { subscription: null }));

    const response = await call('acc-1');

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns a 502 with a safe error body when the upstream fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3005'));

    const response = await call('acc-1');

    expect(response.status).toBe(502);
    const body: unknown = await response.json();
    expect(body).toEqual(SAFE_ERROR);
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expectFailureLoggedWithoutSecrets();
  });

  it('returns a 502 with a safe error body when the upstream responds 404 USER_NOT_FOUND', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { code: 'USER_NOT_FOUND' }));

    const response = await call('acc-9');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(SAFE_ERROR);
    expectFailureLoggedWithoutSecrets();
    expect(JSON.stringify(consoleErrorMock.mock.calls)).toContain('404');
  });

  it('returns a 502 with a safe error body when the subscription has an unknown status', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { subscription: subscription({ status: 'PAUSED' as never }) }),
    );

    const response = await call('acc-1');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(SAFE_ERROR);
    expectFailureLoggedWithoutSecrets();
  });

  it('returns a 502 with a safe error body when subscriberSince is not a date', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { subscription: subscription({ subscriberSince: 'last year' }) }),
    );

    const response = await call('acc-1');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(SAFE_ERROR);
    expectFailureLoggedWithoutSecrets();
  });

  it('returns a 502 with a safe error body when the subscription key is missing', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    const response = await call('acc-1');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(SAFE_ERROR);
    expectFailureLoggedWithoutSecrets();
  });
});
