import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { expenseService } from "@/api/services/expense.service";
import { groupService } from "@/api/services/group.service";
import { balanceService } from "@/api/services/balance.service";
import { settlementService } from "@/api/services/settlement.service";
import type { Expense } from "@/api/types/expense";
import type { GroupMember } from "@/api/types/group";
import { useGroupStore } from "@/store/group.store";
import { useHomeStore } from "@/store/home.store";

type SplitMode = "equal" | "amount" | "percent" | "weight";

type EditParticipantDraft = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  value: string;
};

export default function ExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const { textColor, darkGreen, backgroundWhite } = useAppTheme();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPayerId, setEditPayerId] = useState<string | null>(null);
  const [editSplitMode, setEditSplitMode] = useState<SplitMode>("equal");
  const [editParticipants, setEditParticipants] = useState<EditParticipantDraft[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  useEffect(() => {
    if (!id || !expenseId) return;

    const fetch = async () => {
      try {
        const groupId = String(id);
        const [expenseData, membersData] = await Promise.all([
          expenseService.getExpense(groupId, String(expenseId)),
          groupService.getGroupMembers(groupId),
        ]);

        setExpense(expenseData);
        setGroupMembers(membersData);
      } catch (err) {
        console.error("Failed to load expense:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [id, expenseId]);
  const perPerson = useMemo(() => {
    if (!expense || !expense.participants || expense.participants.length === 0) return 0;
    return Math.floor(expense.amount / expense.participants.length);
  }, [expense]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showPercentModal, setShowPercentModal] = useState(false);

  const splitLabel = useMemo(() => {
    if (!expense) return "Chia đều";
    switch (expense.splitMode) {
      case "equal":
        return "Chia đều";
      case "amount":
        return "Chia theo số tiền";
      case "percent":
        return "%";
      case "weight":
        return "Theo trọng số";
      default:
        return "Chia đều";
    }
  }, [expense]);

  const payerOptions = useMemo(() => {
    if (!expense) return [];

    const options = new Map<string, { userId: string; displayName: string; avatarUrl: string | null }>();

    if (expense.payer) {
      options.set(expense.paidByUserId, {
        userId: expense.paidByUserId,
        displayName: expense.payer.displayName,
        avatarUrl: expense.payer.avatarUrl,
      });
    }

    expense.participants.forEach((participant) => {
      options.set(participant.userId, {
        userId: participant.userId,
        displayName: participant.user?.displayName ?? participant.userId,
        avatarUrl: participant.user?.avatarUrl ?? null,
      });
    });

    if (!options.has(expense.paidByUserId)) {
      options.set(expense.paidByUserId, {
        userId: expense.paidByUserId,
        displayName: expense.paidByUserId,
        avatarUrl: null,
      });
    }

    return Array.from(options.values());
  }, [expense]);

  const formatCurrency = (v: number) => v.toLocaleString("vi-VN") + "đ";

  const createdAt = expense?.createdAt ? new Date(expense.createdAt).toLocaleString() : "-";

  const hydrateEditState = (currentExpense: Expense) => {
    setEditDescription(currentExpense.description);
    setEditAmount(String(currentExpense.amount));
    setEditPayerId(currentExpense.paidByUserId);
    setEditSplitMode(currentExpense.splitMode as SplitMode);
    setEditParticipants(
      currentExpense.participants.map((participant) => ({
        userId: participant.userId,
        displayName: participant.user?.displayName ?? participant.userId,
        avatarUrl: participant.user?.avatarUrl ?? null,
        value: String(participant.value ?? 0),
      })),
    );
  };

  const openEditModal = () => {
    if (!expense) return;
    hydrateEditState(expense);
    setShowEditModal(true);
  };

  const handleEditAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "");
    if (!digits) {
      setEditAmount("");
      return;
    }

    setEditAmount(digits.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
  };

  const updateParticipantValue = (userId: string, value: string) => {
    setEditParticipants((current) =>
      current.map((participant) =>
        participant.userId === userId ? { ...participant, value } : participant,
      ),
    );
  };

  const getParticipantDraft = (userId: string) => {
    const groupMember = groupMembers.find((member) => member.userId === userId);
    const expenseParticipant = expense?.participants.find((participant) => participant.userId === userId);

    if (!groupMember && !expenseParticipant) return null;

    return {
      userId,
      displayName:
        groupMember?.displayName ?? expenseParticipant?.user?.displayName ?? userId,
      avatarUrl: groupMember?.avatarUrl ?? expenseParticipant?.user?.avatarUrl ?? null,
      value: String(expenseParticipant?.value ?? 0),
    } satisfies EditParticipantDraft;
  };

  const participantOptions = useMemo(() => {
    if (!expense) return [];

    const options = new Map<string, { userId: string; displayName: string; avatarUrl: string | null }>();

    groupMembers.forEach((member) => {
      options.set(member.userId, {
        userId: member.userId,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
      });
    });

    expense.participants.forEach((participant) => {
      if (!options.has(participant.userId)) {
        options.set(participant.userId, {
          userId: participant.userId,
          displayName: participant.user?.displayName ?? participant.userId,
          avatarUrl: participant.user?.avatarUrl ?? null,
        });
      }
    });

    return Array.from(options.values());
  }, [expense, groupMembers]);

  const toggleEditParticipant = (userId: string) => {
    setEditParticipants((current) => {
      const isSelected = current.some((participant) => participant.userId === userId);

      if (isSelected) {
        return current.filter((participant) => participant.userId !== userId);
      }

      const draft = getParticipantDraft(userId);
      return draft ? [...current, draft] : current;
    });
  };

  const getEditAmount = () => Number(editAmount.replace(/[^0-9]/g, "")) || 0;

  const buildEditParticipants = () => {
    const amountValue = getEditAmount();

    if (editSplitMode === "equal") {
      const count = Math.max(1, editParticipants.length);
      const base = Math.floor(amountValue / count);
      let remainder = amountValue - base * count;

      return editParticipants.map((participant) => {
        const value = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;

        return {
          userId: participant.userId,
          value,
        };
      });
    }

    return editParticipants.map((participant) => ({
      userId: participant.userId,
      value: Math.max(0, Math.round(Number(participant.value.replace(/[^0-9]/g, "")) || 0)),
    }));
  };

  const handleSaveEdit = async () => {
    if (!id || !expenseId || !expense || editLoading) return;

    const groupId = String(id);
    const expenseKey = String(expenseId);
    const amountValue = getEditAmount();

    if (!editDescription.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên khoản chi.");
      return;
    }

    if (!amountValue) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    if (!editPayerId) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn người trả.");
      return;
    }

    if (editParticipants.length === 0) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn ít nhất một người tham gia.");
      return;
    }

    const participants = buildEditParticipants();

    if (editSplitMode === "amount") {
      const total = participants.reduce((sum, participant) => sum + participant.value, 0);
      if (total !== amountValue) {
        Alert.alert("Sai thông tin", "Tổng số tiền của các thành viên phải bằng tổng khoản chi.");
        return;
      }
    }

    if (editSplitMode === "percent") {
      const total = participants.reduce((sum, participant) => sum + participant.value, 0);
      if (total !== 100) {
        Alert.alert("Sai thông tin", "Tổng % phải bằng 100%.");
        return;
      }
    }

    setEditLoading(true);
    try {
      const updated = await expenseService.updateExpense(groupId, expenseKey, {
        description: editDescription.trim(),
        amount: amountValue,
        currency: expense.currency,
        paidByUserId: editPayerId,
        splitMode: editSplitMode,
        participants,
      });

      setExpense(updated);
      hydrateEditState(updated);

      try {
        const [groupData, membersData, expensePage, balanceData, debtData] = await Promise.all([
          groupService.getGroup(groupId),
          groupService.getGroupMembers(groupId),
          expenseService.getExpenses(groupId),
          balanceService.getMyBalance(groupId),
          settlementService.getDebts(groupId),
        ]);

        useGroupStore.getState().setGroupCache(groupId, {
          group: groupData,
          members: membersData,
          expenses: expensePage.items,
          myBalance: balanceData,
          debts: debtData,
        });
      } catch (refreshError) {
        console.error("Failed to refresh group data after update:", refreshError);
        useGroupStore.getState().invalidateGroupCache(groupId);
      }

      useGroupStore.getState().invalidateGroupListCache();
      useHomeStore.getState().invalidate();

      if (Platform.OS === "web") {
        window.alert("Đã cập nhật khoản chi");
      } else {
        Alert.alert("Thành công", "Đã cập nhật khoản chi");
      }

      setShowEditModal(false);
      router.replace(`/group/${groupId}?refresh=${Date.now()}` as any);
    } catch (error) {
      console.error("Update expense error:", error);
      const message =
        (error as any)?.response?.data?.message ?? "Không thể cập nhật khoản chi, thử lại sau.";
      Alert.alert("Lỗi", message);
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: backgroundWhite }]}>
        <ActivityIndicator size="large" color={darkGreen} />
        <Text style={{ marginTop: 12, color: textColor }}>Đang tải khoản chi...</Text>
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={[styles.center, { backgroundColor: backgroundWhite }]}>
        <Text style={{ color: textColor }}>Không tìm thấy khoản chi.</Text>
      </View>
    );
  }
  const goBackToGroupDetail = () => {
    if (id) {
      router.replace(`/group/${id}` as any);
      return;
    }

    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: backgroundWhite }}>
      <TopAppBar title="Chi tiết khoản chi" showBack onBackPress={goBackToGroupDetail} />
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 40 }}>
        <View style={{ backgroundColor: backgroundWhite, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <MaterialIcons name="restaurant" size={28} color={darkGreen} />
            </View>
            <Text style={{ fontSize: 12, color: "#9CA3AF", letterSpacing: 0.5 }}>KHOẢN CHI</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", marginTop: 6, color: textColor }}>{expense.description}</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: darkGreen, marginTop: 6 }}>{formatCurrency(expense.amount)}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>NGƯỜI THANH TOÁN</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                <Image source={{ uri: expense.payer?.avatarUrl || "https://ui-avatars.com/api/?name=User" }} style={{ width: 34, height: 34, borderRadius: 999 }} />
                <Text style={{ fontWeight: "700" }}>{expense.payer?.displayName ?? expense.paidByUserId}</Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>THỜI GIAN</Text>
              <Text style={{ fontWeight: "700", marginTop: 6 }}>{createdAt}</Text>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8 }}>NGƯỜI THAM GIA ({expense.participants.length})</Text>
            <View style={{ flexDirection: "column", gap: 8 }}>
              {expense.participants.map((p) => {
                const isPercent = expense.splitMode === "percent";
                const percent = p.value ?? 0;
                const amountNum = isPercent ? Math.round((percent / 100) * (expense.amount ?? 0)) : p.value ?? 0;

                return (
                  <View key={p.userId} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Image source={{ uri: p.user?.avatarUrl || "https://ui-avatars.com/api/?name=User" }} style={{ width: 36, height: 36, borderRadius: 999 }} />
                    <Text style={{ color: "#374151", fontWeight: "600", flex: 1 }}>{p.user?.displayName ?? p.userId}</Text>
                    <View style={{ alignItems: "flex-end" }}>
                      {isPercent ? (
                        <>
                          <Text style={{ fontWeight: "700" }}>{`${percent}%`}</Text>
                          <Text style={{ color: "#6B7280", marginTop: 4 }}>{formatCurrency(amountNum)}</Text>
                        </>
                      ) : (
                        <Text style={{ fontWeight: "700" }}>{formatCurrency(amountNum)}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={expense.splitMode === "percent" ? 0.8 : 1}
            onPress={() => {
              if (expense?.splitMode === "percent") setShowPercentModal(true);
            }}
            style={{ backgroundColor: "#ECFDF5", padding: 12, borderRadius: 12, marginBottom: 12 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: darkGreen, fontWeight: "700" }}>CÁCH CHIA</Text>
              {expense.splitMode === 'equal' ? (
                <Text style={{ color: darkGreen, fontWeight: "800" }}>{splitLabel} • {formatCurrency(perPerson)}/ng</Text>
              ) : (
                <Text style={{ color: darkGreen, fontWeight: "800" }}>{splitLabel}</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Notes and txn if available in metadata */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 8 }}>GHI CHÚ</Text>
            <Text style={{ color: textColor }}>{expense.description ?? "-"}</Text>
          </View>

          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>ID - {expense.id}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
          <TouchableOpacity onPress={openEditModal} style={{ backgroundColor: "#E6EEF9", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#374151", fontWeight: "700" }}>Chỉnh sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              if (!id || !expenseId || isDeleting) return;

              const confirmMsg = "Bạn có chắc muốn xóa khoản chi này? Hành động không thể hoàn tác.";

              const doDelete = async () => {
                try {
                  setIsDeleting(true);
                  const groupId = String(id);
                  const refreshTarget = `/group/${groupId}?refresh=${Date.now()}`;

                  await expenseService.deleteExpense(groupId, String(expenseId));

                  // Refresh group-related data so group detail shows latest expenses
                  try {
                    const [groupData, membersData, expensePage, balanceData, debtData] = await Promise.all([
                      groupService.getGroup(groupId),
                      groupService.getGroupMembers(groupId),
                      expenseService.getExpenses(groupId),
                      balanceService.getMyBalance(groupId),
                      settlementService.getDebts(groupId),
                    ]);

                    useGroupStore.getState().setGroupCache(groupId, {
                      group: groupData,
                      members: membersData,
                      expenses: expensePage.items,
                      myBalance: balanceData,
                      debts: debtData,
                    });
                  } catch (e) {
                    console.error("Failed to refresh group data after delete:", e);
                    // fallback: invalidate cache so detail will fetch on mount
                    useGroupStore.getState().invalidateGroupCache(groupId);
                  }

                  useGroupStore.getState().invalidateGroupListCache();
                  useHomeStore.getState().invalidate();

                  if (Platform.OS === "web") {
                    window.alert("Khoản chi đã được xóa");
                    router.replace(refreshTarget as any);
                  } else {
                    Alert.alert("Đã xóa", "Khoản chi đã được xóa", [
                      { text: "OK", onPress: () => router.replace(refreshTarget as any) },
                    ]);
                  }
                } catch (err) {
                  console.error("Delete expense error:", err);
                  const msg = (err as any)?.response?.data?.message ?? "Không thể xóa khoản chi, thử lại sau.";
                  if (Platform.OS === "web") window.alert(msg);
                  else Alert.alert("Lỗi", msg);
                } finally {
                  setIsDeleting(false);
                }
              };

              if (Platform.OS === "web") {
                if (window.confirm(confirmMsg)) await doDelete();
              } else {
                Alert.alert("Xóa khoản chi", confirmMsg, [
                  { text: "Hủy", style: "cancel" },
                  { text: "Xóa", style: "destructive", onPress: doDelete },
                ]);
              }
            }}
            disabled={isDeleting}
            style={{ backgroundColor: "#FEE2E2", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, flex: 1, alignItems: "center" }}
          >
            {isDeleting ? (
              <ActivityIndicator color="#B91C1C" />
            ) : (
              <Text style={{ color: "#B91C1C", fontWeight: "700" }}>Xóa</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: backgroundWhite }] }>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: textColor }}>Chỉnh sửa khoản chi</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={{ color: darkGreen, fontWeight: "700" }}>Đóng</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 }} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.editLabel}>Tên khoản chi</Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Nhập tên khoản chi"
                style={styles.editInput}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={[styles.editLabel, { marginTop: 12 }]}>Số tiền</Text>
              <TextInput
                value={editAmount}
                onChangeText={handleEditAmountChange}
                placeholder="Nhập số tiền"
                keyboardType="number-pad"
                style={styles.editInput}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={[styles.editLabel, { marginTop: 12 }]}>Người trả</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {payerOptions.map((participant) => {
                    const active = participant.userId === editPayerId;
                    return (
                      <TouchableOpacity
                        key={participant.userId}
                        onPress={() => setEditPayerId(participant.userId)}
                        style={[
                          styles.payerChip,
                          {
                            backgroundColor: active ? `${darkGreen}18` : "#F3F4F6",
                            borderColor: active ? darkGreen : "#E5E7EB",
                          },
                        ]}
                      >
                        <Image source={{ uri: participant.avatarUrl || "https://ui-avatars.com/api/?name=User" }} style={styles.payerAvatar} />
                        <Text style={{ color: textColor, fontWeight: active ? "800" : "700" }}>{participant.displayName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={[styles.editLabel, { marginTop: 12 }]}>Cách chia</Text>
              <View style={styles.splitModeRow}>
                {([
                  ["equal", "Chia đều"],
                  ["amount", "Số tiền"],
                  ["percent", "%"],
                  ["weight", "Trọng số"],
                ] as [SplitMode, string][]).map(([mode, label]) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setEditSplitMode(mode)}
                    style={[
                      styles.splitModeChip,
                      {
                        backgroundColor: editSplitMode === mode ? `${darkGreen}18` : "#F3F4F6",
                        borderColor: editSplitMode === mode ? darkGreen : "#E5E7EB",
                      },
                    ]}
                  >
                    <Text style={{ color: editSplitMode === mode ? darkGreen : textColor, fontWeight: "800" }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ marginTop: 8, color: "#6B7280", fontSize: 12, fontWeight: "600" }}>
                Đang chọn: {getSplitModeLabel(editSplitMode)}
              </Text>

              <Text style={[styles.editLabel, { marginTop: 12 }]}>Người tham gia</Text>
              <Text style={{ marginBottom: 8, color: "#6B7280", fontSize: 12 }}>
                Chạm vào tên để thêm hoặc bỏ người khỏi bill.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {participantOptions.map((member) => {
                    const active = editParticipants.some((participant) => participant.userId === member.userId);

                    return (
                      <TouchableOpacity
                        key={member.userId}
                        onPress={() => toggleEditParticipant(member.userId)}
                        style={[
                          styles.payerChip,
                          {
                            backgroundColor: active ? `${darkGreen}18` : "#F3F4F6",
                            borderColor: active ? darkGreen : "#E5E7EB",
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: member.avatarUrl || "https://ui-avatars.com/api/?name=User" }}
                          style={styles.payerAvatar}
                        />
                        <Text style={{ color: textColor, fontWeight: active ? "800" : "700" }}>
                          {member.displayName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {editParticipants.length === 0 ? (
                <Text style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 6 }}>
                  Chưa có người tham gia nào được chọn.
                </Text>
              ) : null}
              <View style={{ gap: 10 }}>
                {editParticipants.map((participant) => {
                  const valueLabel = editSplitMode === "percent" ? "%" : editSplitMode === "weight" ? "w" : "đ";
                  const editable = editSplitMode !== "equal";
                  return (
                    <View key={participant.userId} style={styles.participantEditRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                        <Image
                          source={{ uri: participant.avatarUrl || "https://ui-avatars.com/api/?name=User" }}
                          style={styles.participantEditAvatar}
                        />
                        <Text style={{ color: textColor, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                          {participant.displayName}
                        </Text>
                      </View>
                      <View style={styles.participantEditValueWrap}>
                        <TextInput
                          value={participant.value}
                          onChangeText={(value) => updateParticipantValue(participant.userId, value)}
                          editable={editable}
                          keyboardType="number-pad"
                          style={[
                            styles.participantEditValue,
                            !editable && { backgroundColor: "#F9FAFB", color: "#9CA3AF" },
                          ]}
                        />
                        <Text style={{ marginLeft: 6, color: "#6B7280", fontWeight: "700" }}>{valueLabel}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={editLoading}
                style={[
                  styles.saveEditButton,
                  { backgroundColor: editLoading ? "#9CA3AF" : darkGreen },
                ]}
              >
                {editLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveEditButtonText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showPercentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPercentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: backgroundWhite }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: textColor }}>Chi tiết chia %</Text>
              <TouchableOpacity onPress={() => setShowPercentModal(false)}>
                <Text style={{ color: darkGreen, fontWeight: "700" }}>Đóng</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 }} />

            <ScrollView>
              {expense?.participants?.map((p) => {
                // if participants' values represent percents (when backend uses percent), show percent and computed amount
                const percent = p.value ?? 0;
                const amountNum = Math.round((percent / 100) * (expense.amount ?? 0));
                return (
                  <View key={p.userId} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Image source={{ uri: p.user?.avatarUrl || "https://ui-avatars.com/api/?name=User" }} style={{ width: 36, height: 36, borderRadius: 999 }} />
                      <Text style={{ fontWeight: "700", color: textColor }}>{p.user?.displayName ?? p.userId}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontWeight: "700" }}>{percent}%</Text>
                      <Text style={{ color: "#6B7280", marginTop: 4 }}>{formatCurrency(amountNum)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

  function getSplitModeLabel(mode: SplitMode) {
    switch (mode) {
      case "equal":
        return "Chia đều";
      case "amount":
        return "Số tiền";
      case "percent":
        return "%";
      case "weight":
        return "Trọng số";
      default:
        return "Chia đều";
    }
  }

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  amount: { fontSize: 22, fontWeight: "900", color: "#0F5E28" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  label: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  value: { fontSize: 14, fontWeight: "800" },
  participantRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  partAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  partName: { fontWeight: "700" },
  partValue: { fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: "70%" },
  editLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 8 },
  editInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    marginBottom: 4,
  },
  payerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  payerAvatar: { width: 24, height: 24, borderRadius: 12 },
  splitModeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  splitModeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  participantEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  participantEditAvatar: { width: 32, height: 32, borderRadius: 16 },
  participantEditValueWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  participantEditValue: {
    width: 90,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: "right",
    backgroundColor: "#FFFFFF",
  },
  saveEditButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveEditButtonText: { color: "#FFFFFF", fontWeight: "800" },
});

