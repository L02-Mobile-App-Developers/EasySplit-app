import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { groupService } from "@/api/services/group.service";
import { GroupMember } from "@/api/types/group";
import { useGroupStore } from "@/store/group.store";
import { useHomeStore } from "@/store/home.store";

import { expenseService } from "@/api/services/expense.service";
import { CreateExpenseRequest } from "@/api/types/expense";

const splitModes = ["CHIA ĐỀU", "SỐ TIỀN", "%"] as const;

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams();
  const { darkGreen, lightGray, backgroundWhite, textColor, tabIconDefault } =
    useAppTheme();

  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [payerId, setPayerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const [members, setMembers] = useState<GroupMember[]>([]);

  const [splitMode, setSplitMode] =
    useState<(typeof splitModes)[number]>("CHIA ĐỀU");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);
  const [participantAmounts, setParticipantAmounts] = useState<Record<string, string>>({});
  const [participantPercents, setParticipantPercents] = useState<Record<string, string>>({});

  const parsedAmount = Number(amount.replace(/[^0-9]/g, "")) || 0;
  const selectedCount = selectedParticipantIds.length || 1;
  const groupId = Array.isArray(id) ? id[0] : id;

  const sumParticipantAmounts = useMemo(() => {
    return Object.values(participantAmounts).reduce((acc, v) => acc + (Number(v) || 0), 0);
  }, [participantAmounts]);

  const perPersonAmount = useMemo(() => {
    if (!selectedCount) return 0;
    if (splitMode === "SỐ TIỀN") {
      return Math.floor((sumParticipantAmounts || 0) / selectedCount);
    }
    return Math.floor(parsedAmount / selectedCount);
  }, [parsedAmount, selectedCount, splitMode, sumParticipantAmounts]);

  const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
  const sumParticipantPercents = useMemo(() => {
    return Object.values(participantPercents).reduce((acc, v) => acc + (Number(v) || 0), 0);
  }, [participantPercents]);

  useEffect(() => {
    if (!selectedParticipantIds || selectedParticipantIds.length === 0) return;

    if (splitMode === "SỐ TIỀN") {
      if (sumParticipantAmounts === 0) {
        const defaultAmount = Math.floor(parsedAmount / Math.max(1, selectedParticipantIds.length));
        const initial: Record<string, string> = {};
        selectedParticipantIds.forEach((id) => (initial[id] = String(defaultAmount)));
        setParticipantAmounts((cur) => ({ ...initial, ...cur }));
      }
    } else if (splitMode === "%") {
      if (sumParticipantPercents === 0) {
        const base = Math.floor(100 / Math.max(1, selectedParticipantIds.length));
        let remainder = 100 - base * selectedParticipantIds.length;
        const initial: Record<string, string> = {};
        selectedParticipantIds.forEach((id) => {
          const v = base + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder -= 1;
          initial[id] = String(v);
        });
        setParticipantPercents((cur) => ({ ...initial, ...cur }));
      }
    }
  }, [parsedAmount, selectedParticipantIds, splitMode, sumParticipantAmounts, sumParticipantPercents]);

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((idValue) => idValue !== participantId)
        : [...current, participantId],
    );
    setParticipantAmounts((cur) => {
      if (cur[participantId]) {
        const copy = { ...cur };
        delete copy[participantId];
        return copy;
      }

      const defaultAmount = Math.floor(parsedAmount / Math.max(1, selectedParticipantIds.length + 1));
      return { ...cur, [participantId]: String(defaultAmount) };
    });
    setParticipantPercents((cur) => {
      if (cur[participantId]) {
        const copy = { ...cur };
        delete copy[participantId];
        return copy;
      }

      const defaultPercent = Math.floor(100 / Math.max(1, selectedParticipantIds.length + 1));
      return { ...cur, [participantId]: String(defaultPercent) };
    });
  };

  const goBackToGroupDetail = () => {
    if (groupId) {
      router.replace(`/group/${groupId}?refresh=${Date.now()}` as any);
      return;
    }

    router.back();
  };

  const showFeedback = (
    type: "error" | "success",
    title: string,
    message: string,
  ) => {
    setFeedback({ type, message });

    if (Platform.OS === "web") {
      window.alert(message);
      return;
    }

    Alert.alert(title, message);
  };

  const handleSave = async () => {
    if (isSaving) return;

    try {
      setFeedback(null);

      if (!groupId) {
        showFeedback("error", "Lỗi", "Không tìm thấy nhóm để tạo khoản chi.");
        return;
      }

      if (!expenseName.trim()) {
        showFeedback("error", "Thiếu thông tin", "Vui lòng nhập tên khoản chi.");
        return;
      }

      if (!parsedAmount) {
        showFeedback("error", "Thiếu thông tin", "Vui lòng nhập số tiền hợp lệ.");
        return;
      }

      const selectedPayerId =
        payerId || members.find((member) => member.displayName === payer)?.userId;

      if (!selectedPayerId) {
        showFeedback("error", "Thiếu thông tin", "Vui lòng chọn người trả.");
        return;
      }

      if (selectedParticipantIds.length === 0) {
        showFeedback("error", "Thiếu thông tin", "Vui lòng chọn ít nhất 1 người tham gia.");
        return;
      }

      setIsSaving(true);
      let participants: { userId: string; value: number }[] = [];
      let payloadSplitMode: CreateExpenseRequest['splitMode'] = 'equal';

      if (splitMode === 'SỐ TIỀN') {
        // validate sum matches total
        if (sumParticipantAmounts !== parsedAmount) {
          setIsSaving(false);
          showFeedback(
            'error',
            'Sai thông tin',
            'Tổng số tiền của các thành viên phải bằng tổng khoản chi.',
          );
          return;
        }

        participants = selectedParticipantIds.map((userId) => ({
          userId,
          value: Math.round(Number(participantAmounts[userId]) || 0),
        }));
        payloadSplitMode = 'amount';
      } else if (splitMode === '%') {
        // validate percents sum to 100
        if (sumParticipantPercents !== 100) {
          setIsSaving(false);
          showFeedback('error', 'Sai thông tin', 'Tổng % phải bằng 100%.');
          return;
        }

        participants = selectedParticipantIds.map((userId) => ({
          userId,
          value: Math.round(Number(participantPercents[userId]) || 0),
        }));
        payloadSplitMode = 'percent';
      } else {
        const base = Math.floor(parsedAmount / selectedParticipantIds.length);
        let remainder = parsedAmount - base * selectedParticipantIds.length;
        participants = selectedParticipantIds.map((userId) => {
          const value = base + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder -= 1;
          return { userId, value };
        });
        payloadSplitMode = 'equal';
      }

      const payload: CreateExpenseRequest = {
        description: expenseName.trim(),
        amount: parsedAmount,
        currency: 'VND',
        paidByUserId: selectedPayerId,
        splitMode: payloadSplitMode,
        participants,
      };

      await expenseService.createExpense(groupId, payload);

      useGroupStore.getState().invalidateGroupCache(groupId);
      useGroupStore.getState().invalidateGroupListCache();
      useHomeStore.getState().invalidate();

      setFeedback({ type: "success", message: "Tạo khoản chi thành công." });

      if (Platform.OS === "web") {
        window.alert("Tạo khoản chi thành công.");
        goBackToGroupDetail();
        return;
      }

      Alert.alert("Thành công", "Tạo khoản chi thành công.", [
        {
          text: "OK",
          onPress: goBackToGroupDetail,
        },
      ]);
    } catch (error: any) {
      console.error("Create expense error:", error);

      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        "Không thể tạo khoản chi.";
      showFeedback("error", "Lỗi", message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const fetchGroupMembers = async () => {
      try {
        if (!groupId) return;

        const response = await groupService.getGroupMembers(groupId);

        setMembers(response);

        const ids = response.map((member) => member.userId);
        setSelectedParticipantIds(ids);
        const defaultAmount = ids.length ? Math.floor(parsedAmount / ids.length) : 0;
        const initialAmounts: Record<string, string> = {};
        ids.forEach((uid) => (initialAmounts[uid] = String(defaultAmount)));
        setParticipantAmounts(initialAmounts);
        // initialize percent splits equally
        const base = ids.length ? Math.floor(100 / ids.length) : 0;
        let remainder = 100 - base * ids.length;
        const initialPercents: Record<string, string> = {};
        ids.forEach((uid) => {
          const v = base + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder -= 1;
          initialPercents[uid] = String(v);
        });
        setParticipantPercents(initialPercents);

        if (response.length > 0) {
          setPayer(response[0].displayName);
          setPayerId(response[0].userId);
        }
      } catch (error) {
        console.error("Error fetching group members:", error);
      }
    };

    fetchGroupMembers();
  }, [groupId]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <TopAppBar title="Thêm khoản chi" showBack onBackPress={goBackToGroupDetail} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: 12,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 24,
        }}
      >
        <View style={{ gap: 12 }}>
          {feedback ? (
            <View
              style={{
                backgroundColor: feedback.type === "success" ? "#E8F7EE" : "#FDECEC",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  color: feedback.type === "success" ? "#0F5E28" : "#B91C1C",
                  fontWeight: "700",
                }}
              >
                {feedback.message}
              </Text>
            </View>
          ) : null}

          <View>
            <Text
              style={{
                color: tabIconDefault,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 6,
              }}
            >
              TÊN KHOẢN CHI
            </Text>
            <TextInput
              value={expenseName}
              onChangeText={setExpenseName}
              placeholder="Nhập tên khoản chi"
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: backgroundWhite,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 16,
                fontSize: 16,
                color: textColor,
              }}
            />
          </View>

          <View>
            <Text
              style={{
                color: tabIconDefault,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 6,
              }}
            >
              SỐ TIỀN
            </Text>
            <View
              style={{
                backgroundColor: backgroundWhite,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 18,
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                style={{
                  flex: 1,
                  fontSize: 42,
                  fontWeight: "700",
                  color: darkGreen,
                  padding: 0,
                }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: darkGreen,
                  marginLeft: 12,
                }}
              >
                đ
              </Text>
            </View>
          </View>

          <View>
            <Text
              style={{
                color: tabIconDefault,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 6,
              }}
            >
              NGƯỜI TRẢ
            </Text>
            <Pressable
              onPress={() => setShowPayerModal(true)}
              style={{
                backgroundColor: backgroundWhite,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Image
                  source={{
                    uri: "https://randomuser.me/api/portraits/men/1.jpg",
                  }}
                  style={{ width: 34, height: 34, borderRadius: 999 }}
                />
                <Text
                  style={{ fontSize: 16, color: textColor, fontWeight: "600" }}
                >
                  {payer}
                </Text>
              </View>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={22}
                color={tabIconDefault}
              />
            </Pressable>

            <Modal visible={showPayerModal} transparent animationType="slide">
              <View
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  backgroundColor: "rgba(0,0,0,0.3)",
                }}
              >
                <View
                  style={{
                    backgroundColor: backgroundWhite,
                    padding: 16,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: "60%",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      marginBottom: 12,
                      color: textColor,
                    }}
                  >
                    Chọn người trả
                  </Text>
                    <ScrollView>
                    {members.map((member) => (
                      <Pressable
                        key={member.userId}
                        onPress={() => {
                          setPayer(member.displayName);
                          setPayerId(member.userId);
                          setShowPayerModal(false);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <Image
                          source={{
                            uri:
                              member.avatarUrl ||
                              "https://ui-avatars.com/api/?name=User",
                          }}
                          style={{ width: 36, height: 36, borderRadius: 999 }}
                        />
                        <Text style={{ fontSize: 16, color: textColor }}>
                          {member.displayName}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Pressable
                    onPress={() => setShowPayerModal(false)}
                    style={{
                      marginTop: 8,
                      alignItems: "center",
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: "#F3F4F6",
                    }}
                  >
                    <Text style={{ color: "#374151", fontWeight: "700" }}>
                      Hủy
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          </View>

          <View style={{ marginTop: 6 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: textColor }}
              >
                Người tham gia
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: darkGreen }}
              >
                {selectedParticipantIds.length} NGƯỜI
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 8 }}
            >
              {members.map((participant) => {
                const isSelected = selectedParticipantIds.includes(
                  participant.userId,
                );
                return (
                  <Pressable
                    key={participant.userId}
                    onPress={() => toggleParticipant(participant.userId)}
                    style={{ alignItems: "center" }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 18,
                        borderWidth: 2,
                        borderColor: isSelected ? darkGreen : "#D1D5DB",
                        padding: 2,
                        backgroundColor: backgroundWhite,
                      }}
                    >
                      <Image
                        source={{
                          uri:
                            participant.avatarUrl ||
                            "https://ui-avatars.com/api/?name=User",
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 14,
                        }}
                      />
                      {isSelected && (
                        <View
                          style={{
                            position: "absolute",
                            right: -2,
                            top: -2,
                            backgroundColor: darkGreen,
                            width: 20,
                            height: 20,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AntDesign name="check" size={12} color="white" />
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        fontWeight: "700",
                        color: textColor,
                      }}
                    >
                      {participant.displayName}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: "#D1D5DB",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: backgroundWhite,
                }}
              >
                <AntDesign name="plus" size={20} color={tabIconDefault} />
              </Pressable>
            </ScrollView>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: textColor,
                marginBottom: 10,
              }}
            >
              Cách chia
            </Text>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: lightGray,
                borderRadius: 16,
                padding: 4,
              }}
            >
              {splitModes.map((mode) => {
                const active = splitMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setSplitMode(mode)}
                    style={{
                      flex: 1,
                      backgroundColor: active ? darkGreen : "transparent",
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? "white" : textColor,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      {mode}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

            {splitMode === "SỐ TIỀN" && (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: backgroundWhite,
                  borderRadius: 12,
                  padding: 12,
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: textColor }}>
                  Nhập số tiền từng người
                </Text>

                {selectedParticipantIds.map((uid) => {
                  const member = members.find((m) => m.userId === uid);
                  return (
                    <View
                      key={uid}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text style={{ flex: 1, color: textColor }}>{member?.displayName}</Text>
                      <TextInput
                        value={participantAmounts[uid] || ""}
                        onChangeText={(v) =>
                          setParticipantAmounts((cur) => ({
                            ...cur,
                            [uid]: v.replace(/[^0-9]/g, ""),
                          }))
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        style={{
                          width: 130,
                          textAlign: "right",
                          backgroundColor: "#F3F4F6",
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 8,
                          color: textColor,
                          fontWeight: "700",
                        }}
                      />
                    </View>
                  );
                })}

                <View style={{ height: 1, backgroundColor: "#E6E6E6" }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: textColor }}>Tổng đã phân</Text>
                  <Text style={{ color: textColor, fontWeight: "700" }}>{formatCurrency(sumParticipantAmounts)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: textColor }}>Còn lại</Text>
                  <Text style={{ color: parsedAmount - sumParticipantAmounts === 0 ? darkGreen : "#B91C1C", fontWeight: "700" }}>
                    {formatCurrency(parsedAmount - sumParticipantAmounts)}
                  </Text>
                </View>
              </View>
            )}

          {splitMode === "CHIA ĐỀU" && (
            <View
              style={{
                marginTop: 10,
                backgroundColor: "#EAF3EE",
                borderRadius: 18,
                padding: 16,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: textColor, fontSize: 15 }}>Tổng tiền</Text>
                <Text
                  style={{ color: textColor, fontSize: 15, fontWeight: "700" }}
                >
                  {formatCurrency(parsedAmount)}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: "#D9E3DC" }} />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: textColor, fontSize: 15 }}>
                  Mỗi người ({selectedCount})
                </Text>
                <Text
                  style={{ color: darkGreen, fontSize: 16, fontWeight: "700" }}
                >
                  {formatCurrency(perPersonAmount)}
                </Text>
              </View>
            </View>
          )}

          
          {splitMode === "%" && (
            <View
              style={{
                marginTop: 10,
                backgroundColor: backgroundWhite,
                borderRadius: 12,
                padding: 12,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: textColor }}>
                Nhập % cho từng người
              </Text>

              {selectedParticipantIds.map((uid) => {
                const member = members.find((m) => m.userId === uid);
                const percentStr = participantPercents[uid] || "";
                const amount = Math.round(((Number(percentStr) || 0) / 100) * parsedAmount);
                return (
                  <View
                    key={uid}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <Text style={{ flex: 1, color: textColor }}>{member?.displayName}</Text>
                    <View style={{ width: 160, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <TextInput
                        value={percentStr}
                        onChangeText={(v) =>
                          setParticipantPercents((cur) => ({ ...cur, [uid]: v.replace(/[^0-9]/g, "") }))
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        style={{
                          width: 70,
                          textAlign: "right",
                          backgroundColor: "#F3F4F6",
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 8,
                          color: textColor,
                          fontWeight: "700",
                        }}
                      />
                      <Text style={{ color: textColor, fontWeight: "700" }}>%</Text>
                      <Text style={{ color: "#6B7280" }}>{formatCurrency(amount)}</Text>
                    </View>
                  </View>
                );
              })}

              <View style={{ height: 1, backgroundColor: "#E6E6E6" }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: textColor }}>Tổng %</Text>
                <Text style={{ color: textColor, fontWeight: "700" }}>{sumParticipantPercents}%</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: textColor }}>Còn lại</Text>
                <Text style={{ color: sumParticipantPercents === 100 ? darkGreen : "#B91C1C", fontWeight: "700" }}>
                  {100 - sumParticipantPercents}%
                </Text>
              </View>
            </View>
          )}

          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={({ pressed }) => ({
              marginTop: 8,
              backgroundColor: isSaving ? "#6B7280" : pressed ? "#166534" : darkGreen,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 10,
            })}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <AntDesign name="save" size={18} color="white" />
            )}
            {isSaving ? (
              <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
                Đang lưu...
              </Text>
            ) : null}
            <Text style={{ color: "white", fontWeight: "800", fontSize: 16, display: isSaving ? "none" : "flex" }}>
              Lưu khoản chi
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
