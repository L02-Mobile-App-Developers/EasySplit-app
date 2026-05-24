import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";

const mockFriendRequests = [
  { id: 1, name: "Minh Anh", initials: "MA", status: "Muốn kết bạn với bạn" },
  { id: 2, name: "Tuấn Khang", initials: "TK", status: "Muốn kết bạn với bạn" },
];

const mockFriendsList = [
  { id: 1, name: "Lan Tran", initials: "LT", debtStatus: "owed" as const, amount: 50000 },
  { id: 2, name: "Huy Le", initials: "HL", debtStatus: "owed" as const, amount: 120000 },
  { id: 3, name: "Ngoc Pham", initials: "NP", debtStatus: "settled" as const, amount: 0 },
  { id: 4, name: "Trung Nguyen", initials: "TN", debtStatus: "no_transaction" as const, amount: 0 },
];

export default function FriendScreen() {
  const { backgroundWhite, textColor, successGreen, errorRed, lightGray, darkGreen, tabIconDefault, lightGreen } = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: backgroundWhite }]}>
      <TopAppBar title="Bạn bè" showSearch showSettings />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={[styles.pageTitle, { color: textColor }]}>Kết nối và chia sẻ chi tiêu</Text>
          <Text style={styles.pageSubtitle}>
            Quản lý lời mời kết bạn, xem trạng thái nợ và thêm bạn nhanh hơn.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Lời mời kết bạn</Text>
            <Text style={{ color: darkGreen }}>{mockFriendRequests.length} mới</Text>
          </View>

          {mockFriendRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{request.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.friendName, { color: textColor }]}>{request.name}</Text>
                <Text style={styles.metaText}>{request.status}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.smallIconButton, { backgroundColor: darkGreen }]}>
                  <MaterialIcons name="check" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallIconButton, { backgroundColor: lightGray }]}>
                  <AntDesign name="close" size={16} color={textColor} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Danh sách bạn bè</Text>
            <Text style={{ color: tabIconDefault }}>{mockFriendsList.length} người</Text>
          </View>

          {mockFriendsList.map((friend) => {
            const statusLabel =
              friend.debtStatus === "owed"
                ? `Họ nợ bạn ${friend.amount.toLocaleString()}đ`
                : friend.debtStatus === "owes"
                  ? `Bạn nợ ${friend.amount.toLocaleString()}đ`
                  : friend.debtStatus === "settled"
                    ? "Đã cân bằng"
                    : "Chưa có giao dịch";

            const statusColor =
              friend.debtStatus === "owed"
                ? successGreen
                : friend.debtStatus === "owes"
                  ? errorRed
                  : tabIconDefault;

            return (
              <TouchableOpacity
                key={friend.id}
                activeOpacity={0.85}
                onPress={() => router.push("/friend/add")}
                style={styles.friendCard}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{friend.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: textColor }]}>{friend.name}</Text>
                  <Text style={[styles.metaText, { color: statusColor, fontWeight: "700" }]}>{statusLabel}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={tabIconDefault} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.helperCard}>
          <MaterialIcons name="group-add" size={28} color={darkGreen} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.helperTitle, { color: textColor }]}>Thêm bạn mới</Text>
            <Text style={styles.metaText}>Kết nối nhanh để chia sẻ chi phí trong các nhóm.</Text>
          </View>
          <TouchableOpacity style={[styles.ctaButton, { backgroundColor: lightGreen }]} onPress={() => router.push("/friend/add")}>
            <Text style={{ color: darkGreen, fontWeight: "800" }}>Mời</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  pageTitle: { fontSize: 28, fontWeight: "800" },
  pageSubtitle: { color: "#6B7280", lineHeight: 20 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EAF6EE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#0F5E28", fontWeight: "800" },
  friendName: { fontSize: 15, fontWeight: "800" },
  metaText: { color: "#6B7280", marginTop: 4, fontSize: 13 },
  actionRow: { flexDirection: "row", gap: 8 },
  smallIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  helperCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  helperTitle: { fontSize: 15, fontWeight: "800" },
  ctaButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
});
