import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import TopAppBar from "@/components/TopAppBar";
import { expenseService } from "@/api/services/expense.service";
import { groupService } from "@/api/services/group.service";
import { settlementService } from "@/api/services/settlement.service";
import { useAuthStore } from "@/store/auth.store";
import type { Group, GroupMember } from "@/api/types/group";
import type { DebtEdge } from "@/api/types/settlement";
import type { Expense } from "@/api/types/expense";

const currency = (value: number) => `${value.toLocaleString("vi-VN")} VND`;

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [debts, setDebts] = useState<DebtEdge[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const loadGroup = async () => {
      try {
        const [groupData, membersData, debtsData, expensePage] = await Promise.all([
          groupService.getGroup(id),
          groupService.getGroupMembers(id),
          settlementService.getDebts(id),
          expenseService.getExpenses(id),
        ]);

        setGroup(groupData);
        setMembers(membersData);
        setDebts(debtsData);
        setExpenses(expensePage.items);
      } catch (error) {
        console.error("Failed to load group detail", error);
      }
    };

    loadGroup();
  }, [id]);

  const myBalance = useMemo(() => {
    if (!currentUser) {
      return 0;
    }

    return debts.reduce((total, debt) => {
      if (debt.fromUserId === currentUser.id) {
        return total - debt.amount;
      }
      if (debt.toUserId === currentUser.id) {
        return total + debt.amount;
      }
      return total;
    }, 0);
  }, [currentUser, debts]);

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

  const openExpense = () => {
    if (id) {
      router.push(`/group/${id}/add-expense`);
    }
  };

  return (
    <View style={styles.screen}>
      <TopAppBar title="Chi tiết nhóm" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>{group?.category ?? "group"}</Text></View>
            <View style={styles.statusPill}><Text style={styles.statusPillText}>{group?.status ?? "active"}</Text></View>
          </View>
          <Text style={styles.title}>{group?.name ?? "Nhóm của bạn"}</Text>
          <Text style={styles.subtitle}>Tổng quan nhóm, nợ và các khoản chi gần đây đều được gom vào cùng một màn.</Text>

          <View style={styles.statRow}>
            <View style={styles.statCard}><Text style={styles.statLabel}>Thành viên</Text><Text style={styles.statValue}>{group?.memberCount ?? members.length}</Text></View>
            <View style={styles.statCard}><Text style={styles.statLabel}>Bạn đang nợ</Text><Text style={[styles.statValue, styles.debtValue]}>{currency(debtHighlights.owe)}</Text></View>
            <View style={styles.statCard}><Text style={styles.statLabel}>Bạn được nhận</Text><Text style={[styles.statValue, styles.receiveValue]}>{currency(debtHighlights.receive)}</Text></View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={openExpense} style={styles.actionButtonPrimary}>
            <MaterialIcons name="add-card" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonPrimaryText}>Thêm khoản chi</Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/group/${id}/pay/1`)} style={styles.actionButtonSecondary}>
            <MaterialIcons name="payments" size={18} color="#0F5E28" />
            <Text style={styles.actionButtonSecondaryText}>Thanh toán</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Số dư của bạn</Text>
            <Text style={myBalance >= 0 ? styles.balancePositive : styles.balanceNegative}>{currency(Math.abs(myBalance))}</Text>
          </View>
          <Text style={styles.sectionDescription}>Số tiền đang phản ánh nợ và tiền được nhận trong nhóm hiện tại.</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thành viên</Text>
            <Text style={styles.sectionCount}>{members.length} người</Text>
          </View>
          <View style={styles.memberList}>
            {members.map((member) => (
              <View key={member.userId} style={styles.memberRow}>
                <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{member.displayName.slice(0, 1).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.displayName}</Text>
                  <Text style={styles.memberMeta}>{member.email}</Text>
                </View>
                <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{member.role}</Text></View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Khoản chi gần đây</Text>
            <Text style={styles.sectionCount}>{expenses.length}</Text>
          </View>
          <View style={styles.expenseList}>
            {expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseRow}>
                <View style={styles.expenseIcon}><AntDesign name="creditcard" size={18} color="#0F5E28" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseName}>{expense.description}</Text>
                  <Text style={styles.expenseMeta}>{expense.splitMode} • {expense.participants.length} người</Text>
                </View>
                <Text style={styles.expenseAmount}>{currency(expense.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.helperCard}>
          <MaterialIcons name="info-outline" size={20} color="#6B7280" />
          <Text style={styles.helperText}>Màn này giữ logic gọi API cũ nhưng giao diện đã đổi sang khối thẻ rõ ràng hơn.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7F4" },
  content: { padding: 20, gap: 14 },
  heroCard: { backgroundColor: "#FFFFFF", borderRadius: 28, padding: 18, gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2 },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { alignSelf: "flex-start", backgroundColor: "#EAF6EE", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#0F5E28", fontWeight: "800", fontSize: 12 },
  statusPill: { borderRadius: 999, backgroundColor: "#F0F9F3", paddingHorizontal: 12, paddingVertical: 6 },
  statusPillText: { color: "#0F5E28", fontWeight: "800", fontSize: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#6B7280", lineHeight: 20 },
  statRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: "#F7F9F7", borderRadius: 18, padding: 12, gap: 4 },
  statLabel: { color: "#6B7280", fontSize: 12, fontWeight: "700" },
  statValue: { color: "#0F172A", fontWeight: "800", fontSize: 14 },
  debtValue: { color: "#DC2626" },
  receiveValue: { color: "#0F5E28" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionButtonPrimary: { flex: 1, backgroundColor: "#0F5E28", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionButtonPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  actionButtonSecondary: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#D1D5DB" },
  actionButtonSecondaryText: { color: "#0F172A", fontWeight: "800" },
  sectionCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  sectionCount: { color: "#6B7280", fontWeight: "700" },
  sectionDescription: { color: "#6B7280", lineHeight: 20 },
  balancePositive: { color: "#0F5E28", fontWeight: "800", fontSize: 18 },
  balanceNegative: { color: "#DC2626", fontWeight: "800", fontSize: 18 },
  memberList: { gap: 10 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EAF6EE", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { color: "#0F5E28", fontWeight: "800" },
  memberName: { color: "#0F172A", fontWeight: "800" },
  memberMeta: { color: "#6B7280", fontSize: 12 },
  roleBadge: { backgroundColor: "#F0F9F3", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  roleBadgeText: { color: "#0F5E28", fontWeight: "700", fontSize: 12 },
  expenseList: { gap: 10 },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  expenseIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#EAF6EE", alignItems: "center", justifyContent: "center" },
  expenseName: { color: "#0F172A", fontWeight: "800" },
  expenseMeta: { color: "#6B7280", fontSize: 12 },
  expenseAmount: { color: "#0F5E28", fontWeight: "800" },
  helperCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14 },
  helperText: { flex: 1, color: "#6B7280" },
});