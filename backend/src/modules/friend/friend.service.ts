import {
  collectionRef,
  collectionNames,
  createId,
  docRef,
  cleanForFirestore,
  getFirstByField,
  getQuery,
  PublicUser,
  publicUserMap,
  getDoc,
} from "../../lib/firestore-db";
import { NotFoundError, ConflictError, ValidationError } from "../../lib/errors";

export async function sendFriendRequest(fromUserId: string, toEmail: string) {
  const to = await getFirstByField<any>(collectionNames.users, "email", toEmail.toLowerCase());
  if (!to) throw new NotFoundError("User not found");
  if (to.id === fromUserId) throw new ValidationError("Cannot send friend request to yourself");

  const existingFriendshipA = await getQuery<any>(
    collectionRef(collectionNames.friendships)
      .where("userIdA", "==", fromUserId)
      .where("userIdB", "==", to.id)
      .limit(1),
  );
  const existingFriendshipB = await getQuery<any>(
    collectionRef(collectionNames.friendships)
      .where("userIdA", "==", to.id)
      .where("userIdB", "==", fromUserId)
      .limit(1),
  );
  if (existingFriendshipA.length > 0 || existingFriendshipB.length > 0) {
    throw new ConflictError("Already friends");
  }

  const existing = await getQuery<any>(
    collectionRef(collectionNames.friendRequests)
      .where("fromUserId", "==", fromUserId)
      .where("toUserId", "==", to.id)
      .limit(1),
  );
  if (existing.length > 0) {
    const ex = existing[0];
    if (ex.status === "pending") {
      throw new ConflictError("Friend request already sent");
    }
    // Accepted/rejected/cancelled requests are historical records only; allow a new request.
  }

  const id = createId();
  const doc = {
    id,
    fromUserId,
    toUserId: to.id,
    status: "pending",
    createdAt: new Date(),
  };

  await docRef(collectionNames.friendRequests, id).set(cleanForFirestore(doc));
  return doc;
}

export async function acceptFriendRequest(userId: string, requestId: string) {
  const reqDoc = await getDoc<any>(collectionNames.friendRequests, requestId);
  if (!reqDoc) throw new NotFoundError("Friend request not found");
  if (reqDoc.toUserId !== userId) throw new ValidationError("Not authorized to accept this request");
  if (reqDoc.status !== "pending") throw new ValidationError("Request is not pending");

  const updated = { ...reqDoc, status: "accepted", respondedAt: new Date() };
  await docRef(collectionNames.friendRequests, requestId).set(cleanForFirestore(updated));

  // create friendship record
  const friendshipId = createId();
  const friendship = {
    id: friendshipId,
    userIdA: reqDoc.fromUserId,
    userIdB: reqDoc.toUserId,
    createdAt: new Date(),
  };
  await docRef(collectionNames.friendships, friendshipId).set(cleanForFirestore(friendship));

  return { request: updated, friendship };
}

export async function listFriends(userId: string) {
  const a = await getQuery(collectionRef(collectionNames.friendships).where("userIdA", "==", userId));
  const b = await getQuery(collectionRef(collectionNames.friendships).where("userIdB", "==", userId));
  const ids = new Set<string>();
  a.forEach((f: any) => ids.add(f.userIdB));
  b.forEach((f: any) => ids.add(f.userIdA));

  const idsArr = Array.from(ids);
  const map = await publicUserMap(idsArr);
  const items: PublicUser[] = idsArr.map((id) => map.get(id)!).filter(Boolean);
  return items;
}

export async function listIncomingRequests(userId: string) {
  const items = await getQuery(collectionRef(collectionNames.friendRequests).where("toUserId", "==", userId).where("status", "==", "pending"));
  const fromIds = items.map((it: any) => it.fromUserId);
  const map = await publicUserMap(fromIds);

  return items.map((it: any) => ({
    ...it,
    fromUser: map.get(it.fromUserId) ?? null,
  }));
}

export async function rejectOrCancelFriendRequest(userId: string, requestId: string) {
  const reqDoc = await getDoc<any>(collectionNames.friendRequests, requestId);
  if (!reqDoc) throw new NotFoundError("Friend request not found");
  if (reqDoc.status !== "pending") throw new ValidationError("Request is not pending");

  // allow either sender (to cancel) or recipient (to reject)
  if (reqDoc.fromUserId !== userId && reqDoc.toUserId !== userId) {
    throw new ValidationError("Not authorized to cancel/reject this request");
  }

  const updated = { ...reqDoc, status: "rejected", respondedAt: new Date() };
  await docRef(collectionNames.friendRequests, requestId).set(cleanForFirestore(updated));
  return updated;
}

export async function removeFriend(userId: string, friendId: string) {
  // find friendship documents where (userIdA == userId && userIdB == friendId) or swapped
  const a = await getQuery(
    collectionRef(collectionNames.friendships).where("userIdA", "==", userId).where("userIdB", "==", friendId),
  );
  const b = await getQuery(
    collectionRef(collectionNames.friendships).where("userIdA", "==", friendId).where("userIdB", "==", userId),
  );

  const docs = [...a, ...b];
  if (docs.length === 0) {
    throw new NotFoundError("Friendship not found");
  }

  const batch = collectionRef(collectionNames.friendships).firestore.batch();
  docs.forEach((d: any) => batch.delete(docRef(collectionNames.friendships, d.id)));
  await batch.commit();

  return { removed: docs.map((d: any) => d.id) };
}

export default {};
