import { jest } from '@jest/globals';

const mockGetQuery: any = jest.fn();
const mockIsUserPremium: any = jest.fn();
const mockCreateId: any = jest.fn(() => 'group-1');
const mockCollectionRef: any = jest.fn(() => ({
  where() { return this; },
  limit() { return this; },
  firestore: { batch: () => ({ set: jest.fn(), commit: () => Promise.resolve(undefined) }) },
}));
const mockGetDoc: any = jest.fn();
const mockDocRef: any = jest.fn(() => ({ set: jest.fn() }));
const mockGetQueryInTransaction: any = jest.fn();
const mockGetDocInTransaction: any = jest.fn();

jest.mock('@/lib/firestore-db', () => ({
  collectionNames: { groups: 'groups', groupMembers: 'group_members', balances: 'balances', users: 'users' },
  getQuery: (...a: any[]) => mockGetQuery(...a),
  collectionRef: (...a: any[]) => mockCollectionRef(...a),
  createId: () => mockCreateId(),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  getDocInTransaction: (...a: any[]) => mockGetDocInTransaction(...a),
  getQueryInTransaction: (...a: any[]) => mockGetQueryInTransaction(...a),
  docRef: (...a: any[]) => mockDocRef(...a),
  cleanForFirestore: (v: any) => v,
  balanceId: (g: string, u: string) => `${g}_${u}`,
  groupMemberId: (g: string, u: string) => `${g}_${u}`,
}));

jest.mock('@/lib/entitlement', () => ({ isUserPremium: (...a: any[]) => mockIsUserPremium(...a) }));
jest.mock('@/config', () => ({ config: { freeTier: { maxGroups: 1 } } }));

import * as groupService from '@/modules/group/group.service';
import { FreeQuotaExceededError, NotFoundError, ConflictError } from '@/lib/errors';

