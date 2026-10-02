import { NextResponse } from 'next/server';
import { z } from 'zod';

import { reviewedResponseSchema } from '@/lib/admin/moderation-api';
import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the moderation API';
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';

// Mirrors the upstream's own bound (moderationReviewedQuerySchema) so an invalid limit is
// rejected here with a 400 instead of round-tripping to the API and coming back as a 502.
const limitSchema = z.coerce.number().int().min(1).max(500).optional();

export async function GET(request: Request) {
  try {
    if (!isProxyEnabled()) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }
    const { MEROS_API_URL, MEROS_ADMIN_API_KEY } = getProxyEnv();

    const rawLimit = new URL(request.url).searchParams.get('limit');
    const parsedLimit = limitSchema.safeParse(rawLimit ?? undefined);
    if (!parsedLimit.success) {
      return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
    }
    const query = parsedLimit.data !== undefined ? `?limit=${parsedLimit.data}` : '';
    const upstream = await fetch(`${MEROS_API_URL}/admin/moderation/reviewed${query}`, {
      headers: { Authorization: `Bearer ${MEROS_ADMIN_API_KEY}` },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      console.error(
        `[admin/moderation/reviewed] upstream responded with status ${upstream.status}`,
      );
      return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
    }
    const parsed = reviewedResponseSchema.safeParse(await upstream.json());
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.code})`);
      console.error(
        `[admin/moderation/reviewed] upstream response failed validation: ${issues.join(', ')}`,
      );
      return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
    }
    return NextResponse.json(parsed.data);
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/moderation/reviewed] upstream request failed: ${reason}`);
    return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
  }
}
