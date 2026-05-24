import { jest } from '@jest/globals';

const mockGetQuery: any = jest.fn();
const mockCollectionRef: any = jest.fn();

jest.mock('@/lib/firestore-db', () => ({
  collectionRef: () => mockCollectionRef(),
  collectionNames: { users: 'users' },
  getQuery: (...a: any[]) => mockGetQuery(...a),
  paginate: (items: any[], page: number, limit: number) => ({ items: items.slice((page-1)*limit, (page-1)*limit+limit), pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length/limit) } }),
}));

import * as usersService from '@/modules/users/users.service';

describe('users.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('searchUsers - returns all when no query', async () => {
    const users = [
      { id: 'u1', displayName: 'Alice', email: 'alice@example.com' },
      { id: 'u2', displayName: 'Bob', email: 'bob@example.com' },
    ];
    mockGetQuery.mockResolvedValue(users);

    const res = await usersService.searchUsers(undefined, 1, 10);
    expect(res.items.length).toBe(2);
    expect(res.pagination.total).toBe(2);
  });

  test('searchUsers - filters by query and excludes user', async () => {
    const users = [
      { id: 'u1', displayName: 'Alice', email: 'alice@example.com' },
      { id: 'u2', displayName: 'Bob', email: 'bob@example.com' },
      { id: 'u3', displayName: 'Carol', email: 'carol@test.com' },
    ];
    mockGetQuery.mockResolvedValue(users);

    const res = await usersService.searchUsers('carol', 1, 10, 'u2');
    expect(res.items.length).toBe(1);
    expect(res.items[0].id).toBe('u3');
  });
});
