import TopAppBar from "@/components/TopAppBar";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { groupService } from "@/api/services/group.service";
import { GroupMember } from "@/api/types/group";

export default function PayScreen() {
  const { groupId } = useLocalSearchParams();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<GroupMember | null>(null);
  const [amount, setAmount] = useState("");

  const [note, setNote] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const data = await groupService.getGroupMembers(groupId as string);
      setMembers(data);

      // default chọn người đầu tiên đang nợ (demo)
      setSelectedUser(data?.[0] ?? null);
    };

    if (groupId) fetch();
  }, [groupId]);

  const totalDebt = useMemo(() => {
    // demo: bạn nên replace bằng /balances/me API
    return 540000;
  }, []);

  const handleConfirm = async () => {
    try {
      // gọi settlement API (sau này backend bạn sẽ có)
      //   await expenseService.createSettlement(groupId as string, {
      //     toUserId: selectedUser?.userId,
      //     amount: Number(amount),
      //     note,
      //   });

      router.back();
    } catch (err) {
      console.log("Pay error:", err);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <TopAppBar title="Thanh toán công nợ" showBack />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* HEADER CARD */}
        <View
          style={{
            backgroundColor: "#fff",
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "gray" }}>GIAO DỊCH MỚI</Text>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            Hoàn tất trả nợ
          </Text>

          <View
            style={{
              marginTop: 12,
              backgroundColor: "#f2f2f2",
              padding: 16,
              borderRadius: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={{ color: "gray" }}>Tổng số tiền cần trả</Text>
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "green" }}
              >
                {totalDebt.toLocaleString()}đ
              </Text>
            </View>
          </View>
        </View>

        {/* USER SELECT */}
        <Text style={{ marginBottom: 6 }}>NGƯỜI NHẬN</Text>

        <TouchableOpacity
          style={{
            backgroundColor: "#fff",
            padding: 12,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image
              source={{
                uri:
                  selectedUser?.avatarUrl ??
                  "https://randomuser.me/api/portraits/men/1.jpg",
              }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
            <View>
              <Text>{selectedUser?.displayName ?? "Chọn người nhận"}</Text>
              <Text style={{ color: "gray", fontSize: 12 }}>
                {selectedUser?.userId}
              </Text>
            </View>
          </View>

          <Text>▼</Text>
        </TouchableOpacity>

        {/* AMOUNT */}
        <Text style={{ marginTop: 16, marginBottom: 6 }}>SỐ TIỀN</Text>

        <View
          style={{
            backgroundColor: "#fff",
            padding: 12,
            borderRadius: 12,
          }}
        >
          <TextInput
            placeholder="0"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={{ fontSize: 20 }}
          />
        </View>

        {/* NOTE */}
        <Text style={{ marginTop: 16, marginBottom: 6 }}>GHI CHÚ</Text>

        <View
          style={{
            backgroundColor: "#fff",
            padding: 12,
            borderRadius: 12,
          }}
        >
          <TextInput
            placeholder="Nhập lời nhắn..."
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* BUTTON */}
        <TouchableOpacity
          onPress={handleConfirm}
          style={{
            marginTop: 20,
            backgroundColor: "green",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            Xác nhận thanh toán
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
