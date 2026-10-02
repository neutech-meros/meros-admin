import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the moderation API';
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';

const paramsSchema = z.object({
  targetType: z.enum(['LIST', 'PLACE_IN_LIST', 'PROFILE']),
  targetId: z.string().uuid(),
});

const bodySchema = z.object({
  decision: z.enum(['KEPT', 'REMOVED']),
  reviewedBy: z.string().trim().min(1).max(120).optional(),
});

interface RouteContext {
  params: Promise<{ targetType: string; targetId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    if (!isProxyEnabled('ADMIN_MODERATION_PROXY_ENABLED')) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }
    const { MEROS_API_URL, MEROS_ADMIN_API_KEY } = getProxyEnv();

    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    // Cheap CSRF hardening until real admin auth lands: a cross-site form POST (which can
    // fire without a CORS preflight) can only set simple Content-Types like text/plain, so
    // requiring application/json here blocks that vector even under the fail-open dev flag.
    // Compare the MIME essence, not a substring — `text/plain; x=application/json` is still
    // CORS-safelisted as text/plain and must not slip through a naive `.includes(...)` check.
    const contentType = request.headers.get('content-type') ?? '';
    const contentTypeEssence = contentType.split(';')[0]!.trim().toLowerCase();
    if (contentTypeEssence !== 'application/json') {
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
      return NextResponse.json({ error: 'Invalid decision payload' }, { status: 400 });
    }
    const { targetType, targetId } = parsedParams.data;

    const upstream = await fetch(
      `${MEROS_API_URL}/admin/moderation/reports/${targetType}/${targetId}/decision`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MEROS_ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedBody.data),
        cache: 'no-store',
      },
    );
    if (upstream.status === 404) {
      return NextResponse.json(
        { error: 'No pending reports found for this target' },
        { status: 404 },
      );
    }
    if (!upstream.ok) {
      console.error(
        `[admin/moderation/decision] upstream responded with status ${upstream.status}`,
      );
      return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/moderation/decision] upstream request failed: ${reason}`);
    return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
  }
}
