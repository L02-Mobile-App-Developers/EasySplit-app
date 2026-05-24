import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import TopAppBar from "@/components/TopAppBar";

const mockTransactions = [
  {
    id: "t1",
    section: "HÔM NAY",
    icon: "silverware-fork-knife",
    iconBg: "#D8EEF9",
    title: "Lan đã thêm Bữa tối BBQ",
    subtitle: "Vừa xong • Trong Nhóm Ăn Chơi",
    amount: "250.000đ",
    amountColor: "#0F172A",
  },
  {
    id: "t2",
    section: "HÔM NAY",
    icon: "cash",
    iconBg: "#DFF7E8",
    title: "Bạn đã thanh toán cho Huy",
    subtitle: "2 giờ trước",
    amount: "120.000đ",
    amountColor: "#16A34A",
  },
  {
    id: "t3",
    section: "HÔM QUA",
    icon: "account-group",
    iconBg: "#FFEDE6",
    title: "Bạn đã tham gia nhóm Du lịch Đà Lạt",
    subtitle: "18:30 • 4 thành viên",
    amount: null,
    amountColor: null,
  },
  {
    id: "t4",
    section: "HÔM QUA",
    avatar: require("../../../assets/images/icon.png"),
    title: "Huy đã nhắc bạn trả nợ",
    subtitle: "Hôm qua • Cần thanh toán gấp",
    amount: "350.000đ",
    amountColor: "#BA1A1A",
    amountHighlight: "Tiền điện tháng 10",
  },
];

const FilterChip: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
  >
    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>{label}</Text>
  </TouchableOpacity>
);

const TransactionItem: React.FC<any> = ({ item }) => (
  <View style={styles.transactionCard}>
    <View style={styles.transactionLeft}>
      {item.avatar ? (
        <View style={styles.avatarWrap}>
          <View style={styles.avatarImageWrap}>
            <MaterialIcons name="person" size={20} color="#0F5E28" />
          </View>
        </View>
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: item.iconBg || "#F3F4F6" }]}>
          <MaterialCommunityIcons name={item.icon} size={20} color="#0F172A" />
        </View>
      )}

      <View style={styles.transactionTextWrap}>
        <Text style={styles.transactionTitle}>{item.title}</Text>
        {item.amountHighlight ? <Text style={styles.highlightText}>{item.amountHighlight}</Text> : null}
        <Text style={styles.transactionSubtitle}>{item.subtitle}</Text>
      </View>
    </View>

    <View style={styles.transactionAmountWrap}>
      {item.amount ? <Text style={[styles.transactionAmount, { color: item.amountColor || "#0F172A" }]}>{item.amount}</Text> : <MaterialIcons name="chevron-right" size={24} color="#6B7280" />}
    </View>
  </View>
);

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setTransactions(mockTransactions);
      setLoading(false);
    };

    loadTransactions();
  }, []);

  return (
    <View style={styles.screen}>
      <TopAppBar title="Lịch sử" showSearch showSettings />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Thống kê tháng này</Text>
            <Text style={styles.summarySubtitle}>Bạn đang kiểm soát tốt chi tiêu</Text>
            <Text style={styles.summaryAmount}>2.4M đ</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <FilterChip label="Tất cả" active />
            <FilterChip label="Khoản chi" />
            <FilterChip label="Thanh toán" />
            <FilterChip label="Nhóm" />
          </ScrollView>

          {Array.from(new Set(transactions.map((t) => t.section))).map((section) => (
            <View key={String(section)} style={styles.section}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{section}</Text>
              </View>

              {transactions.filter((t) => t.section === section).map((item) => (
                <TransactionItem key={item.id} item={item} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7F4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6B7280", fontSize: 14 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 },
  summaryCard: {
    backgroundColor: "#16A34A",
    borderRadius: 28,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  summaryTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  summarySubtitle: { color: "#E6FFE9", marginTop: 6 },
  summaryAmount: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 12 },
  filterRow: { marginBottom: 2 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 10,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: "#0F5E28", borderColor: "#0F5E28" },
  chipInactive: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
  chipText: { fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  chipTextInactive: { color: "#374151" },
  section: { gap: 10 },
  sectionBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EDF1EF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  transactionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  transactionLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  avatarWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF7EF", alignItems: "center", justifyContent: "center" },
  avatarImageWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF7EF", alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  transactionTextWrap: { flex: 1, minWidth: 0 },
  transactionTitle: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#0F172A" },
  highlightText: { color: "#BA1A1A", fontWeight: "700", marginTop: 6 },
  transactionSubtitle: { color: "#6B7280", marginTop: 6, fontSize: 12 },
  transactionAmountWrap: { alignItems: "flex-end", marginLeft: 12, flexShrink: 0, minWidth: 72 },
  transactionAmount: { fontWeight: "800", fontSize: 14 },
});
