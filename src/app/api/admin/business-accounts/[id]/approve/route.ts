import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the business accounts API';
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';

const paramsSchema = z.object({ id: z.string().uuid() });

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    if (!isProxyEnabled()) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }

    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Invalid business account id' }, { status: 400 });
    }

    const { MEROS_API_URL, MEROS_ADMIN_API_KEY, MEROS_ADMIN_ACTOR } = getProxyEnv();
    const upstream = await fetch(
      `${MEROS_API_URL}/admin/business-accounts/${parsedParams.data.id}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MEROS_ADMIN_API_KEY}`,
          'X-Admin-Actor': MEROS_ADMIN_ACTOR,
        },
        cache: 'no-store',
      },
    );
    if (upstream.status === 404) {
      return NextResponse.json({ error: 'Business account not found' }, { status: 404 });
    }
    if (upstream.status === 409) {
      return NextResponse.json(
        { error: 'This business account is no longer awaiting review' },
        { status: 409 },
      );
    }
    if (!upstream.ok) {
      console.error(
        `[admin/business-accounts/approve] upstream responded with status ${upstream.status}`,
      );
      return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/business-accounts/approve] upstream request failed: ${reason}`);
    return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
  }
}
