import { jest } from '@jest/globals';

const mockAssertGroupMember: any = jest.fn();
const mockAssertPremiumGroup: any = jest.fn();
const mockGetQuery: any = jest.fn();
const mockGetDoc: any = jest.fn();
const mockDocRef: any = jest.fn(() => ({ set: jest.fn() }));
const mockCreateId: any = jest.fn(() => 'r-1');
const mockPublicUserMap: any = jest.fn();

jest.mock('@/lib/entitlement', () => ({
  assertGroupMember: (...a: any[]) => mockAssertGroupMember(...a),
  assertPremiumGroup: (...a: any[]) => mockAssertPremiumGroup(...a),
}));

jest.mock('@/lib/firestore-db', () => ({
  collectionNames: { groupMembers: 'group_members', balances: 'balances', reminders: 'reminders' },
  collectionRef: () => ({ where() { return this; }, firestore: { batch: () => ({ set: jest.fn(), commit: () => Promise.resolve(undefined) }) } }),
  getQuery: (...a: any[]) => mockGetQuery(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  docRef: (...a: any[]) => mockDocRef(...a),
  createId: () => mockCreateId(),
  cleanForFirestore: (v: any) => v,
  paginate: (items: any[], page: number, limit: number) => ({ items: items.slice((page - 1) * limit, (page - 1) * limit + limit), pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) || 1 } }),
  sortByDateDesc: (items: any[], selector: any) => [...items].sort((a, b) => selector(b).getTime() - selector(a).getTime()),
  publicUserMap: (...a: any[]) => mockPublicUserMap(...a),
}));

import * as reminderService from '@/modules/reminder/reminder.service';

describe('reminder.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertGroupMember.mockResolvedValue(undefined);
    mockAssertPremiumGroup.mockResolvedValue(undefined);
    mockPublicUserMap.mockResolvedValue(new Map());
  });

  test('createReminder - requires at least one target', async () => {
    await expect(reminderService.createReminder('g1', 'u1', { targetUserIds: [] })).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('createReminder - target must be active member', async () => {
    mockGetQuery.mockResolvedValueOnce([{ userId: 'u1', isActive: true }]);
    await expect(reminderService.createReminder('g1', 'u1', { targetUserIds: ['u2'] })).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('createReminder - target must have negative balance', async () => {
    mockGetQuery
      .mockResolvedValueOnce([{ userId: 'u1', isActive: true }, { userId: 'u2', isActive: true }])
      .mockResolvedValueOnce([{ userId: 'u2', balance: 0 }]);
    await expect(reminderService.createReminder('g1', 'u1', { targetUserIds: ['u2'] })).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('cancelReminder - not found', async () => {
    mockGetDoc.mockResolvedValue(null);
    await expect(reminderService.cancelReminder('g1', 'r1', 'u1')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('cancelReminder - only creator can cancel', async () => {
    mockGetDoc.mockResolvedValue({ id: 'r1', groupId: 'g1', createdBy: 'u2', status: 'queued' });
    await expect(reminderService.cancelReminder('g1', 'r1', 'u1')).rejects.toHaveProperty('code', 'FORBIDDEN');
  });

  test('cancelReminder - queued reminder gets failed status', async () => {
    mockGetDoc.mockResolvedValue({ id: 'r1', groupId: 'g1', targetUserId: 'u2', createdBy: 'u1', status: 'queued' });
    const res = await reminderService.cancelReminder('g1', 'r1', 'u1');
    expect(res.status).toBe('failed');
  });

  test('getReminders - returns paginated enriched reminders', async () => {
    const now = new Date();
    mockGetQuery.mockResolvedValueOnce([
      {
        id: 'r1',
        groupId: 'g1',
        targetUserId: 'u2',
        createdBy: 'u1',
        createdAt: now,
        status: 'queued',
      },
    ]);
    mockPublicUserMap.mockResolvedValue(
      new Map([
        ['u2', { id: 'u2', displayName: 'U2' }],
        ['u1', { id: 'u1', displayName: 'U1' }],
      ]),
    );

    const res = await reminderService.getReminders('g1', 'u1', 1, 10);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].targetUser?.displayName).toBe('U2');
  });

  test('createReminder - rejects duplicate targets within 24 hours', async () => {
    const now = new Date();
    mockGetQuery
      .mockResolvedValueOnce([{ userId: 'u1', isActive: true }, { userId: 'u2', isActive: true }])
      .mockResolvedValueOnce([{ userId: 'u2', balance: -15 }])
      .mockResolvedValueOnce([
        { targetUserId: 'u2', createdAt: now, message: 'Please settle your outstanding debt in the group.' },
      ]);

    await expect(
      reminderService.createReminder('g1', 'u1', { targetUserIds: ['u2'] }),
    ).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('cancelReminder - rejects non-queued reminder', async () => {
    mockGetDoc.mockResolvedValue({
      id: 'r1',
      groupId: 'g1',
      createdBy: 'u1',
      status: 'sent',
    });

    await expect(reminderService.cancelReminder('g1', 'r1', 'u1')).rejects.toHaveProperty(
      'code',
      'VALIDATION_ERROR',
    );
  });

  test('createReminder - success enqueues reminders', async () => {
    mockGetQuery
      .mockResolvedValueOnce([{ userId: 'u1', isActive: true }, { userId: 'u2', isActive: true }]) // activeMembers
      .mockResolvedValueOnce([{ userId: 'u2', balance: -10 }]) // balances
      .mockResolvedValueOnce([]); // recentReminders

    mockPublicUserMap.mockResolvedValue(new Map([[ 'u2', { id: 'u2', displayName: 'U2' } ], [ 'u1', { id: 'u1' } ]]));

    const res = await reminderService.createReminder('g1', 'u1', { targetUserIds: ['u2'] });
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].targetUser).toEqual({ id: 'u2', displayName: 'U2' });
  });
});
