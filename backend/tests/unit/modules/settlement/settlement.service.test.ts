import { jest } from '@jest/globals';

const mockGetDoc: any = jest.fn();
const mockGetQuery: any = jest.fn();
const mockGetDocInTransaction: any = jest.fn();
const mockGetQueryInTransaction: any = jest.fn();
const mockPublicUserMap: any = jest.fn();
const mockDocRef: any = jest.fn(() => ({ set: jest.fn() }));
const mockCreateId: any = jest.fn(() => 'audit-1');
const mockAssertPremiumGroup: any = jest.fn();
const mockIsPremiumSubscriptionActive: any = jest.fn();

jest.mock('@/lib/entitlement', () => ({
  assertPremiumGroup: (...a: any[]) => mockAssertPremiumGroup(...a),
  isPremiumSubscriptionActive: (...a: any[]) => mockIsPremiumSubscriptionActive(...a),
}));

jest.mock('@/config', () => ({ config: { freeTier: { smartSettlePerMonth: 1 } } }));

jest.mock('@/lib/firestore-db', () => ({
  collectionNames: {
    groupMembers: 'group_members',
    balances: 'balances',
    subscriptions: 'subscriptions',
    auditLogs: 'audit_logs',
    settlements: 'settlements',
    groups: 'groups',
  },
  groupMemberId: (g: string, u: string) => `${g}_${u}`,
  subscriptionId: (u: string) => u,
  collectionRef: () => ({ where() { return this; }, firestore: { runTransaction: async (fn: any) => fn({ set: jest.fn(), delete: jest.fn(), update: jest.fn() }) } }),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  getQuery: (...a: any[]) => mockGetQuery(...a),
  getDocInTransaction: (...a: any[]) => mockGetDocInTransaction(...a),
  getQueryInTransaction: (...a: any[]) => mockGetQueryInTransaction(...a),
  publicUserMap: (...a: any[]) => mockPublicUserMap(...a),
  docRef: (...a: any[]) => mockDocRef(...a),
  balanceId: (g: string, u: string) => `${g}_${u}`,
  cleanForFirestore: (v: any) => v,
  createId: () => mockCreateId(),
  sortByDateDesc: (items: any[], selector: any) => [...items].sort((a, b) => selector(b).getTime() - selector(a).getTime()),
  paginate: (items: any[], page: number, limit: number) => ({ items: items.slice((page - 1) * limit, (page - 1) * limit + limit), pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) || 1 } }),
}));

import * as settlementService from '@/modules/settlement/settlement.service';

