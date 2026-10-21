/**
 * @jest-environment node
 */
import { GET } from './route';

interface AdminAccountRow {
  id: string;
  profileId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  accountType: 'INDIVIDUAL' | 'BUSINESS' | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
}

function accountRow(overrides: Partial<AdminAccountRow> = {}): AdminAccountRow {
  return {
    id: 'acc-1',
    profileId: 'prof-1',
    name: 'Camila Duarte',
    email: 'camila@mail.com',
    phone: '+55 21 98888-1234',
    accountType: 'BUSINESS',
    status: 'ACTIVE',
    createdAt: '2025-03-12T10:00:00.000Z',
    ...overrides,
  };
}

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function upstreamOk(items: object[], total: number = items.length): Response {
  return jsonOk({ items, total });
}

type UpstreamHandler = () => Promise<Response>;

interface UpstreamHandlers {
  accounts: UpstreamHandler;
  plans?: UpstreamHandler;
  counts?: UpstreamHandler;
}

function plansOk(plans: Record<string, string> = {}): UpstreamHandler {
  return () => Promise.resolve(jsonOk({ plans }));
}

function countsOk(counts: Record<string, number> = {}): UpstreamHandler {
  return () => Promise.resolve(jsonOk({ counts }));
}

function callsTo(
  calls: Parameters<typeof fetch>[],
  pathname: string,
): { url: URL; init: RequestInit | undefined }[] {
  return calls
    .map(([input, init]) => ({ url: new URL(String(input)), init }))
    .filter(({ url }) => url.pathname === pathname);
}

