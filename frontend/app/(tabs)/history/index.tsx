import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const mockTransactions = [
  {
    id: "t1",
    section: "HÔM NAY",
    icon: "silverware-fork-knife",
    iconBg: "#D8EEF9",
    title: [
      { text: "Lan", bold: true, color: "#16A34A" },
      { text: " đã thêm Bữa tối BBQ" },
    ],
    subtitle: "Vừa xong • Trong Nhóm Ăn Chơi",
    amount: "250.000đ",
    amountColor: "#0F172A",
    showChevron: false,
  },
  {
    id: "t2",
    section: "HÔM NAY",
    icon: "cash",
    iconBg: "#DFF7E8",
    title: [
      { text: "Bạn đã thanh toán cho " },
      { text: "Huy", bold: true },
    ],
    subtitle: "2 giờ trước",
    amount: "120.000đ",
    amountColor: "#16A34A",
    showChevron: false,
  },
  {
    id: "t3",
    section: "HÔM QUA",
    icon: "account-group",
    iconBg: "#FFEDE6",
    title: [{ text: "Bạn đã tham gia nhóm Du lịch Đà Lạt" }],
    subtitle: "18:30 • 4 thành viên",
    amount: null,
    amountColor: null,
    showChevron: true,
  },
  {
    id: "t4",
    section: "HÔM QUA",
    avatar: require("../../../assets/images/icon.png"),
    title: [
      { text: "Huy", bold: true },
      { text: " đã nhắc bạn trả nợ" },
    ],
    subtitle: "Hôm qua • Cần thanh toán gấp",
    amount: "350.000đ",
    amountColor: "#BA1A1A",
    amountHighlight: "Tiền điện tháng 10",
    showChevron: false,
  },
];

// ---------------------------------------------------------------------------
// Small, reusable components
// ---------------------------------------------------------------------------

const FilterChip: React.FC<{
  label: string;
  active?: boolean;
  onPress?: () => void;
}> = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      backgroundColor: active ? "#006E2F" : "#F0F1F2",
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      marginRight: 10,
    }}
  >
    <Text style={{ color: active ? "#fff" : "#374151", fontWeight: "600" }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const TransactionItem: React.FC<any> = ({ item, colors }) => {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {/* Icon or avatar */}
        {item.avatar ? (
          <Image
            source={item.avatar}
            style={{ width: 44, height: 44, borderRadius: 10 }}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: item.iconBg || "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons name={item.icon} size={20} color={"#0F172A"} />
          </View>
        )}

        {/* Text block */}
        <View style={{ maxWidth: 220 }}>
          <Text style={{ fontSize: 15, lineHeight: 20 }}>
            {item.title.map((part: any, idx: number) => (
              <Text
                key={idx}
                style={{
                  fontWeight: part.bold ? "700" : "500",
                  color: part.color ? part.color : "#0F172A",
                }}
              >
                {part.text}
              </Text>
            ))}
          </Text>
          {item.amountHighlight && (
            <Text style={{ color: "#BA1A1A", fontWeight: "700", marginTop: 6 }}>
              {item.amountHighlight}
            </Text>
          )}
          <Text style={{ color: "#6B7280", marginTop: 6 }}>{item.subtitle}</Text>
        </View>
      </View>

      {/* Amount or Chevron */}
      <View style={{ alignItems: "flex-end" }}>
        {item.showChevron ? (
          <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
        ) : (
          <Text style={{ color: item.amountColor || "#0F172A", fontWeight: "700" }}>
            {item.amount}
          </Text>
        )}
      </View>
    </View>
  );
};

const SummaryCard: React.FC = () => (
  <View
    style={{
      backgroundColor: "#16A34A",
      borderRadius: 20,
      padding: 20,
      marginTop: 12,
      overflow: "hidden",
    }}
  >
    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 6 }}>
      Thống kê tháng 10
    </Text>
    <Text style={{ color: "#E6FFE9", marginBottom: 12 }}>Bạn đang kiểm soát tốt chi tiêu</Text>
    <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800" }}>2.4M đ</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

// Simulate API call to fetch transactions
const fetchTransactions = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockTransactions);
    }, 2000); // 2 second delay
  });
};

export default function HistoryScreen() {
  const { backgroundColor } = useAppTheme();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      const data = await fetchTransactions() as any[];
      setTransactions(data);
      setLoading(false);
    };
    loadTransactions();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <TopAppBar title="EasySplit" showBack={false} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={{ marginTop: 12, color: "#6B7280", fontSize: 14 }}>Đang tải lịch sử...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#0F172A", marginBottom: 12 }}>Lịch sử</Text>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: "row", paddingBottom: 4 }}>
            <FilterChip label="Tất cả" active />
            <FilterChip label="Khoản chi" />
            <FilterChip label="Thanh toán" />
            <FilterChip label="Nhóm" />
          </View>
        </ScrollView>

        {/* Sections and transactions grouped by section */}
        {Array.from(new Set(transactions.map((t) => t.section))).map((section) => (
          <View key={String(section)} style={{ marginBottom: 14 }}>
            <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: "flex-start", marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#6B7280" }}>{section}</Text>
            </View>

            {transactions.filter((t) => t.section === section).map((item) => (
              <TransactionItem key={item.id} item={item} colors={{}} />
            ))}
          </View>
        ))}

          {/* Summary Card */}
          <SummaryCard />
        </ScrollView>
      )}
    </View>
  );
}
