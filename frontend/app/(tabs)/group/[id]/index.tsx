import TopAppBar from "@/components/TopAppBar";
import {
  AntDesign,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { balanceService } from "@/api/services/balance.service";
import { expenseService } from "@/api/services/expense.service";
import { groupService } from "@/api/services/group.service";
import { settlementService } from "@/api/services/settlement.service";

import type { Balance } from "@/api/types/balance";
import type { Expense } from "@/api/types/expense";
import type { Group, GroupMember } from "@/api/types/group";
import type { DebtEdge } from "@/api/types/settlement";

import { useAuthStore } from "@/store/auth.store";

const currency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const currentUser = useAuthStore((state) => state.user);

  const [group, setGroup] = useState<Group>();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [myBalance, setMyBalance] = useState<Balance>();

  const [memberToPay, setMemberToPay] = useState<DebtEdge[]>([]);
  const [debts, setDebts] = useState<DebtEdge[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [groupData, membersData, expensePage, balanceData, debtData] =
          await Promise.all([
            groupService.getGroup(id),
            groupService.getGroupMembers(id),
            expenseService.getExpenses(id),
            balanceService.getMyBalance(id),
            settlementService.getDebts(id),
          ]);

        setGroup(groupData);
        setMembers(membersData);
        setExpenses(expensePage.items);
        setMyBalance(balanceData);
        setDebts(debtData);

        const filtered = debtData.filter(
          (item) => item.fromUser?.id === currentUser?.id,
        );

        setMemberToPay(filtered);
      } catch (error) {
        console.error("Failed to load group detail:", error);
      }
    };

    fetchData();
  }, [id]);

  const debtHighlights = useMemo(() => {
    if (!currentUser) {
      return { owe: 0, receive: 0 };
    }

    return debts.reduce(
      (accumulator, debt) => {
        if (debt.fromUserId === currentUser.id) {
          accumulator.owe += debt.amount;
        }

        if (debt.toUserId === currentUser.id) {
          accumulator.receive += debt.amount;
        }

        return accumulator;
      },
      { owe: 0, receive: 0 },
    );
  }, [currentUser, debts]);

  return (
    <View style={styles.screen}>
      <TopAppBar title="Chi tiết nhóm" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        {/* HERO */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{group?.category ?? "GROUP"}</Text>
            </View>

            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {group?.status ?? "ACTIVE"}
              </Text>
            </View>
          </View>

          <View style={styles.heroCenter}>
            <Image
              source={{
                uri: "https://randomuser.me/api/portraits/men/1.jpg",
              }}
              style={styles.groupImage}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{group?.name ?? "Đang tải..."}</Text>

              <Text style={styles.subtitle}>
                {group?.memberCount ?? 0} thành viên
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Bạn đang nợ</Text>

              <Text style={[styles.statValue, styles.debtValue]}>
                {currency(debtHighlights.owe)}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Bạn được nhận</Text>

              <Text style={[styles.statValue, styles.receiveValue]}>
                {currency(debtHighlights.receive)}
              </Text>
            </View>
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Số dư của bạn</Text>

            <Text
              style={[
                styles.balanceValue,
                {
                  color: (myBalance?.balance ?? 0) >= 0 ? "#0F5E28" : "#DC2626",
                },
              ]}
            >
              {(myBalance?.balance ?? 0) >= 0 ? "+" : ""}
              {currency(myBalance?.balance ?? 0)}
            </Text>
          </View>
        </View>

        {/* ACTION */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => router.push(`/group/${id}/add-expense`)}
            style={styles.actionButtonPrimary}
          >
            <MaterialIcons name="add-card" size={18} color="#FFFFFF" />

            <Text style={styles.actionButtonPrimaryText}>Thêm khoản chi</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/group/${id}/pay`)}
            style={styles.actionButtonSecondary}
          >
            <MaterialCommunityIcons
              name="cash-multiple"
              size={18}
              color="#0F5E28"
            />

            <Text style={styles.actionButtonSecondaryText}>Thanh toán</Text>
          </Pressable>
        </View>

        {/* PAY DEBT */}
        {memberToPay.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trả nợ</Text>

              <Text style={styles.sectionCount}>{memberToPay.length}</Text>
            </View>

            <View style={styles.memberList}>
              {memberToPay.map((user) => (
                <View
                  key={`${user.fromUserId}-${user.toUserId}`}
                  style={styles.debtRow}
                >
                  <View style={styles.debtUser}>
                    <Image
                      source={{
                        uri:
                          user.toUser?.avatarUrl ||
                          "https://randomuser.me/api/portraits/men/1.jpg",
                      }}
                      style={styles.debtAvatar}
                    />

                    <View>
                      <Text style={styles.memberName}>
                        {user.toUser?.displayName}
                      </Text>

                      <Text style={styles.debtAmount}>
                        {currency(user.amount)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.payButton}>
                    <Text style={styles.payButtonText}>Trả nợ</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* EXPENSE */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Khoản chi gần đây</Text>

            <Text style={styles.sectionCount}>{expenses.length}</Text>
          </View>

          <View style={styles.expenseList}>
            {expenses.map((expense) => (
              <TouchableOpacity
                key={expense.id}
                onPress={() =>
                  router.push(`/group/${id}/expense/${expense.id}`)
                }
                style={styles.expenseRow}
              >
                <View style={styles.expenseIcon}>
                  <AntDesign name="credit-card" size={18} color="#0F5E28" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseName}>{expense.description}</Text>

                  <Text style={styles.expenseMeta}>
                    {expense.payer?.displayName} •{" "}
                    {expense.participants?.length} người
                  </Text>
                </View>

                <Text style={styles.expenseAmount}>
                  {currency(expense.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* MEMBERS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thành viên nhóm</Text>

            <Text style={styles.sectionCount}>{members.length} người</Text>
          </View>

          <View style={styles.memberList}>
            {members.map((member) => (
              <View key={member.userId} style={styles.memberRow}>
                {member.avatarUrl ? (
                  <Image
                    source={{ uri: member.avatarUrl }}
                    style={styles.memberAvatarImage}
                  />
                ) : (
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.displayName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.displayName}</Text>

                  <Text style={styles.memberMeta}>{member.email}</Text>
                </View>

                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{member.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },

  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 32,
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 18,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  badge: {
    backgroundColor: "#EAF6EE",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  badgeText: {
    color: "#0F5E28",
    fontWeight: "800",
    fontSize: 12,
  },

  statusPill: {
    backgroundColor: "#F0F9F3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  statusPillText: {
    color: "#0F5E28",
    fontWeight: "800",
    fontSize: 12,
  },

  heroCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  groupImage: {
    width: 74,
    height: 74,
    borderRadius: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    color: "#6B7280",
    marginTop: 4,
  },

  statRow: {
    flexDirection: "row",
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#F7F9F7",
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },

  statLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
  },

  statValue: {
    fontSize: 14,
    fontWeight: "800",
  },

  debtValue: {
    color: "#DC2626",
  },

  receiveValue: {
    color: "#0F5E28",
  },

  balanceCard: {
    backgroundColor: "#F0F9F3",
    borderRadius: 20,
    padding: 16,
  },

  balanceLabel: {
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 6,
  },

  balanceValue: {
    fontSize: 22,
    fontWeight: "800",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  actionButtonPrimary: {
    flex: 1,
    backgroundColor: "#0F5E28",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  actionButtonPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  actionButtonSecondary: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  actionButtonSecondaryText: {
    color: "#0F172A",
    fontWeight: "800",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },

  sectionCount: {
    color: "#6B7280",
    fontWeight: "700",
  },

  memberList: {
    gap: 12,
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF6EE",
    justifyContent: "center",
    alignItems: "center",
  },

  memberAvatarText: {
    color: "#0F5E28",
    fontWeight: "800",
  },

  memberAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  memberName: {
    color: "#0F172A",
    fontWeight: "800",
  },

  memberMeta: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },

  roleBadge: {
    backgroundColor: "#F0F9F3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  roleBadgeText: {
    color: "#0F5E28",
    fontWeight: "700",
    fontSize: 12,
  },

  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF1F2",
    borderRadius: 18,
    padding: 12,
  },

  debtUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  debtAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  debtAmount: {
    color: "#DC2626",
    fontWeight: "700",
    marginTop: 2,
  },

  payButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },

  payButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  expenseList: {
    gap: 10,
  },

  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },

  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#EAF6EE",
    justifyContent: "center",
    alignItems: "center",
  },

  expenseName: {
    color: "#0F172A",
    fontWeight: "800",
  },

  expenseMeta: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },

  expenseAmount: {
    color: "#0F5E28",
    fontWeight: "800",
  },
});
