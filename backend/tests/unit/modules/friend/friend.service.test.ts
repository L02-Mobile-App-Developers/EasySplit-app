import { jest } from '@jest/globals';

// Mocks typed as any to avoid TS spread/type inference issues
const mockGetFirstByField: any = jest.fn();
const mockGetQuery: any = jest.fn();
const mockCreateId: any = jest.fn(() => 'generated-id');
const mockDocRef: any = jest.fn(() => ({ set: jest.fn() }));
const mockCleanForFirestore: any = jest.fn((v: any) => v);
const mockPublicUserMap: any = jest.fn(async (ids: string[]) => new Map(ids.map((id) => [id, { id, displayName: `Name ${id}`, email: `${id}@x` }] )));
const mockGetDoc: any = jest.fn();

jest.mock('@/lib/firestore-db', () => ({
  collectionRef: () => ({ where() { return this; }, limit() { return this; } }),
  collectionNames: {
    users: 'users',
    friendRequests: 'friend_requests',
    friendships: 'friendships',
  },
  createId: () => mockCreateId(),
  docRef: () => mockDocRef(),
  cleanForFirestore: (v: any) => mockCleanForFirestore(v),
  getFirstByField: (...a: any[]) => mockGetFirstByField(...a),
  getQuery: (...a: any[]) => mockGetQuery(...a),
  publicUserMap: (...a: any[]) => mockPublicUserMap(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
}));

import * as friendService from '@/modules/friend/friend.service';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors';

describe('friend.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sendFriendRequest - success', async () => {
    mockGetFirstByField.mockResolvedValue({ id: 'user-b', email: 'b@x' });
    mockGetQuery.mockResolvedValue([]);

    const res = await friendService.sendFriendRequest('user-a', 'b@x');

    expect(res).toBeDefined();
    expect(res.fromUserId).toBe('user-a');
    expect(res.toUserId).toBe('user-b');
    expect(mockDocRef).toHaveBeenCalled();
  });

  test('sendFriendRequest - user not found', async () => {
    mockGetFirstByField.mockResolvedValue(null);
    await expect(friendService.sendFriendRequest('a', 'notfound@x')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('sendFriendRequest - cannot send to self', async () => {
    mockGetFirstByField.mockResolvedValue({ id: 'a', email: 'a@x' });
    await expect(friendService.sendFriendRequest('a', 'a@x')).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('sendFriendRequest - conflict existing', async () => {
    mockGetFirstByField.mockResolvedValue({ id: 'b', email: 'b@x' });
    mockGetQuery.mockResolvedValue([ { id: 'req1' } ]);
    await expect(friendService.sendFriendRequest('a', 'b@x')).rejects.toHaveProperty('code', 'CONFLICT');
  });

  test('acceptFriendRequest - success', async () => {
    const reqDoc = { id: 'r1', fromUserId: 'a', toUserId: 'b', status: 'pending' };
    mockGetDoc.mockResolvedValue(reqDoc);
    mockCreateId.mockReturnValue('friendship-1');

    const res = await friendService.acceptFriendRequest('b', 'r1');

    expect(res.request.status).toBe('accepted');
    expect(res.friendship.userIdA).toBe('a');
    expect(res.friendship.userIdB).toBe('b');
    expect(mockDocRef).toHaveBeenCalled();
  });

  test('acceptFriendRequest - not found', async () => {
    mockGetDoc.mockResolvedValue(null);
    await expect(friendService.acceptFriendRequest('b', 'r1')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('acceptFriendRequest - unauthorized', async () => {
    mockGetDoc.mockResolvedValue({ id: 'r1', fromUserId: 'a', toUserId: 'x', status: 'pending' });
    await expect(friendService.acceptFriendRequest('b', 'r1')).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('listFriends - returns mapped public users', async () => {
    mockGetQuery.mockImplementation((q: any) => Promise.resolve([{ userIdB: 'u2' }]));
    mockPublicUserMap.mockResolvedValue(new Map([['u2', { id: 'u2', displayName: 'Name u2', email: 'u2@x' }]]));

    const res = await friendService.listFriends('u1');
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].id).toBe('u2');
  });

  test('listIncomingRequests - returns items', async () => {
    const items = [{ id: 'r1', fromUserId: 'a', toUserId: 'b', status: 'pending' }];
    mockGetQuery.mockResolvedValue(items);
    const res = await friendService.listIncomingRequests('b');
    expect(res).toEqual(items);
  });

  test('rejectOrCancelFriendRequest - success by recipient', async () => {
    mockGetDoc.mockResolvedValue({ id: 'r1', fromUserId: 'a', toUserId: 'b', status: 'pending' });
    const res = await friendService.rejectOrCancelFriendRequest('b', 'r1');
    expect(res.status).toBe('rejected');
  });

  test('rejectOrCancelFriendRequest - unauthorized', async () => {
    mockGetDoc.mockResolvedValue({ id: 'r1', fromUserId: 'a', toUserId: 'b', status: 'pending' });
    await expect(friendService.rejectOrCancelFriendRequest('x', 'r1')).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });

  test('rejectOrCancelFriendRequest - not pending', async () => {
    mockGetDoc.mockResolvedValue({ id: 'r1', fromUserId: 'a', toUserId: 'b', status: 'accepted' });
    await expect(friendService.rejectOrCancelFriendRequest('b', 'r1')).rejects.toHaveProperty('code', 'VALIDATION_ERROR');
  });
});
