import { jest } from '@jest/globals';

const mockGetQueryInTransaction: any = jest.fn();
const mockGetDocInTransaction: any = jest.fn();
const mockGetQuery: any = jest.fn();
const mockGetDoc: any = jest.fn();
const mockPublicUserMap: any = jest.fn();
const mockCreateId: any = jest.fn(() => 'exp-1');

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
  docRef: () => ({ set: jest.fn() }),
  cleanForFirestore: (v: any) => v,
  balanceId: (g: string, u: string) => `${g}_${u}`,
  groupMemberId: (g: string, u: string) => `${g}_${u}`,
}));

import * as expenseService from '@/modules/expense/expense.service';

describe('expense.transaction', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createExpense - happy path', async () => {
    // membership assertion and transactional reads
    mockGetDocInTransaction.mockResolvedValueOnce({ userId: 'p1', isActive: true, role: 'member' }); // membership
    mockGetQueryInTransaction.mockResolvedValueOnce([{ userId: 'p1' }]); // activeMembers
    mockGetQueryInTransaction.mockResolvedValueOnce([]); // expenses
    mockGetQueryInTransaction.mockResolvedValueOnce([]); // balances

    // after transaction, getExpenseForResponse will call publicUserMap
    mockPublicUserMap.mockResolvedValue(new Map([
      ['p1', { id: 'p1', displayName: 'P1', email: 'p1@x' }],
    ]));

    const input = {
      description: 'd',
      amount: 100,
      paidByUserId: 'p1',
      splitMode: 'equal' as const,
      participants: [{ userId: 'p1', value: 0 }],
    };

    const res = await expenseService.createExpense('g1', 'u1', input as any);
    expect(res).toHaveProperty('participants');
    expect(mockCreateId).toHaveBeenCalled();
  });

  test('updateExpense - not found', async () => {
    mockGetDocInTransaction.mockResolvedValueOnce(null);
    await expect(expenseService.updateExpense('g1', 'e1', 'u1', {} as any)).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('deleteExpense - forbidden when not allowed', async () => {
    // assertGroupMemberInTransaction returns membership without admin rights
    mockGetDocInTransaction.mockResolvedValueOnce({ userId: 'u2', role: 'member', isActive: true });
    // existing expense with different createdBy and groupId mismatch
    mockGetDocInTransaction.mockResolvedValueOnce({ id: 'e1', groupId: 'g1', createdBy: 'other' });
    await expect(expenseService.deleteExpense('g1', 'e1', 'u1')).rejects.toHaveProperty('code', 'FORBIDDEN');
  });
});
