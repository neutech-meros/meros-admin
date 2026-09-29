import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the business accounts API';
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  reason: z.string().trim().min(1).max(200),
  note: z.string().trim().max(500).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    if (!isProxyEnabled()) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }

    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Invalid business account id' }, { status: 400 });
    }

    // Cheap CSRF hardening until real admin auth lands, same reasoning as every other
    // admin proxy POST in this app: requiring application/json blocks a cross-site form
    // POST, which can only carry simple Content-Types.
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsedBody = bodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid rejection payload' }, { status: 400 });
    }

    const { MEROS_API_URL, MEROS_ADMIN_API_KEY, MEROS_ADMIN_ACTOR } = getProxyEnv();
    const upstream = await fetch(
      `${MEROS_API_URL}/admin/business-accounts/${parsedParams.data.id}/reject`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MEROS_ADMIN_API_KEY}`,
          'X-Admin-Actor': MEROS_ADMIN_ACTOR,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedBody.data),
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
        `[admin/business-accounts/reject] upstream responded with status ${upstream.status}`,
      );
      return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/business-accounts/reject] upstream request failed: ${reason}`);
    return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
  }
}
