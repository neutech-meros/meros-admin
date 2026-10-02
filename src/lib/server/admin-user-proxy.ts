import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

export interface UserRouteContext {
  params: Promise<{ id: string }>;
}

interface AdminUserProxyOptions<T extends z.ZodTypeAny> {
  resource: string;
  label: string;
  schema: T;
}

export function createAdminUserProxy<T extends z.ZodTypeAny>({
  resource,
  label,
  schema,
}: AdminUserProxyOptions<T>) {
  const logPrefix = `[admin/users/${resource}]`;

  function upstreamFailure() {
    return NextResponse.json({ error: `Failed to reach the ${label} API` }, { status: 502 });
  }

  return async function GET(_request: Request, { params }: UserRouteContext) {
    const { id } = await params;

    try {
      if (!isProxyEnabled('ADMIN_USER_DETAILS_PROXY_ENABLED')) {
        return NextResponse.json({ error: 'This endpoint is disabled' }, { status: 404 });
      }
      const { MEROS_API_URL, MEROS_ADMIN_API_KEY } = getProxyEnv();

      const upstream = await fetch(
        `${MEROS_API_URL}/admin/users/${encodeURIComponent(id)}/${resource}`,
        {
          headers: { Authorization: `Bearer ${MEROS_ADMIN_API_KEY}` },
          cache: 'no-store',
        },
      );
      if (!upstream.ok) {
        console.error(`${logPrefix} upstream responded with status ${upstream.status}`);
        return upstreamFailure();
      }
      const parsed = schema.safeParse(await upstream.json());
      if (!parsed.success) {
        const issues = parsed.error.issues.map(
          (issue) => `${issue.path.join('.')} (${issue.code})`,
        );
        console.error(`${logPrefix} upstream response failed validation: ${issues.join(', ')}`);
        return upstreamFailure();
      }
      return NextResponse.json(parsed.data as z.infer<T>);
    } catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
      console.error(`${logPrefix} upstream request failed: ${reason}`);
      return upstreamFailure();
    }
  };
}