describe('group.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createGroup - free quota exceeded', async () => {
    mockIsUserPremium.mockResolvedValue(false);
    mockGetQuery.mockResolvedValue([ { id: 'g1' } ]);
    await expect(groupService.createGroup('u1', { name: 'G', category: 'c' })).rejects.toHaveProperty('code', 'FREE_QUOTA_EXCEEDED');
  });

  test('createGroup - success when premium', async () => {
    mockIsUserPremium.mockResolvedValue(true);
    mockGetQuery.mockResolvedValue([]);
    const res = await groupService.createGroup('u1', { name: 'G', category: 'c' });
    expect(res.id).toBe('group-1');
  });

  test('addMember - user not found', async () => {
    mockGetDoc.mockResolvedValue(null); // user not found
    await expect(groupService.addMember('g1', 'u1', 'target', 'member')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('addMember - existing active member conflict', async () => {
    mockGetDoc.mockImplementation((name: any, id: any) => {
      // first call: membership for caller (assertOwnerOrAdmin)
      if (name === 'group_members' && id === 'g1_u1') return { userId: 'u1', role: 'owner', isActive: true };
      if (name === 'users') return { id: 'target' };
      // existing membership for target
      if (name === 'group_members' && id === 'g1_target') return { userId: 'target', isActive: true };
      return null;
    });
    await expect(groupService.addMember('g1', 'u1', 'target', 'member')).rejects.toHaveProperty('code', 'CONFLICT');
  });

  test('getGroup - membership missing', async () => {
    mockGetDoc.mockResolvedValue(null);
    await expect(groupService.getGroup('g1', 'u1')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('getGroups - returns only existing groups with role', async () => {
    mockGetQuery.mockResolvedValue([{ groupId: 'g1', role: 'member', isActive: true }]);
    mockGetDoc.mockResolvedValue({ id: 'g1', name: 'G1', updatedAt: new Date() });
    const res = await groupService.getGroups('u1');
    expect(res.length).toBe(1);
    expect(res[0].role).toBe('member');
  });

  test('updateGroup - not found', async () => {
    mockGetDoc.mockResolvedValueOnce(null); // membership check in assertOwnerOrAdmin
    await expect(groupService.updateGroup('g1', 'u1', { name: 'X' })).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('updateGroup - success', async () => {
    // assertOwnerOrAdmin -> membership
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    // getDoc group
    mockGetDoc.mockResolvedValueOnce({ id: 'g1', name: 'Old', category: 'c', updatedAt: new Date() });
    const res = await groupService.updateGroup('g1', 'u1', { name: 'New' });
    expect(res.name).toBe('New');
  });

  test('closeGroup - success', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    mockGetDoc.mockResolvedValueOnce({ id: 'g1', name: 'Old', status: 'active', updatedAt: new Date() });
    const res = await groupService.closeGroup('g1', 'u1');
    expect(res.status).toBe('closed');
  });

  test('addMember - new member path', async () => {
    // caller membership
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    // target user exists
    mockGetDoc.mockResolvedValueOnce({ id: 'target' });
    // existing membership for target is null
    mockGetDoc.mockResolvedValueOnce(null);
    const res = await groupService.addMember('g1', 'u1', 'target', 'member');
    expect(res.userId).toBe('target');
    expect(res.role).toBe('member');
  });

  test('updateMemberRole - cannot change owner', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    mockGetDoc.mockResolvedValueOnce({ userId: 't', role: 'owner', isActive: true });
    await expect(groupService.updateMemberRole('g1', 'u1', 't', 'admin')).rejects.toHaveProperty('code', 'FORBIDDEN');
  });

  test('getMembers - maps users', async () => {
    // membership for caller
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    // getActiveMembers
    mockGetQuery.mockResolvedValueOnce([{ userId: 'm1', role: 'member', joinedAt: new Date() }]);
    // getDoc for user
    mockGetDoc.mockResolvedValueOnce({ id: 'm1', displayName: 'M1', email: 'm1@x', avatarUrl: null });
    const res = await groupService.getMembers('g1', 'u1');
    expect(res.length).toBe(1);
    expect(res[0].displayName).toBe('M1');
  });

  test('removeMember - success', async () => {
    // assertOwner
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    // membership for target
    mockGetDoc.mockResolvedValueOnce({ userId: 't', role: 'member', isActive: true });
    await expect(groupService.removeMember('g1', 'u1', 't')).resolves.toBeUndefined();
  });

  test('removeMember - owner cannot remove self', async () => {
    mockGetDoc.mockResolvedValue({ userId: 'u1', role: 'owner', isActive: true });
    await expect(groupService.removeMember('g1', 'u1', 'u1')).rejects.toHaveProperty('code', 'FORBIDDEN');
  });

  test('getGroup - returns group with member count', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'member', isActive: true });
    mockGetDoc.mockResolvedValueOnce({ id: 'g1', name: 'Trip', category: 'travel', updatedAt: new Date() });
    mockGetQuery.mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }]);

    const res = await groupService.getGroup('g1', 'u1');
    expect(res.name).toBe('Trip');
    expect(res.memberCount).toBe(2);
    expect(res.role).toBe('member');
  });

  test('getGroups - skips missing groups', async () => {
    mockGetQuery.mockResolvedValueOnce([
      { groupId: 'g1', role: 'member', isActive: true },
      { groupId: 'missing', role: 'member', isActive: true },
    ]);
    mockGetDoc
      .mockResolvedValueOnce({ id: 'g1', name: 'G1', updatedAt: new Date('2026-01-02') })
      .mockResolvedValueOnce(null);

    const res = await groupService.getGroups('u1');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('g1');
  });

  test('addMember - reactivates inactive member', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    mockGetDoc.mockResolvedValueOnce({ id: 'target' });
    mockGetDoc.mockResolvedValueOnce({ userId: 'target', isActive: false, role: 'member' });
    mockGetDoc.mockResolvedValueOnce(null);

    const res = await groupService.addMember('g1', 'u1', 'target', 'admin');
    expect(res.role).toBe('admin');
  });

  test('updateMemberRole - success for non-owner member', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    mockGetDoc.mockResolvedValueOnce({ userId: 't', role: 'member', isActive: true, joinedAt: new Date() });

    const res = await groupService.updateMemberRole('g1', 'u1', 't', 'admin');
    expect(res.role).toBe('admin');
  });

  test('updateGroup - group missing after permission check', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    mockGetDoc.mockResolvedValueOnce(null);

    await expect(groupService.updateGroup('g1', 'u1', { name: 'X' })).rejects.toHaveProperty(
      'code',
      'NOT_FOUND',
    );
  });

  test('closeGroup - group missing after permission check', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    mockGetDoc.mockResolvedValueOnce(null);

    await expect(groupService.closeGroup('g1', 'u1')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('getMembers - skips members without user record', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    mockGetQuery.mockResolvedValueOnce([
      { userId: 'm1', role: 'member', joinedAt: new Date() },
      { userId: 'ghost', role: 'member', joinedAt: new Date() },
    ]);
    mockGetDoc
      .mockResolvedValueOnce({ id: 'm1', displayName: 'M1', email: 'm1@x', avatarUrl: null })
      .mockResolvedValueOnce(null);

    const res = await groupService.getMembers('g1', 'u1');
    expect(res).toHaveLength(1);
  });

  test('addMember - insufficient permissions for regular member', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'member', isActive: true });
    await expect(groupService.addMember('g1', 'u1', 'target', 'member')).rejects.toHaveProperty(
      'code',
      'FORBIDDEN',
    );
  });

  test('removeMember - member not found', async () => {
    mockGetDoc.mockResolvedValueOnce({ userId: 'u1', role: 'owner', isActive: true });
    mockGetDoc.mockResolvedValueOnce(null);
    await expect(groupService.removeMember('g1', 'u1', 'ghost')).rejects.toHaveProperty(
      'code',
      'NOT_FOUND',
    );
  });
});
