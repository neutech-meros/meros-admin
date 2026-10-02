import { NextResponse } from 'next/server';

import { accountsResponseSchema, type AccountsResponse } from '@/lib/admin/accounts';
import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the accounts API';
// Stop-gap for the missing admin-auth guard: this route returns real user PII
// (name, email, phone) unauthenticated, gated only by the server-only admin
// key used to call the upstream API. Off by default in production until the
// real admin-auth work lands; track that work before removing this flag.
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';

function upstreamFailure() {
  return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
}

export async function GET() {
  try {
    if (!isProxyEnabled('ADMIN_ACCOUNTS_PROXY_ENABLED')) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }
    const { MEROS_API_URL, MEROS_ADMIN_API_KEY } = getProxyEnv();

    const upstream = await fetch(`${MEROS_API_URL}/admin/accounts?limit=100`, {
      headers: { Authorization: `Bearer ${MEROS_ADMIN_API_KEY}` },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      console.error(`[admin/accounts] upstream responded with status ${upstream.status}`);
      return upstreamFailure();
    }
    const parsed = accountsResponseSchema.safeParse(await upstream.json());
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.code})`);
      console.error(`[admin/accounts] upstream response failed validation: ${issues.join(', ')}`);
      return upstreamFailure();
    }
    const body: AccountsResponse = parsed.data;
    return NextResponse.json(body);
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/accounts] upstream request failed: ${reason}`);
    return upstreamFailure();
  }
}
