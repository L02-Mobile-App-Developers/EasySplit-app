// app/group/[id]/pay/[payId].tsx

import { groupService } from "@/api/services/group.service";
import { settlementService } from "@/api/services/settlement.service";
import TopAppBar from "@/components/TopAppBar";

import { GroupMember } from "@/api/types/group";

import { useAuthStore } from "@/store/auth.store";

import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function PayDetailScreen() {
  const { id, payId, amount: defaultAmount } = useLocalSearchParams();

  const currentUser = useAuthStore.getState().user;

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<GroupMember | null>(null);

  const [amount, setAmount] = useState(
    defaultAmount ? String(defaultAmount) : "",
  );

  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await groupService.getGroupMembers(String(id));

        setMembers(data);

        const targetUser = data.find(
          (member) => member.userId === String(payId),
        );

        if (targetUser) {
          setSelectedUser(targetUser);
        }
      } catch (error) {
        console.log("Fetch members error:", error);
      }
    };

    if (id) {
      fetch();
    }
  }, [id, payId]);

  const parsedAmount = useMemo(() => {
    return Number(String(amount).replace(/[^0-9]/g, "")) || 0;
  }, [amount]);

  const handleConfirm = async () => {
    if (!selectedUser) {
      Alert.alert("Lỗi", "Không tìm thấy người nhận");
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
      return;
    }

    try {
      setLoading(true);

      await settlementService.createSettlement(String(id), {
        fromUserId: currentUser?.id || "",
        toUserId: selectedUser.userId,
        amount: parsedAmount,
        note: note.trim() || undefined,
      });

      Alert.alert("Thành công", "Thanh toán thành công", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      console.log("Pay error:", err);

      Alert.alert("Lỗi", "Không thể thanh toán");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <TopAppBar title="Thanh toán công nợ" showBack />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* HEADER */}
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
            }}
          >
            <Text style={{ color: "gray" }}>Số tiền cần trả</Text>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "green",
                marginTop: 4,
              }}
            >
              {parsedAmount.toLocaleString("vi-VN")}đ
            </Text>
          </View>
        </View>

        {/* USER */}
        <Text
          style={{
            marginBottom: 6,
            fontWeight: "600",
          }}
        >
          NGƯỜI NHẬN
        </Text>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Image
            source={{
              uri:
                selectedUser?.avatarUrl ||
                "https://ui-avatars.com/api/?name=User",
            }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 100,
            }}
          />

          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              {selectedUser?.displayName}
            </Text>

            <Text
              style={{
                color: "gray",
                marginTop: 4,
              }}
            >
              {selectedUser?.email}
            </Text>
          </View>
        </View>

        {/* AMOUNT */}
        <Text
          style={{
            marginTop: 16,
            marginBottom: 6,
            fontWeight: "600",
          }}
        >
          SỐ TIỀN
        </Text>

        <View
          style={{
            backgroundColor: "#fff",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <TextInput
            placeholder="0"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={{
              fontSize: 24,
              fontWeight: "bold",
            }}
          />
        </View>

        {/* NOTE */}
        <Text
          style={{
            marginTop: 16,
            marginBottom: 6,
            fontWeight: "600",
          }}
        >
          GHI CHÚ
        </Text>

        <View
          style={{
            backgroundColor: "#fff",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <TextInput
            placeholder="Ví dụ: Chuyển khoản tiền ăn"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* BUTTON */}
        <TouchableOpacity
          disabled={loading}
          onPress={handleConfirm}
          style={{
            marginTop: 24,
            backgroundColor: loading ? "#86c59a" : "green",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            {loading ? "Đang xử lý..." : "Xác nhận thanh toán"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
