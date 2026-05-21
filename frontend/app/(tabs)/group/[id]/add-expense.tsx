import Header from "@/components/header";
import { useAppTheme } from "@/hooks/useAppTheme";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const participants = [
  {
    id: 1,
    name: "BẠN",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    id: 2,
    name: "MAI",
    avatar: "https://randomuser.me/api/portraits/women/2.jpg",
  },
  {
    id: 3,
    name: "NAM",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg",
  },
  {
    id: 4,
    name: "VY",
    avatar: "https://randomuser.me/api/portraits/women/4.jpg",
  },
];

const splitModes = ["CHIA ĐỀU", "SỐ TIỀN", "%"] as const;

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams();
  const { darkGreen, lightGray, backgroundWhite, textColor, tabIconDefault } = useAppTheme();

  const [expenseName, setExpenseName] = useState("Ăn trưa BBQ");
  const [amount, setAmount] = useState("850000");
  const [payer, setPayer] = useState("Bạn (Khoa)");
  const [dateTime, setDateTime] = useState("Hôm nay, 12:30");
  const [note, setNote] = useState("");
  const [splitMode, setSplitMode] = useState<(typeof splitModes)[number]>("CHIA ĐỀU");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>(participants.map((item) => item.id));

  const parsedAmount = Number(amount.replace(/[^0-9]/g, "")) || 0;
  const selectedCount = selectedParticipantIds.length || 1;

  const perPersonAmount = useMemo(() => {
    if (!selectedCount) return 0;
    return Math.floor(parsedAmount / selectedCount);
  }, [parsedAmount, selectedCount]);

  const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

  const toggleParticipant = (participantId: number) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((idValue) => idValue !== participantId)
        : [...current, participantId],
    );
  };

  const handleSave = () => {
    if (!expenseName.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên khoản chi.");
      return;
    }

    if (!parsedAmount) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    Alert.alert(
      "Đã lưu",
      `Khoản chi ${expenseName} cho nhóm ${String(id)} đã được tạo thử nghiệm.`,
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 60,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 24,
        }}
      >
        <Header title="Thêm khoản chi" />

        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ color: tabIconDefault, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
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
            <Text style={{ color: tabIconDefault, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
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
              <Text style={{ fontSize: 18, fontWeight: "700", color: darkGreen, marginLeft: 12 }}>đ</Text>
            </View>
          </View>

          <View>
            <Text style={{ color: tabIconDefault, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
              NGƯỜI TRẢ
            </Text>
            <Pressable
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Image
                  source={{ uri: "https://randomuser.me/api/portraits/men/1.jpg" }}
                  style={{ width: 34, height: 34, borderRadius: 999 }}
                />
                <Text style={{ fontSize: 16, color: textColor, fontWeight: "600" }}>{payer}</Text>
              </View>
              <MaterialIcons name="keyboard-arrow-down" size={22} color={tabIconDefault} />
            </Pressable>
          </View>

          <View>
            <Text style={{ color: tabIconDefault, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
              NGÀY GIỜ
            </Text>
            <Pressable
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
              <Text style={{ fontSize: 16, color: textColor, fontWeight: "600" }}>{dateTime}</Text>
              <MaterialIcons name="access-time" size={18} color={tabIconDefault} />
            </Pressable>
          </View>

          <View>
            <Text style={{ color: tabIconDefault, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
              GHI CHÚ
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Thêm mô tả ngắn..."
              placeholderTextColor="#9CA3AF"
              multiline
              style={{
                backgroundColor: backgroundWhite,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                minHeight: 78,
                fontSize: 15,
                color: textColor,
                textAlignVertical: "top",
              }}
            />
          </View>

          <View style={{ marginTop: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: textColor }}>Người tham gia</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: darkGreen }}>{selectedParticipantIds.length} NGƯỜI</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
              {participants.map((participant) => {
                const isSelected = selectedParticipantIds.includes(participant.id);
                return (
                  <Pressable key={participant.id} onPress={() => toggleParticipant(participant.id)} style={{ alignItems: "center" }}>
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
                      <Image source={{ uri: participant.avatar }} style={{ width: "100%", height: "100%", borderRadius: 14 }} />
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
                    <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "700", color: textColor }}>{participant.name}</Text>
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
            <Text style={{ fontSize: 16, fontWeight: "700", color: textColor, marginBottom: 10 }}>Cách chia</Text>
            <View style={{ flexDirection: "row", backgroundColor: lightGray, borderRadius: 16, padding: 4 }}>
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
                    <Text style={{ color: active ? "white" : textColor, fontWeight: "700", fontSize: 14 }}>{mode}</Text>
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
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: textColor, fontSize: 15 }}>Tổng tiền</Text>
              <Text style={{ color: textColor, fontSize: 15, fontWeight: "700" }}>{formatCurrency(parsedAmount)}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: "#D9E3DC" }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: textColor, fontSize: 15 }}>Mỗi người ({selectedCount})</Text>
              <Text style={{ color: darkGreen, fontSize: 16, fontWeight: "700" }}>
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
            <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>Lưu khoản chi</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
