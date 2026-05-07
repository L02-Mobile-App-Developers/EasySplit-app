import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";

export async function getBalances(groupId: string, userId: string) {
  // Verify the requesting user is a group member
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }

  const balances = await prisma.balance.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { balance: "desc" },
  });

  return balances;
}

export async function getMyBalance(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }

  const balance = await prisma.balance.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!balance) {
    return {
      groupId,
      userId,
      balance: 0,
      user: null,
    };
  }

  return balance;
}
