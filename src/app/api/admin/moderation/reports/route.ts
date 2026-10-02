import { NextResponse } from 'next/server';

import { queueResponseSchema } from '@/lib/admin/moderation-api';
import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the moderation API';
// Stop-gap for the missing admin-auth guard, same pattern as the accounts/user-details
// proxies: off by default in production until real admin auth lands.
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';

export async function GET() {
  try {
    if (!isProxyEnabled()) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }
    const { MEROS_API_URL, MEROS_ADMIN_API_KEY } = getProxyEnv();

    const upstream = await fetch(`${MEROS_API_URL}/admin/moderation/reports`, {
      headers: { Authorization: `Bearer ${MEROS_ADMIN_API_KEY}` },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      console.error(`[admin/moderation/reports] upstream responded with status ${upstream.status}`);
      return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
    }
    const parsed = queueResponseSchema.safeParse(await upstream.json());
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.code})`);
      console.error(
        `[admin/moderation/reports] upstream response failed validation: ${issues.join(', ')}`,
      );
      return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
    }
    return NextResponse.json(parsed.data);
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/moderation/reports] upstream request failed: ${reason}`);
    return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
  }
}
