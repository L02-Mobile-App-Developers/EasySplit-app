import { jest } from '@jest/globals';

const mockGetDoc: any = jest.fn();
const mockDocRef: any = jest.fn(() => ({ set: jest.fn() }));
const mockGetQuery: any = jest.fn();

jest.mock('@/lib/firestore-db', () => ({
  collectionNames: { users: 'users', subscriptions: 'subscriptions', groups: 'groups', auditLogs: 'audit_logs' },
  getDoc: (...a: any[]) => mockGetDoc(...a),
  docRef: (...a: any[]) => mockDocRef(...a),
  cleanForFirestore: (v: any) => v,
  subscriptionId: (u: string) => u,
  collectionRef: () => ({ where() { return this; } }),
  getQuery: (...a: any[]) => mockGetQuery(...a),
  sortByDateDesc: (items: any[], selector: any) => [...items].sort((a, b) => selector(b).getTime() - selector(a).getTime()),
}));

jest.mock('@/config', () => ({ config: { freeTier: { maxGroups: 3, smartSettlePerMonth: 5 } } }));

import * as userService from '@/modules/user/user.service';

describe('user.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getMe - not found', async () => {
    mockGetDoc.mockResolvedValue(null);
    await expect(userService.getMe('u1')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('updateMe - displayName cannot be empty', async () => {
    await expect(userService.updateMe('u1', { displayName: '   ' })).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('updateMe - user not found', async () => {
    mockGetDoc.mockResolvedValue(null);
    await expect(userService.updateMe('u1', { displayName: 'A' })).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('getSubscription - returns default free when missing', async () => {
    mockGetDoc.mockResolvedValue(null);
    const res = await userService.getSubscription('u1');
    expect(res.plan).toBe('free');
  });

  test('getMe - returns profile', async () => {
    mockGetDoc.mockResolvedValue({
      id: 'u1',
      displayName: 'Tester',
      email: 'test@x.com',
      avatarUrl: null,
      createdAt: new Date(),
    });

    const res = await userService.getMe('u1');
    expect(res.displayName).toBe('Tester');
  });

  test('updateMe - updates display name and avatar', async () => {
    mockGetDoc.mockResolvedValue({
      id: 'u1',
      displayName: 'Old',
      email: 'test@x.com',
      avatarUrl: null,
      createdAt: new Date(),
    });

    const res = await userService.updateMe('u1', {
      displayName: 'New',
      avatarUrl: 'https://cdn/avatar.png',
    });
    expect(res.displayName).toBe('New');
    expect(res.avatarUrl).toBe('https://cdn/avatar.png');
  });

  test('getSubscription - returns stored subscription', async () => {
    mockGetDoc.mockResolvedValue({
      plan: 'premium',
      status: 'active',
      currentPeriodStart: new Date('2026-01-01'),
      currentPeriodEnd: new Date('2026-12-31'),
    });

    const res = await userService.getSubscription('u1');
    expect(res.plan).toBe('premium');
  });

  test('getUsage - calculates group and monthly smart settle usage', async () => {
    const now = new Date();
    mockGetQuery
      .mockResolvedValueOnce([{ id: 'g1' }, { id: 'g2' }])
      .mockResolvedValueOnce([{ createdAt: now }]);
    const res = await userService.getUsage('u1');
    expect(res.groupCount).toBe(2);
    expect(res.smartSettleUsedThisMonth).toBe(1);
  });
});
