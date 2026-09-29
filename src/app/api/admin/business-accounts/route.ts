import { NextResponse } from 'next/server';

import { businessAccountListResponseSchema } from '@/lib/admin/business-accounts-api';
import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the business accounts API';
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';

export async function GET() {
  try {
    if (!isProxyEnabled()) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }

    const { MEROS_API_URL, MEROS_ADMIN_API_KEY } = getProxyEnv();
    const upstream = await fetch(`${MEROS_API_URL}/admin/business-accounts`, {
      headers: { Authorization: `Bearer ${MEROS_ADMIN_API_KEY}` },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      console.error(`[admin/business-accounts] upstream responded with status ${upstream.status}`);
      return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
    }
    const parsed = businessAccountListResponseSchema.safeParse(await upstream.json());
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.code})`);
      console.error(
        `[admin/business-accounts] upstream response failed validation: ${issues.join(', ')}`,
      );
      return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
    }
    return NextResponse.json(parsed.data);
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/business-accounts] upstream request failed: ${reason}`);
    return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
  }
}
