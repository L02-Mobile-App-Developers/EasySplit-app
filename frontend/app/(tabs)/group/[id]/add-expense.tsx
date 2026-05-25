import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { groupService } from "@/api/services/group.service";
import { GroupMember } from "@/api/types/group";

import { expenseService } from "@/api/services/expense.service";
import { CreateExpenseRequest, SplitMode } from "@/api/types/expense";

const splitModes = ["CHIA ĐỀU", "SỐ TIỀN", "%"] as const;

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams();
  const { darkGreen, lightGray, backgroundWhite, textColor, tabIconDefault } =
    useAppTheme();

  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [showPayerModal, setShowPayerModal] = useState(false);

  const [members, setMembers] = useState<GroupMember[]>([]);

  const [splitMode, setSplitMode] =
    useState<(typeof splitModes)[number]>("CHIA ĐỀU");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);

  const parsedAmount = Number(amount.replace(/[^0-9]/g, "")) || 0;
  const selectedCount = selectedParticipantIds.length || 1;

  const perPersonAmount = useMemo(() => {
    if (!selectedCount) return 0;
    return Math.floor(parsedAmount / selectedCount);
  }, [parsedAmount, selectedCount]);

  const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((idValue) => idValue !== participantId)
        : [...current, participantId],
    );
  };

  const handleSave = async () => {
    try {
      if (!expenseName.trim()) {
        Alert.alert("Thiếu thông tin", "Vui lòng nhập tên khoản chi.");
        return;
      }

      if (!parsedAmount) {
        Alert.alert("Thiếu thông tin", "Vui lòng nhập số tiền hợp lệ.");
        return;
      }

      if (!payer) {
        Alert.alert("Thiếu thông tin", "Vui lòng chọn người trả.");
        return;
      }

      if (selectedParticipantIds.length === 0) {
        Alert.alert(
          "Thiếu thông tin",
          "Vui lòng chọn ít nhất 1 người tham gia.",
        );
        return;
      }

      let splitModeValue: SplitMode = "equal";

      switch (splitMode) {
        case "CHIA ĐỀU":
          splitModeValue = "equal";
          break;

        case "SỐ TIỀN":
          splitModeValue = "amount";
          break;

        case "%":
          splitModeValue = "percent";
          break;
      }

      const participants = selectedParticipantIds.map((userId) => ({
        userId,
        value: splitModeValue === "equal" ? perPersonAmount : perPersonAmount,
      }));

      const payload: CreateExpenseRequest = {
        description: expenseName,
        amount: parsedAmount,
        currency: "VND",
        paidByUserId:
          members.find((m) => m.displayName === payer)?.userId || "",
        splitMode: splitModeValue,
        participants,
      };

      await expenseService.createExpense(String(id), payload);

      Alert.alert("Thành công", "Tạo khoản chi thành công.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Create expense error:", error);

      Alert.alert("Lỗi", "Không thể tạo khoản chi.");
    }
  };

  useEffect(() => {
    const fetchGroupMembers = async () => {
      try {
        const response = await groupService.getGroupMembers(String(id));

        setMembers(response);

        setSelectedParticipantIds(response.map((member) => member.userId));

        if (response.length > 0) {
          setPayer(response[0].displayName);
        }
      } catch (error) {
        console.error("Error fetching group members:", error);
      }
    };

    fetchGroupMembers();
  }, [id]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <TopAppBar title="Thêm khoản chi" showBack />
      <ScrollView
        contentContainerStyle={{
          paddingTop: 12,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 24,
        }}
      >
        <View style={{ gap: 12 }}>
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

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => ({
              marginTop: 8,
              backgroundColor: pressed ? "#166534" : darkGreen,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 10,
            })}
          >
            <AntDesign name="save" size={18} color="white" />
            <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
              Lưu khoản chi
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
