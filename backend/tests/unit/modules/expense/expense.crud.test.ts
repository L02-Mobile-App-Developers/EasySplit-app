import { jest } from '@jest/globals';

const mockGetQueryInTransaction: any = jest.fn();
const mockGetDocInTransaction: any = jest.fn();
const mockGetQuery: any = jest.fn();
const mockGetDoc: any = jest.fn();
const mockPublicUserMap: any = jest.fn();
const mockCreateId: any = jest.fn(() => 'exp-99');

jest.mock('@/lib/firestore-db', () => ({
  collectionNames: { expenses: 'expenses', groupMembers: 'group_members', balances: 'balances', auditLogs: 'audit_logs' },
  collectionRef: () => ({
    where: () => ({
      get: jest.fn().mockResolvedValue([]),
      where: () => ({ get: jest.fn().mockResolvedValue([]) }),
    }),
    firestore: { runTransaction: async (fn: any) => fn({ set: jest.fn(), delete: jest.fn(), update: jest.fn() }) },
  }),
  getQueryInTransaction: (...a: any[]) => mockGetQueryInTransaction(...a),
  getDocInTransaction: (...a: any[]) => mockGetDocInTransaction(...a),
  getQuery: (...a: any[]) => mockGetQuery(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  publicUserMap: (...a: any[]) => mockPublicUserMap(...a),
  createId: () => mockCreateId(),
  docRef: () => ({ set: jest.fn(), delete: jest.fn() }),
  cleanForFirestore: (v: any) => v,
  balanceId: (g: string, u: string) => `${g}_${u}`,
  groupMemberId: (g: string, u: string) => `${g}_${u}`,
  paginate: (items: any[], page: number, limit: number) => ({ items: items.slice((page - 1) * limit, (page - 1) * limit + limit), pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) || 1 } }),
  sortByDateDesc: (items: any[], selector: any) => [...items].sort((a, b) => selector(b).getTime() - selector(a).getTime()),
}));

import * as expenseService from '@/modules/expense/expense.service';

describe('expense.crud', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPublicUserMap.mockResolvedValue(new Map());
  });

  test('getExpenses - requires membership and paginates', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', isActive: true }); // membership
    const now = new Date();
    mockGetQuery.mockResolvedValueOnce([
      { id: 'e1', groupId: 'g1', createdAt: new Date(now.getTime() - 1000), participants: [], paidByUserId: 'u1', createdBy: 'u1', amount: 10, splitMode: 'equal', currency: 'VND', updatedAt: new Date() },
      { id: 'e2', groupId: 'g1', createdAt: new Date(now.getTime() - 500), participants: [], paidByUserId: 'u1', createdBy: 'u1', amount: 20, splitMode: 'equal', currency: 'VND', updatedAt: new Date() },
    ]);

    const res = await expenseService.getExpenses('g1', 'u1', 1, 10);
    expect(res.items.length).toBe(2);
  });

  test('getExpense - not found and found', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', isActive: true }); // membership
    mockGetDoc.mockResolvedValueOnce(null); // expense missing
    await expect(expenseService.getExpense('g1', 'eX', 'u1')).rejects.toHaveProperty('code', 'NOT_FOUND');

    // found case
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', isActive: true });
    mockGetDoc.mockResolvedValueOnce({ id: 'e1', groupId: 'g1', participants: [], paidByUserId: 'u1', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), amount: 10, splitMode: 'equal', currency: 'VND' });
    mockPublicUserMap.mockResolvedValue(new Map([[ 'u1', { id: 'u1' } ]]));
    const res = await expenseService.getExpense('g1', 'e1', 'u1');
    expect(res).toHaveProperty('id', 'e1');
  });

  test('updateExpense - success when creator', async () => {
    // membership and existing expense
    mockGetDocInTransaction.mockResolvedValueOnce({ userId: 'u1', role: 'member', isActive: true });
    mockGetDocInTransaction.mockResolvedValueOnce({ id: 'e1', groupId: 'g1', createdBy: 'u1', participants: [{ userId: 'u1', value: 0 }], paidByUserId: 'u1', amount: 10, splitMode: 'equal', currency: 'VND', createdAt: new Date(), updatedAt: new Date() });
    // readGroupState -> activeMembers, expenses, balances
    mockGetQueryInTransaction.mockResolvedValueOnce([{ userId: 'u1' }]);
    mockGetQueryInTransaction.mockResolvedValueOnce([]);
    mockGetQueryInTransaction.mockResolvedValueOnce([]);

    mockPublicUserMap.mockResolvedValue(new Map([[ 'u1', { id: 'u1' } ]]));

    const res = await expenseService.updateExpense('g1', 'e1', 'u1', { description: 'updated' } as any);
    expect(res).toHaveProperty('description', 'updated');
  });

  test('deleteExpense - success when admin', async () => {
    mockGetDocInTransaction.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    mockGetDocInTransaction.mockResolvedValueOnce({ id: 'e1', groupId: 'g1', createdBy: 'other', participants: [], paidByUserId: 'u1', amount: 10, splitMode: 'equal', currency: 'VND', createdAt: new Date(), updatedAt: new Date() });
    // readGroupState
    mockGetQueryInTransaction.mockResolvedValueOnce([{ userId: 'u1' }]);
    mockGetQueryInTransaction.mockResolvedValueOnce([]);
    mockGetQueryInTransaction.mockResolvedValueOnce([]);

    const res = await expenseService.deleteExpense('g1', 'e1', 'u1');
    expect(res).toHaveProperty('id', 'e1');
  });
});
