import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  type AccountsResponse,
  type DomainAccountRow,
  type PlanBucket,
  planBucketSchema,
} from '@/lib/admin/accounts';
import { getProxyEnv, isProxyEnabled, type ProxyEnv } from '@/lib/server/proxy-env';

// Validates the raw upstream /admin/accounts response, which is narrower than
// DomainAccountRow: planBucket/followerCount come from separate enrichment
// calls below, not from this endpoint, so this can't just reuse
// domainAccountRowSchema from lib/admin/accounts.ts without drift.
const adminAccountRowSchema = z.object({
  id: z.string(),
  profileId: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  accountType: z.enum(['INDIVIDUAL', 'BUSINESS']).nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']),
  createdAt: z.string().datetime({ offset: true }),
});

const adminAccountsResponseSchema = z.object({
  items: z.array(adminAccountRowSchema),
  total: z.number().int().nonnegative(),
});

const plansResponseSchema = z.object({
  plans: z.record(z.string(), planBucketSchema),
});

const followerCountsResponseSchema = z.object({
  counts: z.record(z.string(), z.number().int().nonnegative()),
});

type AdminAccountRow = z.infer<typeof adminAccountRowSchema>;

interface Enrichment {
  plans: Record<string, PlanBucket>;
  counts: Record<string, number>;
}

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the accounts API';
// Stop-gap for the missing admin-auth guard: this route returns real user PII
// (name, email, phone) unauthenticated, gated only by the server-only admin
// key used to call the upstream API. Off by default in production until the
// real admin-auth work lands; track that work before removing this flag.
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';
const ENRICHMENT_TIMEOUT_MS = 3000;

function toDomainRow(account: AdminAccountRow, { plans, counts }: Enrichment): DomainAccountRow {
  return {
    id: account.id,
    profileId: account.profileId,
    name: account.name,
    email: account.email,
    phone: account.phone,
    accountType: account.accountType,
    status: account.status,
    createdAt: account.createdAt,
    planBucket: plans[account.id] ?? null,
    followerCount: account.profileId === null ? null : (counts[account.profileId] ?? null),
  };
}

function upstreamFailure() {
  return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
}

function upstreamRequestInit(env: ProxyEnv): RequestInit {
  return {
    headers: { Authorization: `Bearer ${env.MEROS_ADMIN_API_KEY}` },
    cache: 'no-store',
  };
}

async function fetchEnrichmentMap<T extends z.ZodTypeAny>(
  env: ProxyEnv,
  label: string,
  path: string,
  paramName: string,
  ids: string[],
  schema: T,
): Promise<z.infer<T> | null> {
  if (ids.length === 0) return null;
  const query = new URLSearchParams(ids.map((id) => [paramName, id]));
  try {
    const upstream = await fetch(`${env.MEROS_API_URL}${path}?${query}`, {
      ...upstreamRequestInit(env),
      signal: AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS),
    });
    if (!upstream.ok) {
      console.error(`[admin/accounts] ${label} upstream responded with status ${upstream.status}`);
      return null;
    }
    const parsed = schema.safeParse(await upstream.json());
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.code})`);
      console.error(`[admin/accounts] ${label} response failed validation: ${issues.join(', ')}`);
      return null;
    }
    return parsed.data;
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/accounts] ${label} request failed: ${reason}`);
    return null;
  }
}

async function fetchEnrichment(env: ProxyEnv, accounts: AdminAccountRow[]): Promise<Enrichment> {
  const userIds = accounts.map((account) => account.id);
  const profileIds = accounts.flatMap((account) =>
    account.profileId === null ? [] : [account.profileId],
  );
  const [plans, counts] = await Promise.all([
    fetchEnrichmentMap(
      env,
      'plans',
      '/admin/subscriptions/plans',
      'userIds',
      userIds,
      plansResponseSchema,
    ),
    fetchEnrichmentMap(
      env,
      'follower-counts',
      '/admin/social/follower-counts',
      'profileIds',
      profileIds,
      followerCountsResponseSchema,
    ),
  ]);
  return { plans: plans?.plans ?? {}, counts: counts?.counts ?? {} };
}

export async function GET() {
  try {
    if (!isProxyEnabled('ADMIN_ACCOUNTS_PROXY_ENABLED')) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }
    const env = getProxyEnv();
    const { MEROS_API_URL } = env;

    const upstream = await fetch(
      `${MEROS_API_URL}/admin/accounts?limit=100`,
      upstreamRequestInit(env),
    );
    if (!upstream.ok) {
      console.error(`[admin/accounts] upstream responded with status ${upstream.status}`);
      return upstreamFailure();
    }
    const parsed = adminAccountsResponseSchema.safeParse(await upstream.json());
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.code})`);
      console.error(`[admin/accounts] upstream response failed validation: ${issues.join(', ')}`);
      return upstreamFailure();
    }
    const enrichment = await fetchEnrichment(env, parsed.data.items);
    const body: AccountsResponse = {
      items: parsed.data.items.map((account) => toDomainRow(account, enrichment)),
      total: parsed.data.total,
    };
    return NextResponse.json(body);
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/accounts] upstream request failed: ${reason}`);
    return upstreamFailure();
  }
}
