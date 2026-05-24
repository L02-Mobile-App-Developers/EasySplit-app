import { jest } from '@jest/globals';

const mockAssertGroupMember: any = jest.fn();
const mockGetGroupOwnerSubscription: any = jest.fn();
const mockIsPremiumSubscriptionActive: any = jest.fn();
const mockGetQuery: any = jest.fn();
const mockPublicUserMap: any = jest.fn();

jest.mock('@/lib/entitlement', () => ({
  assertGroupMember: (...a: any[]) => mockAssertGroupMember(...a),
  getGroupOwnerSubscription: (...a: any[]) => mockGetGroupOwnerSubscription(...a),
  isPremiumSubscriptionActive: (...a: any[]) => mockIsPremiumSubscriptionActive(...a),
}));

jest.mock('@/lib/firestore-db', () => ({
  collectionNames: { auditLogs: 'audit_logs' },
  collectionRef: () => ({ where() { return this; } }),
  getQuery: (...a: any[]) => mockGetQuery(...a),
  paginate: (items: any[], page: number, limit: number) => ({
    items: items.slice((page - 1) * limit, (page - 1) * limit + limit),
    pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) || 1 },
  }),
  publicUserMap: (...a: any[]) => mockPublicUserMap(...a),
  sortByDateDesc: (items: any[], selector: any) => [...items].sort((a, b) => selector(b).getTime() - selector(a).getTime()),
}));

jest.mock('@/config', () => ({ config: { freeTier: { historyDays: 7 } } }));

import * as activityService from '@/modules/activity/activity.service';

describe('activity.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertGroupMember.mockResolvedValue(undefined);
    mockPublicUserMap.mockResolvedValue(new Map([['u1', { id: 'u1', displayName: 'User 1', email: 'u1@x' }]]));
  });

  test('getActivities - returns paginated enriched logs', async () => {
    const now = new Date();
    mockGetQuery.mockResolvedValue([
      { id: 'l1', actorUserId: 'u1', createdAt: now, action: 'group_created' },
    ]);

    const res = await activityService.getActivities('g1', 'u1', 1, 20);
    expect(res.items.length).toBe(1);
    expect(res.items[0].actor?.id).toBe('u1');
  });

  test('getHistory - free plan clamps from date by history cutoff', async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 20 * 24 * 3600 * 1000);
    mockGetGroupOwnerSubscription.mockResolvedValue({ subscription: { plan: 'free' } });
    mockIsPremiumSubscriptionActive.mockReturnValue(false);
    mockGetQuery.mockResolvedValue([
      { id: 'old', actorUserId: 'u1', createdAt: old, action: 'expense_created' },
      { id: 'new', actorUserId: 'u1', createdAt: now, action: 'expense_created' },
    ]);

    const res = await activityService.getHistory('g1', 'u1', { from: old.toISOString(), type: 'expense' });
    expect(res.items.length).toBe(1);
    expect(res.meta.plan).toBe('free');
  });

  test('getHistory - actor filter and toDate filter', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    mockGetGroupOwnerSubscription.mockResolvedValue({ subscription: { plan: 'premium' } });
    mockIsPremiumSubscriptionActive.mockReturnValue(true);
    mockGetQuery.mockResolvedValue([
      { id: 'a', actorUserId: 'u1', createdAt: yesterday, action: 'member_added' },
      { id: 'b', actorUserId: 'u2', createdAt: now, action: 'member_removed' },
    ]);

    const res = await activityService.getHistory('g1', 'u1', {
      actorId: 'u1',
      to: now.toISOString(),
      type: 'member',
      page: 1,
      limit: 10,
    });
    expect(res.items.length).toBe(1);
    expect(res.items[0].id).toBe('a');
  });
});
