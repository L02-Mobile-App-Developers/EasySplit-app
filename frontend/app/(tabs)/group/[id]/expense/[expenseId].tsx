import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { expenseService } from "@/api/services/expense.service";
import type { Expense } from "@/api/types/expense";

export default function ExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const { textColor, darkGreen, backgroundWhite } = useAppTheme();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id || !expenseId) return;

    const fetch = async () => {
      try {
        const data = await expenseService.getExpense(String(id), String(expenseId));
        setExpense(data);
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

  const formatCurrency = (v: number) => v.toLocaleString("vi-VN") + "đ";

  const createdAt = expense?.createdAt ? new Date(expense.createdAt).toLocaleString() : "-";

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
  return (
    <View style={{ flex: 1, backgroundColor: backgroundWhite }}>
      <TopAppBar title="Chi tiết khoản chi" showBack />
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
              {expense.participants.map((p) => (
                <View key={p.userId} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Image source={{ uri: p.user?.avatarUrl || "https://ui-avatars.com/api/?name=User" }} style={{ width: 36, height: 36, borderRadius: 999 }} />
                  <Text style={{ color: "#374151", fontWeight: "600", flex: 1 }}>{p.user?.displayName ?? p.userId}</Text>
                  <Text style={{ fontWeight: "700" }}>{formatCurrency(p.value)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ backgroundColor: "#ECFDF5", padding: 12, borderRadius: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: darkGreen, fontWeight: "700" }}>CÁCH CHIA</Text>
              <Text style={{ color: darkGreen, fontWeight: "800" }}>{splitLabel} • {formatCurrency(perPerson)}/ng</Text>
            </View>
          </View>

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
          <TouchableOpacity onPress={() => {}} style={{ backgroundColor: "#E6EEF9", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, flex: 1, alignItems: "center" }}>
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
});

