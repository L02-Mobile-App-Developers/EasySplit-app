import crypto from "crypto";
import {
  CollectionReference,
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import { getFirestoreDb } from "./firebase-admin";

export const collectionNames = {
  users: "users",
  subscriptions: "subscriptions",
  groups: "groups",
  groupMembers: "group_members",
  friendRequests: "friend_requests",
  friendships: "friendships",
  expenses: "expenses",
  balances: "balances",
  settlements: "settlements",
  reminders: "reminders",
  auditLogs: "audit_logs",
  idempotencyKeys: "idempotency_keys",
} as const;

export type CollectionName =
  (typeof collectionNames)[keyof typeof collectionNames];

export interface AppUser {
  id: string;
  firebaseUid?: string | null;
  displayName: string;
  email: string | null;
  passwordHash?: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  category: string;
  ownerId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface ExpenseParticipant {
  userId: string;
  value: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitMode: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  participants: ExpenseParticipant[];
}

export interface Balance {
  groupId: string;
  userId: string;
  balance: number;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface Reminder {
  id: string;
  groupId: string;
  targetUserId: string;
  type: string;
  status: string;
  message: string;
  channel: string;
  scheduledAt: Date;
  createdBy: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown | null;
  after: unknown | null;
  requestId: string | null;
  createdAt: Date;
}

export interface IdempotencyKey {
  id: string;
  userId: string;
  key: string;
  method: string;
  path: string;
  requestHash: string;
  responseBody: unknown | null;
  statusCode: number | null;
  state: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface PublicUser {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl?: string | null;
}

export function createId(): string {
  return crypto.randomUUID();
}

export function groupMemberId(groupId: string, userId: string): string {
  return `${groupId}_${userId}`;
}

export function balanceId(groupId: string, userId: string): string {
  return `${groupId}_${userId}`;
}

export function subscriptionId(userId: string): string {
  return userId;
}

export function idempotencyId(userId: string, key: string): string {
  return crypto.createHash("sha256").update(`${userId}\0${key}`).digest("hex");
}

export function collectionRef(name: CollectionName): CollectionReference {
  return getFirestoreDb().collection(name);
}

export function docRef(name: CollectionName, id: string) {
  return collectionRef(name).doc(id);
}

export function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  return new Date(0);
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        normalizeValue(entry),
      ]),
    );
  }
  return value;
}

function cleanValueForFirestore(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cleanValueForFirestore);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, cleanValueForFirestore(entry)]),
    );
  }
  return null;
}

export function cleanForFirestore(value: unknown): Record<string, unknown> {
  return cleanValueForFirestore(value) as Record<string, unknown>;
}

export function docData<T>(snapshot: DocumentSnapshot): T | null {
  if (!snapshot.exists) {
    return null;
  }
  const data = normalizeValue(snapshot.data() ?? {}) as Record<string, unknown>;
  return {
    id: data.id ?? snapshot.id,
    ...data,
  } as T;
}

export function queryDocData<T>(snapshot: QueryDocumentSnapshot): T {
  const data = normalizeValue(snapshot.data() ?? {}) as Record<string, unknown>;
  return {
    id: data.id ?? snapshot.id,
    ...data,
  } as T;
}

export async function getDoc<T>(
  name: CollectionName,
  id: string,
): Promise<T | null> {
  return docData<T>(await docRef(name, id).get());
}

export async function getDocInTransaction<T>(
  transaction: Transaction,
  name: CollectionName,
  id: string,
): Promise<T | null> {
  return docData<T>(await transaction.get(docRef(name, id)));
}

export async function getQuery<T>(query: Query): Promise<T[]> {
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => queryDocData<T>(doc));
}

export async function getQueryInTransaction<T>(
  transaction: Transaction,
  query: Query,
): Promise<T[]> {
  const snapshot = await transaction.get(query);
  return snapshot.docs.map((doc) => queryDocData<T>(doc));
}

export async function getFirstByField<T>(
  name: CollectionName,
  field: string,
  value: string,
): Promise<T | null> {
  const snapshot = await collectionRef(name).where(field, "==", value).limit(1).get();
  const [first] = snapshot.docs;
  return first ? queryDocData<T>(first) : null;
}

export async function getPublicUser(userId: string): Promise<PublicUser | null> {
  const user = await getDoc<AppUser>(collectionNames.users, userId);
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

export async function publicUserMap(
  userIds: Iterable<string>,
): Promise<Map<string, PublicUser>> {
  const uniqueIds = [...new Set(userIds)];
  const entries = await Promise.all(
    uniqueIds.map(async (userId) => [userId, await getPublicUser(userId)] as const),
  );

  return new Map(
    entries
      .filter((entry): entry is readonly [string, PublicUser] => entry[1] !== null)
      .map(([userId, user]) => [userId, user]),
  );
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): { items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } } {
  const total = items.length;
  const start = (page - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function sortByDateDesc<T>(
  items: T[],
  selector: (item: T) => Date,
): T[] {
  return [...items].sort((a, b) => selector(b).getTime() - selector(a).getTime());
}
