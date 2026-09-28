import {
  queueResponseSchema,
  reviewedResponseSchema,
  toReportedItem,
  toReviewedItem,
  type QueueItem,
  type ReviewedApiItem,
} from '@/lib/admin/moderation-api';

const formatDateTime = (iso: string) => `formatted(${iso})`;

function queueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'LIST:list-1',
    targetType: 'LIST',
    targetId: 'list-1',
    title: 'Best tacos',
    kind: 'List',
    excerpt: null,
    where: null,
    reason: 'Spam',
    severity: 'AVERAGE',
    owner: { name: 'Ana Souza', handle: 'ana', account: 'Individual', accountStatus: 'ACTIVE' },
    priorRemovals: 2,
    reporters: [
      { name: 'Bob', handle: null, reason: 'Spam', reportedAt: '2026-09-01T00:00:00.000Z' },
    ],
    ...overrides,
  };
}

function reviewedItem(overrides: Partial<ReviewedApiItem> = {}): ReviewedApiItem {
  return {
    id: 'LIST:list-1',
    title: 'Best tacos',
    owner: 'Ana Souza',
    reportCount: 3,
    decision: 'KEPT',
    reviewedBy: 'Maria',
    reviewedAt: '2026-09-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('queueResponseSchema / reviewedResponseSchema', () => {
  it('accepts a well-formed queue response', () => {
    const result = queueResponseSchema.safeParse({ items: [queueItem()], total: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects a queue item with a non-datetime reportedAt', () => {
    const item = queueItem({
      reporters: [{ name: 'Bob', handle: null, reason: 'Spam', reportedAt: 'not-a-date' }],
    });
    const result = queueResponseSchema.safeParse({ items: [item], total: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown accountStatus value', () => {
    const item = queueItem({
      owner: {
        name: 'Ana',
        handle: null,
        account: 'Individual',
        accountStatus: 'ON_HOLD' as never,
      },
    });
    const result = queueResponseSchema.safeParse({ items: [item], total: 1 });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed reviewed response with nullable title/owner', () => {
    const result = reviewedResponseSchema.safeParse({
      items: [reviewedItem({ title: null, owner: null })],
    });
    expect(result.success).toBe(true);
  });
});

describe('toReportedItem', () => {
  it('maps a full queue item, forwarding raw counts rather than prose', () => {
    const item = toReportedItem(queueItem(), 0, formatDateTime);

    expect(item).toMatchObject({
      id: 'LIST:list-1',
      targetType: 'LIST',
      targetId: 'list-1',
      title: 'Best tacos',
      kind: 'List',
      severity: 'Average',
      excerpt: null,
      where: '—',
      owner: 'Ana Souza',
      handle: 'ana',
      account: 'Individual',
      accountStatus: 'ACTIVE',
      priorRemovals: 2,
      initials: 'AS',
    });
    expect(item.reporters).toEqual([
      { name: 'Bob', handle: '', reason: 'Spam', date: 'formatted(2026-09-01T00:00:00.000Z)' },
    ]);
  });

  it('cycles avatar colors by index', () => {
    const first = toReportedItem(queueItem(), 0, formatDateTime);
    const sixth = toReportedItem(queueItem(), 5, formatDateTime);
    expect(first.avatarColor).toBe(sixth.avatarColor);
  });

  it('falls back to dashes and null accountStatus when owner is absent', () => {
    const item = toReportedItem(queueItem({ owner: null }), 0, formatDateTime);
    expect(item.owner).toBe('—');
    expect(item.handle).toBe('');
    expect(item.account).toBe('—');
    expect(item.accountStatus).toBeNull();
    expect(item.initials).toBe('—');
  });
});

describe('toReviewedItem', () => {
  it('maps a full reviewed item, forwarding the raw report count', () => {
    const item = toReviewedItem(reviewedItem(), formatDateTime);
    expect(item).toEqual({
      id: 'LIST:list-1',
      title: 'Best tacos',
      owner: 'Ana Souza',
      reportCount: 3,
      decision: 'Kept',
      reviewedBy: 'Maria',
      reviewedAt: 'formatted(2026-09-02T00:00:00.000Z)',
    });
  });

  it('keeps null title/owner and falls back reviewedBy to a dash', () => {
    const item = toReviewedItem(
      reviewedItem({ title: null, owner: null, reviewedBy: null }),
      formatDateTime,
    );
    expect(item.title).toBeNull();
    expect(item.owner).toBeNull();
    expect(item.reviewedBy).toBe('—');
  });

  it('maps REMOVED to the Removed display decision', () => {
    const item = toReviewedItem(reviewedItem({ decision: 'REMOVED' }), formatDateTime);
    expect(item.decision).toBe('Removed');
  });
});
