import { NotFoundError } from "../../lib/errors";
import {
  Balance,
  balanceId,
  collectionNames,
  collectionRef,
  getDoc,
  getPublicUser,
  getQuery,
  groupMemberId,
  GroupMember,
} from "../../lib/firestore-db";

export async function getBalances(groupId: string, userId: string) {
  await assertActiveMember(groupId, userId);

  const balances = await getQuery<Balance>(
    collectionRef(collectionNames.balances).where("groupId", "==", groupId),
  );

  const enriched = await Promise.all(
    balances.map(async (balance) => ({
      ...balance,
      user: await getPublicUser(balance.userId),
    })),
  );

  return enriched.sort((a, b) => b.balance - a.balance);
}

export async function getMyBalance(groupId: string, userId: string) {
  await assertActiveMember(groupId, userId);

  const balance = await getDoc<Balance>(
    collectionNames.balances,
    balanceId(groupId, userId),
  );

  if (!balance) {
    return {
      groupId,
      userId,
      balance: 0,
      user: null,
    };
  }

  return {
    ...balance,
    user: await getPublicUser(userId),
  };
}

async function assertActiveMember(groupId: string, userId: string) {
  const membership = await getDoc<GroupMember>(
    collectionNames.groupMembers,
    groupMemberId(groupId, userId),
  );
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
}
