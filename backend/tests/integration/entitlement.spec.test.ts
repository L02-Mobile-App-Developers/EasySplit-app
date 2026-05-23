import { cleanDatabase, closeConnection, prisma } from "../helpers/setup";
import { addMember, createGroup, createUser } from "../helpers/factory";

const groupService = require("../../src/modules/group/group.service") as typeof import("../../src/modules/group/group.service");
const reminderService = require("../../src/modules/reminder/reminder.service") as typeof import("../../src/modules/reminder/reminder.service");
const settlementService = require("../../src/modules/settlement/settlement.service") as typeof import("../../src/modules/settlement/settlement.service");
const activityService = require("../../src/modules/activity/activity.service") as typeof import("../../src/modules/activity/activity.service");

describe("entitlement consistency", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it("expired premium owner cannot bypass free group limit", async () => {
    const owner = await createUser({ email: `owner_${Date.now()}_${Math.random()}@example.com` });

    await prisma.subscription.update({
      where: { userId: owner.id },
      data: { plan: "premium", status: "expired" },
    });

    await Promise.all([
      createGroup(owner.id, { name: "Group 1" }),
      createGroup(owner.id, { name: "Group 2" }),
      createGroup(owner.id, { name: "Group 3" }),
    ]);

    await expect(
      groupService.createGroup(owner.id, {
        name: "Group 4",
        category: "trip",
      }),
    ).rejects.toMatchObject({ code: "FREE_QUOTA_EXCEEDED" });
  });

  it("free user exceeding smart settle quota receives FREE_QUOTA_EXCEEDED", async () => {
    const user = await createUser({ email: `user_${Date.now()}_${Math.random()}@example.com` });
    const group = await createGroup(user.id);

    await prisma.auditLog.createMany({
      data: [
        {
          actorUserId: user.id,
          action: "smart_settle",
          entityType: "group",
          entityId: group.id,
        },
        {
          actorUserId: user.id,
          action: "smart_settle",
          entityType: "group",
          entityId: group.id,
        },
        {
          actorUserId: user.id,
          action: "smart_settle",
          entityType: "group",
          entityId: group.id,
        },
      ],
    });

    await expect(
      settlementService.generateSmartSettle(group.id, user.id),
    ).rejects.toMatchObject({ code: "FREE_QUOTA_EXCEEDED" });
  });

  it("premium owner unlocks group premium features for members", async () => {
    const owner = await createUser({ email: `owner_${Date.now()}_${Math.random()}@example.com` });
    const member = await createUser({ email: `member_${Date.now()}_${Math.random()}@example.com` });
    const group = await createGroup(owner.id);

    await prisma.subscription.update({
      where: { userId: owner.id },
      data: { plan: "premium", status: "active" },
    });
    await addMember(group.id, member.id);
    await prisma.balance.create({
      data: { groupId: group.id, userId: member.id, balance: -10000 },
    });

    const reminders = await reminderService.createReminder(group.id, member.id, {
      targetUserIds: [member.id],
      messageTemplate: "pay_up",
    });

    expect(reminders).toHaveLength(1);
  });

  it("history free limit uses group owner entitlement", async () => {
    const owner = await createUser({ email: `owner_${Date.now()}_${Math.random()}@example.com` });
    const member = await createUser({ email: `member_${Date.now()}_${Math.random()}@example.com` });
    const group = await createGroup(owner.id);
    await addMember(group.id, member.id);

    await prisma.subscription.update({
      where: { userId: member.id },
      data: { plan: "premium", status: "active" },
    });

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 120);

    await prisma.auditLog.create({
      data: {
        actorUserId: owner.id,
        action: "expense_created",
        entityType: "group",
        entityId: group.id,
        createdAt: oldDate,
      },
    });

    const freeOwnerHistory = await activityService.getHistory(group.id, member.id, {
      from: oldDate.toISOString(),
    });

    expect(freeOwnerHistory.items).toHaveLength(0);
    expect(freeOwnerHistory.meta.historyDays).toBe(90);

    await prisma.subscription.update({
      where: { userId: owner.id },
      data: { plan: "premium", status: "active" },
    });

    const premiumOwnerHistory = await activityService.getHistory(group.id, member.id, {
      from: oldDate.toISOString(),
    });

    expect(premiumOwnerHistory.items).toHaveLength(1);
    expect(premiumOwnerHistory.meta.historyDays).toBeNull();
  });
});
