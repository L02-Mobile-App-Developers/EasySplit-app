import TopAppBar from "@/components/TopAppBar";
import {
  AntDesign,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { balanceService } from "@/api/services/balance.service";
import { expenseService } from "@/api/services/expense.service";
import { groupService } from "@/api/services/group.service";
import { reminderService } from "@/api/services/reminder.service";
import { settlementService } from "@/api/services/settlement.service";
import { activityService } from "@/api/services/activity.service";

import type { Balance } from "@/api/types/balance";
import type { Expense } from "@/api/types/expense";
import type { Group, GroupMember } from "@/api/types/group";
import type { DebtEdge } from "@/api/types/settlement";

import { useAuthStore } from "@/store/auth.store";
import { useGroupStore } from "@/store/group.store";
import { useHomeStore } from "@/store/home.store";

const currency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const darkGreen = "#0F5E28";

// Deterministic avatar generator fallback (uses pravatar with seed to remain stable)
const avatarFor = (seed?: string | number) => {
  const s = seed ? String(seed) : Math.random().toString(36).slice(2, 8);
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(s)}`;
};

export default function GroupDetailScreen() {
  const { id, refresh } = useLocalSearchParams<{ id: string; refresh?: string }>();
  const { width } = useWindowDimensions();
  const useStackedActions = width < 390;

  const currentUser = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);

  const [group, setGroup] = useState<Group>();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [myBalance, setMyBalance] = useState<Balance>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [refreshingDetail, setRefreshingDetail] = useState(false);

  const [memberToPay, setMemberToPay] = useState<DebtEdge[]>([]);
  const [memberOwed, setMemberOwed] = useState<DebtEdge[]>([]);
  const [debts, setDebts] = useState<DebtEdge[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [creatingReminders, setCreatingReminders] = useState<Record<string, boolean>>({});

  const cachedRole = useGroupStore((s) => (id ? s.roles[id as string] : undefined));
  const getGroupCacheEntry = useGroupStore((s) => s.getGroupCacheEntry);
  const setGroupCache = useGroupStore((s) => s.setGroupCache);

  const resetDetailState = () => {
    setGroup(undefined);
    setMembers([]);
    setExpenses([]);
    setMyBalance(undefined);
    setMemberToPay([]);
    setMemberOwed([]);
    setDebts([]);
    setHistory([]);
    setHistoryLoading(false);
    setReminders([]);
    setRemindersLoading(false);
  };

  useEffect(() => {
    if (!id) return;

    resetDetailState();

    // Try to load cached data first
    const cacheEntry = getGroupCacheEntry?.(id as string);
    const shouldBypassCache = Boolean(refresh);
    const TTL = 30 * 1000; // 30 seconds
    const now = Date.now();
    if (cacheEntry && !shouldBypassCache) {
      const { data, ts } = cacheEntry as any;
      setGroup(data.group ?? undefined);
      setMembers(data.members ?? []);
      setExpenses(data.expenses ?? []);
      setMyBalance(data.myBalance ?? undefined);
      setDebts(data.debts ?? []);
      const filtered = (data.debts ?? []).filter((item: any) => item.fromUser?.id === currentUser?.id);
      const filteredOwed = (data.debts ?? []).filter((item: any) => item.toUser?.id === currentUser?.id);
      setMemberToPay(filtered);
      setMemberOwed(filteredOwed);

      // If cache stale, refresh in background; otherwise still refresh in background to keep data fresh
      const shouldRefresh = !ts || now - ts > TTL;
      if (shouldRefresh) {
        (async () => {
          try {
            const [groupData, membersData, expensePage, balanceData, debtData] = await Promise.all([
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
            const filtered2 = debtData.filter((item) => item.fromUser?.id === currentUser?.id);
            const filteredOwed2 = debtData.filter((item) => item.toUser?.id === currentUser?.id);
            setMemberToPay(filtered2);
            setMemberOwed(filteredOwed2);
            setGroupCache(id, { group: groupData, members: membersData, expenses: expensePage.items, myBalance: balanceData, debts: debtData });
          } catch (err) {
            console.error("Background refresh failed:", err);
          }
        })();
      }
    } else {
      // no cache - fetch immediately
      (async () => {
        setRefreshingDetail(true);
        try {
          const [groupData, membersData, expensePage, balanceData, debtData] = await Promise.all([
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
          const filtered = debtData.filter((item) => item.fromUser?.id === currentUser?.id);
          const filteredOwed = debtData.filter((item) => item.toUser?.id === currentUser?.id);
          setMemberToPay(filtered);
          setMemberOwed(filteredOwed);
          setGroupCache(id, { group: groupData, members: membersData, expenses: expensePage.items, myBalance: balanceData, debts: debtData });
        } catch (error) {
          console.error("Failed to load group detail:", error);
        } finally {
          setRefreshingDetail(false);
        }
      })();
    }

    // fetch recent history (activities)
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await activityService.getHistory(id);
        let items = res.items ?? [];
        if (!items || items.length === 0) {
          // fallback to activities endpoint
          try {
            const act = await activityService.getActivities(id);
            items = act.items ?? [];
          } catch (e) {
            console.debug("activities fallback failed", e);
          }
        }

        setHistory(items);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();

    const fetchReminders = async () => {
      setRemindersLoading(true);
      try {
        const result = await reminderService.getReminders(id);
        setReminders(result.data ?? []);
      } catch (err) {
        console.error("Failed to load reminders:", err);
      } finally {
        setRemindersLoading(false);
      }
    };
    fetchReminders();
  }, [id, refresh]);

  const handleCreateReminder = async (targetUserId?: string) => {
    if (!id || !targetUserId) return;
    try {
      setCreatingReminders((s) => ({ ...s, [targetUserId]: true }));

      const payload = {
        targetUserIds: [targetUserId],
        channel: "in_app",
        messageTemplate: "Nhắc trả nợ",
      } as any;

      const created = await reminderService.createReminder(id as string, payload);

      // refresh reminders and debts
      try {
        const [remRes, debtData] = await Promise.all([
          reminderService.getReminders(id as string),
          settlementService.getDebts(id as string),
        ]);

        setReminders(remRes.data ?? []);
        setDebts(debtData);
        const filtered = debtData.filter((item: any) => item.fromUser?.id === currentUser?.id);
        const filteredOwed = debtData.filter((item: any) => item.toUser?.id === currentUser?.id);
        setMemberToPay(filtered);
        setMemberOwed(filteredOwed);
        setGroupCache?.(id as string, { group, members, expenses, myBalance, debts: debtData });
      } catch (e) {
        console.error("Failed to refresh after creating reminder", e);
      }

      // Navigate to created reminder if returned
      if (Array.isArray(created) && created.length > 0 && created[0]?.id) {
        const newId = created[0].id;
        router.push(`/group/${id}/reminder/${newId}`);
      } else {
        if (Platform.OS === "web") window.alert("Nhắc nhở đã được tạo");
        else Alert.alert("Thành công", "Nhắc nhở đã được tạo");
      }
    } catch (err: any) {
      console.error("Create reminder error", err);
      const msg = err?.response?.data?.message ?? "Không thể tạo nhắc nhở, thử lại sau.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Lỗi", msg);
    } finally {
      setCreatingReminders((s) => ({ ...s, [targetUserId as string]: false }));
    }
  };

  useEffect(() => {
    // ensure we have current user loaded so action buttons (leave) can work
    if (!currentUser) {
      fetchMe().catch(() => {});
    }
  }, [currentUser, fetchMe]);

  const localizeAction = (action?: string) => {
    if (!action) return "Hoạt động";

    switch (String(action)) {
      case "group_created":
        return "Đã tạo nhóm";
      case "expense_created":
        return "Đã thêm khoản chi";
      case "expense_updated":
        return "Đã cập nhật khoản chi";
      case "expense_deleted":
        return "Đã xóa khoản chi";
      case "member_added":
        return "Đã thêm thành viên";
      case "member_removed":
        return "Đã xóa thành viên";
      case "settlement_created":
        return "Đã tạo phiếu thanh toán";
      case "smart_settle":
        return "Đã thực hiện thanh toán thông minh";
      case "group_settlement_committed":
        return "Đã xác nhận thanh toán nhóm";
      case "reminder_created":
        return "Đã tạo nhắc nhở";
      default: {
        const cleaned = String(action).replace(/_|\./g, " ");
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
  };

  const effectiveRole = group?.role ?? cachedRole;

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
      <TopAppBar title="Chi tiết nhóm" showBack onBackPress={() => router.replace("/group")} />

      {refreshingDetail ? (
        <View style={styles.refreshBanner}>
          <ActivityIndicator size="small" color="#0F5E28" />
          <Text style={styles.refreshBannerText}>Đang cập nhật dữ liệu...</Text>
        </View>
      ) : null}

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
              source={{ uri: group?.avatarUrl || avatarFor(group?.id || group?.name) }}
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
            onPress={() => router.push(`/group/${id}/add-expense`) }
            style={[
              styles.actionButtonPrimary,
              useStackedActions && styles.actionButtonWide,
            ]}
          >
            <MaterialIcons name="add-card" size={18} color="#FFFFFF" />

            <Text style={styles.actionButtonPrimaryText}>Thêm khoản chi</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/group/${id}/pay`) }
            style={styles.actionButtonSecondary}
          >
            <MaterialCommunityIcons
              name="cash-multiple"
              size={18}
              color="#0F5E28"
            />

            <Text style={styles.actionButtonSecondaryText}>Thanh toán</Text>
          </Pressable>

          {(() => {
            if (!group && !effectiveRole) {
              return (
                <Pressable style={styles.actionButtonSecondary} disabled>
                  <ActivityIndicator size="small" color="#0F172A" />
                </Pressable>
              );
            }

            if (effectiveRole === "owner") {
              return (
                <Pressable
                  onPress={async () => {
                    if (isDeleting) return;

                    const confirmMsg = "Bạn có chắc muốn xóa nhóm này? Hành động không thể hoàn tác.";

                    const doDelete = async () => {
                      setIsDeleting(true);
                      try {
                        await groupService.deleteGroup(id as string);
                        useGroupStore.getState().invalidateGroupListCache();
                        useHomeStore.getState().invalidate();
                        if (Platform.OS === "web") {
                          window.alert("Nhóm đã được xóa");
                          router.replace("/group");
                        } else {
                          Alert.alert("Đã xóa", "Nhóm đã được xóa", [
                            { text: "OK", onPress: () => router.replace("/group") },
                          ]);
                        }
                      } catch (err: any) {
                        console.error("Delete group error", err);
                        const msg = err?.response?.data?.message ?? "Không thể xóa nhóm, thử lại sau.";
                        if (Platform.OS === "web") window.alert(msg);
                        else Alert.alert("Lỗi", msg);
                      } finally {
                        setIsDeleting(false);
                      }
                    };

                    if (Platform.OS === "web") {
                      if (window.confirm(confirmMsg)) await doDelete();
                    } else {
                      Alert.alert("Xóa nhóm", confirmMsg, [
                        { text: "Hủy", style: "cancel" },
                        { text: "Xóa", style: "destructive", onPress: doDelete },
                      ]);
                    }
                  }}
                  style={[
                    styles.actionButtonSecondary,
                    { borderColor: "#FECACA", backgroundColor: "#FFF1F2" },
                  ]}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#B91C1C" />
                  ) : (
                    <>
                      <MaterialIcons name="delete" size={18} color="#B91C1C" />
                      <Text style={[styles.actionButtonSecondaryText, { color: "#B91C1C" }]}>Xóa nhóm</Text>
                    </>
                  )}
                </Pressable>
              );
            }

            return (
              <Pressable
                onPress={async () => {
                  if (isLeaving) return;
                  if (!currentUser || !currentUser.id) {
                    const msg = "Không tìm thấy thông tin người dùng. Vui lòng thử đăng nhập lại.";
                    if (Platform.OS === "web") window.alert(msg);
                    else Alert.alert("Lỗi", msg);
                    return;
                  }

                  const confirmMsg = "Bạn có chắc muốn rời khỏi nhóm này?";

                  const doLeave = async () => {
                    setIsLeaving(true);
                    try {
                      await groupService.removeGroupMember(id as string, currentUser?.id as string);
                      useGroupStore.getState().invalidateGroupListCache();
                      useHomeStore.getState().invalidate();
                      if (Platform.OS === "web") {
                        window.alert("Bạn đã rời nhóm");
                        router.replace("/group");
                      } else {
                        Alert.alert("Đã rời", "Bạn đã rời nhóm", [
                          { text: "OK", onPress: () => router.replace("/group") },
                        ]);
                      }
                    } catch (err: any) {
                      console.error("Leave group error", err);
                      const msg = err?.response?.data?.message ?? "Không thể rời nhóm, thử lại sau.";
                      if (Platform.OS === "web") window.alert(msg);
                      else Alert.alert("Lỗi", msg);
                    } finally {
                      setIsLeaving(false);
                    }
                  };

                  if (Platform.OS === "web") {
                    if (window.confirm(confirmMsg)) await doLeave();
                  } else {
                    Alert.alert("Rời nhóm", confirmMsg, [
                      { text: "Hủy", style: "cancel" },
                      { text: "Rời", style: "destructive", onPress: doLeave },
                    ]);
                  }
                }}
                style={styles.actionButtonSecondary}
                disabled={isLeaving || !currentUser || !currentUser.id}
              >
                {isLeaving ? (
                  <ActivityIndicator size="small" color="#0F5E28" />
                ) : (
                  <>
                    <MaterialIcons name="logout" size={18} color="#0F172A" />
                    <Text style={styles.actionButtonSecondaryText}>Rời nhóm</Text>
                  </>
                )}
              </Pressable>
            );
          })()}
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
                      source={{ uri: user.toUser?.avatarUrl || avatarFor(user.toUserId || user.toUser?.id || user.toUser?.displayName) }}
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

                  <TouchableOpacity style={styles.payButton} onPress={
                    () => router.push(`/group/${id}/pay/${user.toUserId}?amount=${user.amount}`)
                  }>
                    <Text style={styles.payButtonText}>Trả nợ</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* PAY YOU */}
        {memberOwed.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Người nợ bạn</Text>

              <Text style={styles.sectionCount}>{memberOwed.length}</Text>
            </View>

            <View style={styles.memberList}>
              {memberOwed.map((user) => (
                <View key={`${user.fromUserId}-${user.toUserId}`} style={styles.payRow}>
                  <View style={styles.debtUser}>
                    <Image
                      source={{ uri: user.fromUser?.avatarUrl || avatarFor(user.fromUserId || user.fromUser?.id || user.fromUser?.displayName) }}
                      style={styles.debtAvatar}
                    />

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontWeight: "700" }}>{user.fromUser?.displayName ?? "Một thành viên"}</Text>
                      <Text style={styles.payAmount}>
                        {currency(user.amount)}
                      </Text>
                    </View>

                    
                  </View>

                  <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: "#3b6648" }]}
                    onPress={() => handleCreateReminder(user.fromUserId)}
                    disabled={!!creatingReminders[user.fromUserId]}
                  >
                    {creatingReminders[user.fromUserId] ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.payButtonText}>Nhắc</Text>
                    )}
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

        {/* HISTORY */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch sử hoạt động</Text>

            <Text style={styles.sectionCount}>{history.length}</Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <View style={{ gap: 8 }}>
              {history.length === 0 && <Text style={{ color: "#6B7280" }}>Chưa có lịch sử</Text>}
              {history.map((h) => (
                <View key={h.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <Text style={{ fontWeight: "700" }}>{h.actor?.displayName ?? "Một thành viên"} • {localizeAction(h.action)}</Text>
                  <Text style={{ color: "#6B7280", marginTop: 4 }}>{new Date(h.createdAt).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* REMINDERS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nhắc nhở</Text>

            <Text style={styles.sectionCount}>{reminders.length} mục</Text>
          </View>

          {remindersLoading ? (
            <ActivityIndicator size="small" />
          ) : reminders.length === 0 ? (
            <Text style={{ color: "#6B7280" }}>Chưa có nhắc nhở</Text>
          ) : (
            <View style={styles.memberList}>
              {reminders.map((reminder) => (
                <TouchableOpacity
                  key={reminder.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/group/${id}/reminder/${reminder.id}`)}
                  style={[styles.expenseRow, { backgroundColor: "#FFF8EC", borderRadius: 18, paddingHorizontal: 12 }]}
                >
                  <View style={styles.expenseIcon}>
                    <MaterialCommunityIcons name="bell-outline" size={18} color="#C2410C" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseName} numberOfLines={1}>
                      Nhắc {reminder.targetUser?.displayName ?? "một thành viên"}
                    </Text>
                    <Text style={styles.expenseMeta} numberOfLines={1}>
                      {reminder.status} • {new Date(reminder.createdAt).toLocaleString("vi-VN")}
                    </Text>
                  </View>

                  <Text style={{ color: "#C2410C", fontWeight: "800" }}>Chi tiết</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
                <Image
                  source={{ uri: member.avatarUrl || avatarFor(member.userId || member.displayName) }}
                  style={styles.memberAvatarImage}
                />

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
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: darkGreen }]}
        onPress={() => router.push(`/group/${id}/add-member`)}
        activeOpacity={0.85}
      >
        <AntDesign name="plus" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },

  refreshBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    backgroundColor: "#EAF6EE",
  },

  refreshBannerText: {
    color: "#0F5E28",
    fontWeight: "700",
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
    flexWrap: "wrap",
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
    minHeight: 48,
  },

  actionButtonWide: {
    flexBasis: "100%",
  },

  actionButtonPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "center",
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
    minHeight: 48,
    minWidth: 0,
  },

  actionButtonSecondaryText: {
    color: "#0F172A",
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "center",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
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

  payRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EAF6EE",
    borderRadius: 18,
    padding: 12,
    gap: 12,
    flexWrap: "wrap",
  },

  debtUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
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

  payAmount: {
    color: "#0F5E28",
    fontWeight: "700",
    marginTop: 2,
  },

  payButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    flexShrink: 0,
    alignSelf: "center",
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
