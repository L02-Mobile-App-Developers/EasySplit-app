import { jest } from '@jest/globals';

const mockGetDoc: any = jest.fn();
const mockGetQuery: any = jest.fn();
const mockGetPublicUser: any = jest.fn();

jest.mock('@/lib/firestore-db', () => ({
  collectionNames: { balances: 'balances', groupMembers: 'group_members' },
  collectionRef: () => ({ where() { return this; } }),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  getQuery: (...a: any[]) => mockGetQuery(...a),
  getPublicUser: (...a: any[]) => mockGetPublicUser(...a),
  groupMemberId: (g: string, u: string) => `${g}_${u}`,
  balanceId: (g: string, u: string) => `${g}_${u}`,
}));

import * as balanceService from '@/modules/balance/balance.service';
import { NotFoundError } from '@/lib/errors';

describe('balance.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getBalances - not active member', async () => {
    mockGetDoc.mockResolvedValue(null); // membership missing
    await expect(balanceService.getBalances('g1', 'u1')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('getMyBalance - returns zero when missing', async () => {
    // membership exists
    mockGetDoc.mockImplementation((name: any, id: any) => {
      if (name === 'group_members') return { groupId: 'g1', userId: 'u1', isActive: true };
      return null;
    });
    mockGetPublicUser.mockResolvedValue(null);

    const res = await balanceService.getMyBalance('g1', 'u1');
    expect(res.balance).toBe(0);
    expect(res.user).toBeNull();
  });

  test('getBalances - returns sorted enriched balances', async () => {
    mockGetDoc.mockResolvedValueOnce({ groupId: 'g1', userId: 'u1', isActive: true });
    mockGetQuery.mockResolvedValueOnce([
      { userId: 'u1', balance: 5, groupId: 'g1' },
      { userId: 'u2', balance: 20, groupId: 'g1' },
    ]);
    mockGetPublicUser.mockImplementation(async (id: string) => ({
      id,
      displayName: id,
      email: `${id}@x.com`,
      avatarUrl: null,
    }));

    const res = await balanceService.getBalances('g1', 'u1');
    expect(res).toHaveLength(2);
    expect(res[0].balance).toBe(20);
    expect(res[0].user?.displayName).toBe('u2');
  });

  test('getMyBalance - returns existing balance with user', async () => {
    const balance = { groupId: 'g1', userId: 'u1', balance: 42 };
    mockGetDoc.mockImplementation((name: any, id: any) => {
      if (name === 'group_members') return { groupId: 'g1', userId: 'u1', isActive: true };
      if (name === 'balances') return balance;
      return null;
    });
    mockGetPublicUser.mockResolvedValue({ id: 'u1', displayName: 'U1', email: 'u1@x' });

    const res = await balanceService.getMyBalance('g1', 'u1');
    expect(res.balance).toBe(42);
    expect(res.user).toBeTruthy();
  });
});
