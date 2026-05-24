import { jest } from '@jest/globals';

const mockGetFirstByField: any = jest.fn();
const mockGetDoc: any = jest.fn();
const mockDocRef: any = jest.fn(() => ({ set: jest.fn() }));
const mockCreateId: any = jest.fn(() => 'id-1');
const mockVerifyToken: any = jest.fn(() => ({ userId: 'u1' }));

jest.mock('@/lib/firestore-db', () => ({
  collectionNames: { users: 'users', subscriptions: 'subscriptions' },
  getFirstByField: (...a: any[]) => mockGetFirstByField(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  docRef: (...a: any[]) => mockDocRef(...a),
  createId: () => mockCreateId(),
  collectionRef: () => ({ firestore: { batch: () => ({ set: jest.fn(), commit: () => Promise.resolve(undefined) }) } }),
  cleanForFirestore: (v: any) => v,
  subscriptionId: (u: string) => u,
}));

jest.mock('@/lib/jwt', () => ({ signAccessToken: () => 'at', signRefreshToken: () => 'rt', verifyToken: (...a: any[]) => mockVerifyToken(...a) }));
jest.mock('@/lib/password', () => ({ hashPassword: (p: string) => `hash:${p}`, verifyPassword: (p: string, h: string) => h === `hash:${p}` }));
jest.mock('@/lib/entitlement', () => ({ isUserPremium: () => false }));

import * as authService from '@/modules/auth/auth.service';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyToken.mockImplementation(() => ({ userId: 'u1' }));
  });

  test('syncFirebaseUser - existing by firebaseUid updates', async () => {
    mockGetFirstByField.mockResolvedValueOnce({ id: 'u1', firebaseUid: 'f1', email: 'a@x' });
    const res = await authService.syncFirebaseUser({ firebaseUid: 'f1', email: 'a@x' });
    expect(res.id).toBe('u1');
  });

  test('syncFirebaseUser - existing by email links', async () => {
    mockGetFirstByField.mockResolvedValueOnce(null); // by firebaseUid
    mockGetFirstByField.mockResolvedValueOnce({ id: 'u2', email: 'b@x' }); // by email
    const res = await authService.syncFirebaseUser({ firebaseUid: 'f2', email: 'b@x' });
    expect(res.id).toBe('u2');
  });

  test('syncFirebaseUser - creates new user when none exist', async () => {
    mockGetFirstByField.mockResolvedValue(null);
    mockGetDoc.mockResolvedValue(null);
    const res = await authService.syncFirebaseUser({ firebaseUid: 'newf', email: 'new@x', displayName: 'New' });
    expect(res).toHaveProperty('id');
  });

  test('login - invalid credentials throws', async () => {
    mockGetFirstByField.mockResolvedValue(null);
    await expect(authService.login({ email: 'no@x', password: 'pw' })).rejects.toHaveProperty('code', 'UNAUTHORIZED');
  });

  test('register - success returns tokens and user', async () => {
    mockGetFirstByField.mockResolvedValue(null);
    const res = await authService.register({ email: 'a@x', displayName: 'A', password: 'pw' });
    expect(res.accessToken).toBe('at');
    expect(res.refreshToken).toBe('rt');
    expect(res.user.email).toBe('a@x');
  });

  test('getCurrentUser - not found', async () => {
    mockGetDoc.mockResolvedValue(null);
    await expect(authService.getCurrentUser('u1')).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  test('refreshToken - invalid token throws unauthorized', async () => {
    mockVerifyToken.mockImplementation(() => {
      throw new Error('invalid');
    });
    await expect(authService.refreshToken('bad')).rejects.toHaveProperty('code', 'UNAUTHORIZED');
  });
});