describe('settlement.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // reset queued resolved values on these mocks
    mockGetQueryInTransaction.mockReset();
    mockGetDocInTransaction.mockReset();
    mockGetDoc.mockReset();
    mockGetQuery.mockReset();
    // reapply simple implementations
    mockDocRef.mockImplementation(() => ({ set: jest.fn() }));
    mockCreateId.mockImplementation(() => 'audit-1');
    mockPublicUserMap.mockResolvedValue(new Map());
  });

  test('getDebts - requires active membership', async () => {
    mockGetDoc.mockResolvedValueOnce(null);
    await expect(settlementService.getDebts('g1', 'u1')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('getDebts - builds debt edges from balances', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetQuery.mockResolvedValueOnce([
      { userId: 'uA', balance: 100 },
      { userId: 'uB', balance: -40 },
      { userId: 'uC', balance: -60 },
    ]);
    const res = await settlementService.getDebts('g1', 'u1');
    expect(res.length).toBe(2);
    expect(res[0].amount + res[1].amount).toBe(100);
  });

  test('generateSmartSettle - unsupported algorithm', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetDoc.mockResolvedValueOnce(null); // subscription free
    mockIsPremiumSubscriptionActive.mockReturnValue(false);
    mockGetQuery.mockResolvedValueOnce([]); // logs count under quota
    await expect(settlementService.generateSmartSettle('g1', 'u1', 'other_algo', 10)).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('generateSmartSettle - free quota exceeded', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetDoc.mockResolvedValueOnce(null); // subscription free
    mockIsPremiumSubscriptionActive.mockReturnValue(false);
    mockGetQuery.mockResolvedValueOnce([{ createdAt: new Date() }]); // >= quota
    await expect(settlementService.generateSmartSettle('g1', 'u1', 'min_transfer', 10)).rejects.toHaveProperty('code', 'FREE_QUOTA_EXCEEDED');
  });

  test('createSettlement - amount must be > 0', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    await expect(
      settlementService.createSettlement('g1', 'u1', { fromUserId: 'u2', toUserId: 'u3', amount: 0 }),
    ).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('createSettlement - payer must have negative balance', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    // inside transaction: activeMembers, fromBalance, toBalance
    mockGetQueryInTransaction.mockResolvedValueOnce([{ userId: 'u2' }, { userId: 'u3' }]);
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: 0 }); // fromBalance non-negative
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: 100 }); // toBalance positive

    await expect(
      settlementService.createSettlement('g1', 'u1', { fromUserId: 'u2', toUserId: 'u3', amount: 10 }),
    ).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('createSettlement - amount exceeds max allowed', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetQueryInTransaction.mockResolvedValueOnce([{ userId: 'u2' }, { userId: 'u3' }]);
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: -20 }); // from owes 20
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: 10 }); // to is owed 10

    await expect(
      settlementService.createSettlement('g1', 'u1', { fromUserId: 'u2', toUserId: 'u3', amount: 15 }),
    ).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('createSettlement - success', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetQueryInTransaction.mockResolvedValueOnce([{ userId: 'u2' }, { userId: 'u3' }]);
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: -50 }); // from owes 50
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: 60 }); // to owed 60

    const res = await settlementService.createSettlement('g1', 'u1', { fromUserId: 'u2', toUserId: 'u3', amount: 20 }, 'req-1');
    expect(res).toHaveProperty('id');
  });

  test('getSettlements - pagination and sorting', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    const now = new Date();
    const items = [
      { id: 's1', groupId: 'g1', createdAt: new Date(now.getTime() - 1000) },
      { id: 's2', groupId: 'g1', createdAt: new Date(now.getTime() - 500) },
    ];
    mockGetQuery.mockResolvedValueOnce(items);

    const res = await settlementService.getSettlements('g1', 'u1', 1, 10);
    expect(res.items.length).toBe(2);
    expect(res.items[0].id).toBe('s2');
  });

  test('generateSmartSettle - premium bypass quota', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetDoc.mockResolvedValueOnce({}); // subscription object
    mockIsPremiumSubscriptionActive.mockReturnValue(true);
    mockGetQuery.mockResolvedValueOnce([
      { userId: 'uA', balance: 90 },
      { userId: 'uB', balance: -40 },
      { userId: 'uC', balance: -50 },
    ]);

    const res = await settlementService.generateSmartSettle('g1', 'u1', 'min_transfer', 50);
    expect(res.transfers.length).toBeGreaterThan(0);
    expect(res.totalTransfers).toBeGreaterThan(0);
    expect(mockDocRef).toHaveBeenCalled();
  });

  // Cannot directly test internal helper `enrichSettlement` (not exported)

  test('generateSmartSettle - returns transfers for min_transfer', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetDoc.mockResolvedValueOnce(null);
    mockIsPremiumSubscriptionActive.mockReturnValue(false);
    mockGetQuery.mockResolvedValueOnce([]); // audit logs under quota
    mockGetQuery.mockResolvedValueOnce([
      { userId: 'uA', balance: 100 },
      { userId: 'uB', balance: -60 },
      { userId: 'uC', balance: -40 },
    ]); // balances

    const res = await settlementService.generateSmartSettle('g1', 'u1', 'min_transfer', 50);
    expect(res.transfers.length).toBeGreaterThan(0);
    expect(res.totalTransfers).toBeGreaterThan(0);
  });

  test('createSettlement - cannot settle with self', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    await expect(
      settlementService.createSettlement('g1', 'u1', { fromUserId: 'u2', toUserId: 'u2', amount: 10 }),
    ).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('createSettlement - fromUserId must be active member', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetQueryInTransaction.mockResolvedValueOnce([{ userId: 'u3' }]);
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: -10 });
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: 10 });

    await expect(
      settlementService.createSettlement('g1', 'u1', { fromUserId: 'u2', toUserId: 'u3', amount: 5 }),
    ).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('createSettlement - receiver must have positive balance', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetQueryInTransaction.mockResolvedValueOnce([{ userId: 'u2' }, { userId: 'u3' }]);
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: -10 });
    mockGetDocInTransaction.mockResolvedValueOnce({ balance: 0 });

    await expect(
      settlementService.createSettlement('g1', 'u1', { fromUserId: 'u2', toUserId: 'u3', amount: 5 }),
    ).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('getSettlement - not found', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetDoc.mockResolvedValueOnce(null);

    await expect(settlementService.getSettlement('g1', 'missing', 'u1')).rejects.toHaveProperty(
      'code',
      'NOT_FOUND',
    );
  });

  test('getSettlement - wrong group', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetDoc.mockResolvedValueOnce({
      id: 's1',
      groupId: 'other',
      fromUserId: 'u2',
      toUserId: 'u3',
      createdBy: 'u1',
    });

    await expect(settlementService.getSettlement('g1', 's1', 'u1')).rejects.toHaveProperty(
      'code',
      'NOT_FOUND',
    );
  });

  test('getSettlement - returns enriched settlement', async () => {
    const settlement = {
      id: 's1',
      groupId: 'g1',
      fromUserId: 'u2',
      toUserId: 'u3',
      amount: 10,
      note: null,
      createdBy: 'u1',
      createdAt: new Date(),
    };
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetDoc.mockResolvedValueOnce(settlement);
    mockPublicUserMap.mockResolvedValue(
      new Map([
        ['u2', { id: 'u2', displayName: 'From' }],
        ['u3', { id: 'u3', displayName: 'To' }],
        ['u1', { id: 'u1', displayName: 'Creator' }],
      ]),
    );

    const res = await settlementService.getSettlement('g1', 's1', 'u1');
    expect(res.fromUser?.displayName).toBe('From');
    expect(res.toUser?.displayName).toBe('To');
  });

  test('getSettlements - enriches paginated items', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetQuery.mockResolvedValueOnce([
      {
        id: 's1',
        groupId: 'g1',
        fromUserId: 'u2',
        toUserId: 'u3',
        amount: 5,
        note: null,
        createdBy: 'u1',
        createdAt: new Date(),
      },
    ]);
    mockPublicUserMap.mockResolvedValue(new Map([['u2', { id: 'u2' }]]));

    const res = await settlementService.getSettlements('g1', 'u1', 1, 10);
    expect(res.items).toHaveLength(1);
    expect(res.pagination.total).toBe(1);
  });

  test('groupSettlement - simulate mode', async () => {
    mockAssertPremiumGroup.mockResolvedValue(undefined);
    mockGetDoc
      .mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true })
      .mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockIsPremiumSubscriptionActive.mockReturnValue(false);
    mockGetQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { userId: 'uA', balance: 30 },
        { userId: 'uB', balance: -30 },
      ]);

    const res = await settlementService.groupSettlement('g1', 'u1', { mode: 'simulate' });
    expect(res.mode).toBe('simulate');
    expect(res.totalTransfers).toBe(1);
  });

  test('groupSettlement - commit mode', async () => {
    mockIsPremiumSubscriptionActive.mockReturnValue(true);
    mockGetDocInTransaction
      .mockResolvedValueOnce({ userId: 'u1', isActive: true })
      .mockResolvedValueOnce({ id: 'g1', ownerId: 'u1' })
      .mockResolvedValueOnce({ plan: 'premium', status: 'active' });
    mockGetQueryInTransaction.mockResolvedValueOnce([
      { userId: 'uA', balance: 40 },
      { userId: 'uB', balance: -40 },
    ]);

    const res = await settlementService.groupSettlement('g1', 'u1', {
      mode: 'commit',
      note: 'close out',
    });

    expect(res.mode).toBe('commit');
    expect(res.totalSettlements).toBe(1);
  });

  test('groupSettlement - commit requires premium', async () => {
    mockIsPremiumSubscriptionActive.mockReturnValue(false);
    mockGetDocInTransaction
      .mockResolvedValueOnce({ userId: 'u1', isActive: true })
      .mockResolvedValueOnce({ id: 'g1', ownerId: 'u1' })
      .mockResolvedValueOnce({ plan: 'free', status: 'active' });

    await expect(
      settlementService.groupSettlement('g1', 'u1', { mode: 'commit' }),
    ).rejects.toHaveProperty('code', 'PREMIUM_REQUIRED');
  });

  test('getDebts - enriches users on edges', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetQuery.mockResolvedValueOnce([
      { userId: 'uA', balance: 25 },
      { userId: 'uB', balance: -25 },
    ]);
    mockPublicUserMap.mockResolvedValue(
      new Map([
        ['uB', { id: 'uB', displayName: 'Debtor' }],
        ['uA', { id: 'uA', displayName: 'Creditor' }],
      ]),
    );

    const res = await settlementService.getDebts('g1', 'u1');
    expect(res[0].fromUser?.displayName).toBe('Debtor');
    expect(res[0].toUser?.displayName).toBe('Creditor');
  });
});