describe('GET /api/admin/accounts', () => {
  const originalEnv = process.env;
  let fetchMock: jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;
  let consoleErrorMock: jest.SpyInstance<void, Parameters<typeof console.error>>;

  function mockUpstream({ accounts, plans = plansOk(), counts = countsOk() }: UpstreamHandlers) {
    fetchMock.mockImplementation((input) => {
      const { pathname } = new URL(String(input));
      if (pathname === '/admin/accounts') return accounts();
      if (pathname === '/admin/subscriptions/plans') return plans();
      if (pathname === '/admin/social/follower-counts') return counts();
      return Promise.reject(new Error(`unexpected upstream call: ${pathname}`));
    });
  }

  function expectFailureLoggedWithoutSecrets() {
    expect(consoleErrorMock).toHaveBeenCalled();
    const logged = consoleErrorMock.mock.calls
      .flat()
      .map((arg) => (arg instanceof Error ? arg.message : JSON.stringify(arg)))
      .join(' ');
    expect(logged).not.toContain('dev-admin-key');
    expect(logged).not.toContain('camila@mail.com');
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

  it('returns the validated domain rows with the raw ISO createdAt and the upstream total', async () => {
    mockUpstream({
      accounts: () => Promise.resolve(upstreamOk([accountRow()], 42)),
      plans: plansOk({ 'acc-1': 'PREMIUM' }),
      counts: countsOk({ 'prof-1': 12 }),
    });

    const response = await GET();

    expect(consoleErrorMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          id: 'acc-1',
          profileId: 'prof-1',
          name: 'Camila Duarte',
          email: 'camila@mail.com',
          phone: '+55 21 98888-1234',
          accountType: 'BUSINESS',
          status: 'ACTIVE',
          createdAt: '2025-03-12T10:00:00.000Z',
          planBucket: 'PREMIUM',
          followerCount: 12,
        },
      ],
      total: 42,
    });
  });

  it('passes null profile fields through unchanged for an account without a profile', async () => {
    const noProfile = accountRow({
      id: 'acc-2',
      profileId: null,
      name: null,
      email: null,
      phone: null,
      accountType: null,
      status: 'SUSPENDED',
    });
    mockUpstream({
      accounts: () => Promise.resolve(upstreamOk([noProfile])),
      plans: plansOk({ 'acc-2': 'FREEMIUM' }),
    });

    const response = await GET();

    expect(await response.json()).toEqual({
      items: [{ ...noProfile, planBucket: 'FREEMIUM', followerCount: null }],
      total: 1,
    });
  });

  it('does not forward fields the upstream sends beyond the domain shape', async () => {
    mockUpstream({
      accounts: () =>
        Promise.resolve(
          upstreamOk([{ ...accountRow(), passwordHash: 'bcrypt$secret', internalNotes: 'x' }]),
        ),
    });

    const response = await GET();

    const text = await response.text();
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('internalNotes');
  });

  it('calls the default upstream URL with the default admin key when env vars are unset', async () => {
    fetchMock.mockResolvedValue(upstreamOk([]));

    await GET();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3005/admin/accounts?limit=100');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer dev-admin-key');
  });

  it('calls the configured upstream URL with the configured admin key from the validated env', async () => {
    process.env.MEROS_API_URL = 'https://api.example.test';
    process.env.MEROS_ADMIN_API_KEY = 'secret-key';
    fetchMock.mockResolvedValue(upstreamOk([]));

    await GET();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/admin/accounts?limit=100');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret-key');
  });

  it('returns 404 in production when the proxy flag is off, even with no other vars set', async () => {
    process.env = { ...process.env, NODE_ENV: 'production' };

    const response = await GET();

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a logged 502 (not an unhandled rejection) in production when the proxy env vars are missing', async () => {
    process.env = { ...process.env, NODE_ENV: 'production', ADMIN_ACCOUNTS_PROXY_ENABLED: 'true' };

    const response = await GET();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Failed to reach the accounts API' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleErrorMock).toHaveBeenCalled();
    expect(JSON.stringify(consoleErrorMock.mock.calls)).toContain('MEROS_API_URL');
  });

  it('returns a 502 with a safe error body when the upstream fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3005'));

    const response = await GET();

    expect(response.status).toBe(502);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: 'Failed to reach the accounts API' });
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expectFailureLoggedWithoutSecrets();
  });

  it('returns a 502 with a safe error body when an upstream row is missing a required field', async () => {
    const rowWithoutStatus: Partial<AdminAccountRow> = accountRow();
    delete rowWithoutStatus.status;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [rowWithoutStatus], total: 1 }), { status: 200 }),
    );

    const response = await GET();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Failed to reach the accounts API' });
    expectFailureLoggedWithoutSecrets();
  });

  it('returns a 502 with a safe error body when an upstream row has an invalid createdAt', async () => {
    fetchMock.mockResolvedValue(upstreamOk([accountRow({ createdAt: 'not-a-date' })]));

    const response = await GET();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Failed to reach the accounts API' });
    expectFailureLoggedWithoutSecrets();
  });

  it('returns a 502 with a safe error body when the upstream body is not the expected envelope', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([accountRow()]), { status: 200 }));

    const response = await GET();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Failed to reach the accounts API' });
    expectFailureLoggedWithoutSecrets();
  });

  it('returns 404 without calling upstream in production when the proxy flag is unset (fail-closed default)', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'prod-key',
    };

    const response = await GET();

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls upstream in production when the proxy flag is explicitly enabled', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      MEROS_API_URL: 'https://api.example.test',
      MEROS_ADMIN_API_KEY: 'prod-key',
      MEROS_ADMIN_ACTOR: 'meros-admin',
      ADMIN_ACCOUNTS_PROXY_ENABLED: 'true',
    };
    fetchMock.mockResolvedValue(upstreamOk([]));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('calls upstream by default outside production even without setting the proxy flag', async () => {
    fetchMock.mockResolvedValue(upstreamOk([]));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns a 502 with a safe error body when the upstream responds with a non-2xx status', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid admin key', stack: 'at guard.ts:12' }), {
        status: 401,
      }),
    );

    const response = await GET();

    expect(response.status).toBe(502);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: 'Failed to reach the accounts API' });
    expect(JSON.stringify(body)).not.toContain('Invalid admin key');
    expectFailureLoggedWithoutSecrets();
    expect(JSON.stringify(consoleErrorMock.mock.calls)).toContain('401');
  });

  describe('plan and follower-count enrichment', () => {
    const withProfile = accountRow({ id: 'acc-1', profileId: 'prof-1' });
    const withoutProfile = accountRow({
      id: 'acc-2',
      profileId: null,
      name: null,
      email: null,
      phone: null,
      accountType: null,
    });

    it('merges planBucket by account id and followerCount by profileId, null without a profile', async () => {
      mockUpstream({
        accounts: () => Promise.resolve(upstreamOk([withProfile, withoutProfile])),
        plans: plansOk({ 'acc-1': 'FREE_TRIAL', 'acc-2': 'PREMIUM' }),
        counts: countsOk({ 'prof-1': 0 }),
      });

      const response = await GET();

      expect(response.status).toBe(200);
      expect(consoleErrorMock).not.toHaveBeenCalled();
      expect(await response.json()).toEqual({
        items: [
          { ...withProfile, planBucket: 'FREE_TRIAL', followerCount: 0 },
          { ...withoutProfile, planBucket: 'PREMIUM', followerCount: null },
        ],
        total: 2,
      });
    });

    it('queries plans for every account id and follower counts only for non-null profile ids', async () => {
      process.env.MEROS_API_URL = 'https://api.example.test';
      process.env.MEROS_ADMIN_API_KEY = 'secret-key';
      const third = accountRow({ id: 'acc-3', profileId: 'prof-3' });
      mockUpstream({
        accounts: () => Promise.resolve(upstreamOk([withProfile, withoutProfile, third])),
      });

      await GET();

      const plansCalls = callsTo(fetchMock.mock.calls, '/admin/subscriptions/plans');
      const countsCalls = callsTo(fetchMock.mock.calls, '/admin/social/follower-counts');
      expect(plansCalls).toHaveLength(1);
      expect(countsCalls).toHaveLength(1);

      expect(plansCalls[0].url.origin).toBe('https://api.example.test');
      expect(plansCalls[0].url.searchParams.getAll('userIds')).toEqual(['acc-1', 'acc-2', 'acc-3']);
      expect(countsCalls[0].url.origin).toBe('https://api.example.test');
      expect(countsCalls[0].url.searchParams.getAll('profileIds')).toEqual(['prof-1', 'prof-3']);

      for (const { init } of [...plansCalls, ...countsCalls]) {
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret-key');
        expect(init?.cache).toBe('no-store');
      }
    });

    it('does not call either enrichment endpoint for an empty accounts page', async () => {
      mockUpstream({ accounts: () => Promise.resolve(upstreamOk([], 0)) });

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ items: [], total: 0 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(callsTo(fetchMock.mock.calls, '/admin/accounts')).toHaveLength(1);
    });

    it('skips the follower-counts call when no account on the page has a profile', async () => {
      mockUpstream({
        accounts: () => Promise.resolve(upstreamOk([withoutProfile])),
        plans: plansOk({ 'acc-2': 'FREEMIUM' }),
      });

      const response = await GET();

      expect(callsTo(fetchMock.mock.calls, '/admin/social/follower-counts')).toHaveLength(0);
      expect(await response.json()).toEqual({
        items: [{ ...withoutProfile, planBucket: 'FREEMIUM', followerCount: null }],
        total: 1,
      });
    });

    it('returns a null planBucket for an account id missing from a successful plans response', async () => {
      mockUpstream({
        accounts: () => Promise.resolve(upstreamOk([withProfile])),
        plans: plansOk({}),
        counts: countsOk({ 'prof-1': 7 }),
      });

      const response = await GET();

      expect(await response.json()).toEqual({
        items: [{ ...withProfile, planBucket: null, followerCount: 7 }],
        total: 1,
      });
    });

    const failures: [string, UpstreamHandler][] = [
      [
        'the request rejects',
        () => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:3005')),
      ],
      [
        'the upstream responds non-2xx',
        () =>
          Promise.resolve(
            new Response(
              JSON.stringify({ message: 'Invalid admin key', stack: 'at guard.ts:12' }),
              { status: 500 },
            ),
          ),
      ],
      ['the body has an unexpected shape', () => Promise.resolve(jsonOk({ unexpected: true }))],
    ];

    it.each(failures)(
      'returns 200 with a null planBucket and intact follower counts when the plans call fails because %s',
      async (_label, failingPlans) => {
        mockUpstream({
          accounts: () => Promise.resolve(upstreamOk([withProfile, withoutProfile])),
          plans: failingPlans,
          counts: countsOk({ 'prof-1': 5 }),
        });

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
          items: [
            { ...withProfile, planBucket: null, followerCount: 5 },
            { ...withoutProfile, planBucket: null, followerCount: null },
          ],
          total: 2,
        });
        expectFailureLoggedWithoutSecrets();
        expect(JSON.stringify(consoleErrorMock.mock.calls)).not.toContain('Invalid admin key');
      },
    );

    it.each(failures)(
      'returns 200 with a null followerCount and intact plans when the follower-counts call fails because %s',
      async (_label, failingCounts) => {
        mockUpstream({
          accounts: () => Promise.resolve(upstreamOk([withProfile, withoutProfile])),
          plans: plansOk({ 'acc-1': 'PREMIUM', 'acc-2': 'FREEMIUM' }),
          counts: failingCounts,
        });

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
          items: [
            { ...withProfile, planBucket: 'PREMIUM', followerCount: null },
            { ...withoutProfile, planBucket: 'FREEMIUM', followerCount: null },
          ],
          total: 2,
        });
        expectFailureLoggedWithoutSecrets();
        expect(JSON.stringify(consoleErrorMock.mock.calls)).not.toContain('Invalid admin key');
      },
    );
  });
});
