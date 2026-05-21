import Header from "@/components/header";
import { useAppTheme } from "@/hooks/useAppTheme";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

// Mock data for detail (in real app fetch by expenseId)
const mockDetail = {
  id: "activity-2",
  title: "Bữa tối BBQ cuối tuần",
  amount: 2450000,
  payer: "Minh Khôi",
  time: "Hôm nay, 19:45",
  participants: [
    { id: 1, name: "Khôi", initials: "MK" },
    { id: 2, name: "Hoàng An", initials: "HA" },
    { id: 3, name: "Linh Nhi", initials: "LN" },
    { id: 4, name: "Việt Tú", initials: "VT" },
  ],
  splitType: "Chia đều",
  perPerson: 612500,
  note:
    "Tiền nướng tại Gogi House. Linh Nhi trả tiền nước riêng. Đã bao gồm 10% VAT và 5% phí phục vụ.",
  txn: "ES-99203-BBQ",
};

export default function ExpenseDetail() {
  const { id, expenseId } = useLocalSearchParams();
  const { backgroundColor, backgroundWhite, textColor, tabIconDefault, darkGreen } = useAppTheme();

  const d = mockDetail; // replace with fetch by expenseId

  const formatCurrency = (v: number) => v.toLocaleString("vi-VN") + "đ";

  return (
    <View style={{ flex: 1, backgroundColor: backgroundColor }}>
      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 }}>
        <Header title="Chi tiết khoản chi" />

        <View style={{ backgroundColor: backgroundWhite, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <MaterialIcons name="restaurant" size={28} color={darkGreen} />
            </View>
            <Text style={{ fontSize: 12, color: tabIconDefault, letterSpacing: 0.5 }}>KHOẢN CHI ĂN UỐNG</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", marginTop: 6, color: textColor }}>{d.title}</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: darkGreen, marginTop: 6 }}>{formatCurrency(d.amount)}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 12, color: tabIconDefault }}>NGƯỜI THANH TOÁN</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                <Image source={{ uri: "https://randomuser.me/api/portraits/men/1.jpg" }} style={{ width: 34, height: 34, borderRadius: 999 }} />
                <Text style={{ fontWeight: "700" }}>{d.payer}</Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 12, color: tabIconDefault }}>THỜI GIAN</Text>
              <Text style={{ fontWeight: "700", marginTop: 6 }}>{d.time}</Text>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: tabIconDefault, marginBottom: 8 }}>NGƯỜI THAM GIA ({d.participants.length})</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {d.participants.map((p) => (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontWeight: "700", color: "#374151" }}>{p.initials}</Text>
                  </View>
                  <Text style={{ color: "#374151", fontWeight: "600" }}>{p.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ backgroundColor: "#ECFDF5", padding: 12, borderRadius: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: darkGreen, fontWeight: "700" }}>CÁCH CHIA</Text>
              <Text style={{ color: darkGreen, fontWeight: "800" }}>{d.splitType} • {formatCurrency(d.perPerson)}/ng</Text>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: tabIconDefault, fontSize: 12, marginBottom: 8 }}>GHI CHÚ</Text>
            <Text style={{ color: textColor }}>{d.note}</Text>
          </View>

          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>TXN - {d.txn}</Text>
            <View style={{ width: 80, height: 80, borderRadius: 6, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginTop: 12 }}>
              <Text style={{ color: "#9CA3AF" }}>QR</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
          <TouchableOpacity onPress={() => router.push(`edit`)} style={{ backgroundColor: "#E6EEF9", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#374151", fontWeight: "700" }}>Chỉnh sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { /* TODO: delete */ }} style={{ backgroundColor: "#FEE2E2", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#B91C1C", fontWeight: "700" }}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
