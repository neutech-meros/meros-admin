/**
 * @jest-environment node
 */
import { GET } from './route';

interface PasswordResetLog {
  id: string;
  ip: string | null;
  outcome: 'SUCCESS' | 'FAILURE';
  createdAt: string;
}

function logItem(overrides: Partial<PasswordResetLog> = {}): PasswordResetLog {
  return {
    id: 'log-1',
    ip: '203.0.113.7',
    outcome: 'SUCCESS',
    createdAt: '2025-04-01T12:00:00.000Z',
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
  return GET(new Request(`http://localhost/api/admin/users/${id}/password-reset-logs`), {
    params: Promise.resolve({ id }),
  });
}

const SAFE_ERROR = { error: 'Failed to reach the password reset logs API' };

describe('GET /api/admin/users/[id]/password-reset-logs', () => {
  const originalEnv = process.env;
  let fetchMock: jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;
  let consoleErrorMock: jest.SpyInstance<void, Parameters<typeof console.error>>;

  function expectFailureLoggedWithoutSecrets() {
    expect(consoleErrorMock).toHaveBeenCalled();
    const logged = JSON.stringify(consoleErrorMock.mock.calls);
    expect(logged).not.toContain('dev-admin-key');
    expect(logged).not.toContain('secret-key');
    expect(logged).not.toContain('203.0.113.7');
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

  it('returns the validated logs, without the client IP', async () => {
    const failure = logItem({ id: 'log-2', ip: null, outcome: 'FAILURE' });
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [logItem(), failure] }));

    const response = await call('acc-1');

    expect(consoleErrorMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        { id: 'log-1', outcome: 'SUCCESS', createdAt: '2025-04-01T12:00:00.000Z' },
        { id: 'log-2', outcome: 'FAILURE', createdAt: '2025-04-01T12:00:00.000Z' },
      ],
    });
  });

  it('does not forward fields the upstream sends beyond the documented shape', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { items: [{ ...logItem(), tokenHash: 'sha256$secret' }], extra: 1 }),
    );

    const response = await call('acc-1');

    const text = await response.text();
    expect(text).not.toContain('tokenHash');
    expect(text).not.toContain('extra');
    expect(text).not.toContain('203.0.113.7');
  });

  it('calls the default upstream URL with the default admin key and no caching', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }));

    await call('acc-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3005/admin/users/acc-1/password-reset-logs');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer dev-admin-key');
    expect(init?.cache).toBe('no-store');
  });

  it('calls the configured upstream URL with the configured admin key', async () => {
    process.env.MEROS_API_URL = 'https://api.example.test';
    process.env.MEROS_ADMIN_API_KEY = 'secret-key';
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }));

    await call('acc-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/admin/users/acc-1/password-reset-logs');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret-key');
  });

  it('encodes the user id as a single path segment', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }));

    await call('../accounts?x=1');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3005/admin/users/..%2Faccounts%3Fx%3D1/password-reset-logs');
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
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }));

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
    fetchMock.mockResolvedValue(
      jsonResponse(404, { code: 'USER_NOT_FOUND', message: 'User acc-9 not found' }),
    );

    const response = await call('acc-9');

    expect(response.status).toBe(502);
    const body: unknown = await response.json();
    expect(body).toEqual(SAFE_ERROR);
    expect(JSON.stringify(body)).not.toContain('USER_NOT_FOUND');
    expectFailureLoggedWithoutSecrets();
    expect(JSON.stringify(consoleErrorMock.mock.calls)).toContain('404');
  });

  it('returns a 502 with a safe error body when an item has an unknown outcome', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [{ ...logItem(), outcome: 'MAYBE' }] }));

    const response = await call('acc-1');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(SAFE_ERROR);
    expectFailureLoggedWithoutSecrets();
  });

  it('returns a 502 with a safe error body when an item has an invalid createdAt', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { items: [logItem({ createdAt: 'yesterday' })] }),
    );

    const response = await call('acc-1');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(SAFE_ERROR);
    expectFailureLoggedWithoutSecrets();
  });

  it('returns a 502 with a safe error body when the body is not the expected envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [logItem()]));

    const response = await call('acc-1');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(SAFE_ERROR);
    expectFailureLoggedWithoutSecrets();
  });
});
