import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import TopAppBar from "@/components/TopAppBar";
import { ThemedText } from "@/components/ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";

const money = 123456789;

const recentActivities = [
  {
    id: 1,
    image: require("../../assets/images/icon.png"),
    description: "A đã thanh toán cho Trà sữa",
    time: "2 giờ trước",
    money: 50000,
    type: "received",
  },
  {
    id: 2,
    image: require("../../assets/images/icon.png"),
    description: "B đã thanh toán cho Ăn tối",
    time: "4 giờ trước",
    money: 120000,
    type: "received",
  },
  {
    id: 3,
    image: require("../../assets/images/icon.png"),
    description: "Cần chia tiền vé xe",
    time: "1 ngày trước",
    money: 98000,
    type: "paid",
  },
];

const recentGroups = [
  {
    id: 1,
    name: "Du lịch Đà Lạt",
    members: 4,
    status: "Đang cân bằng",
  },
  {
    id: 2,
    name: "Ăn uống phòng trọ",
    members: 4,
    status: "Đang cân bằng",
  },
];

const quickActions = [
  {
    id: 11,
    icon: <AntDesign name="usergroup-add" size={24} color="#1E8E3E" />,
    label: "Tạo nhóm",
    route: "/group/add",
  },
  {
    id: 21,
    icon: <AntDesign name="user-add" size={24} color="#1E8E3E" />,
    label: "Thêm bạn",
    route: "/friend/add",
  },
];

export default function Index() {
  const { textColor, selected, successGreen, errorRed } = useAppTheme();

  const handleSearch = () => undefined;

  const handleSettings = () => {
    router.push("/profile" as any);
  };

  return (
    <>
      <TopAppBar
        title="EasySplit"
        showBack={false}
        showSearch
        showSettings
        onSearchPress={handleSearch}
        onSettingsPress={handleSettings}
      />

      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <ThemedText style={[styles.badgeText, { color: selected }]}>Overview</ThemedText>
          </View>
          <ThemedText fontWeight="bold" style={[styles.heroTitle, { color: textColor }]}>Tổng chênh lệch</ThemedText>
          <ThemedText fontWeight="bold" style={[styles.heroAmount, { color: successGreen }]}>+{money.toLocaleString()} VND</ThemedText>
          <View style={styles.heroPill}>
            <ThemedText fontWeight="semibold" style={[styles.pillText, { color: textColor }]}>Dòng tiền dương</ThemedText>
          </View>
        </View>

        <View style={styles.dualRow}>
          <View style={[styles.dualCard, { backgroundColor: "#FDECEC" }]}>
            <ThemedText fontWeight="bold" style={[styles.dualLabel, { color: errorRed }]}>Bạn đang nợ</ThemedText>
            <ThemedText fontWeight="bold" style={[styles.dualValue, { color: errorRed }]}>{money.toLocaleString()} VND</ThemedText>
          </View>
          <View style={[styles.dualCard, { backgroundColor: "#E8F7EE" }]}>
            <ThemedText fontWeight="bold" style={[styles.dualLabel, { color: successGreen }]}>Bạn được nhận</ThemedText>
            <ThemedText fontWeight="bold" style={[styles.dualValue, { color: successGreen }]}>{money.toLocaleString()} VND</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Thao tác nhanh</ThemedText>
          <View style={styles.quickGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => router.push(item.route as any)}
                style={styles.quickAction}
              >
                <View style={styles.quickIconWrap}>{item.icon}</View>
                <ThemedText style={styles.quickLabel}>{item.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText style={styles.sectionTitle}>Nhóm gần đây</ThemedText>
            <ThemedText style={{ color: selected }}>Xem tất cả</ThemedText>
          </View>

          <View style={styles.cardGrid}>
            {recentGroups.map((item) => (
              <View key={item.id} style={styles.groupCard}>
                <View style={styles.groupIconWrap}>
                  <MaterialIcons name="tour" size={24} color="#1E8E3E" />
                </View>
                <ThemedText numberOfLines={1} ellipsizeMode="tail" fontWeight="bold" style={styles.groupName}>
                  {item.name}
                </ThemedText>
                <ThemedText style={styles.groupMembers}>{item.members} thành viên</ThemedText>
                <ThemedText style={styles.groupStatus}>{item.status}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Hoạt động gần đây</ThemedText>
          {recentActivities.map((item) => (
            <View key={item.id} style={styles.activityCard}>
              <Image source={item.image} style={styles.activityAvatar} />
              <View style={styles.activityBody}>
                <View style={styles.activityLeft}>
                  <ThemedText numberOfLines={1} ellipsizeMode="tail" style={styles.activityDescription}>
                    {item.description}
                  </ThemedText>
                  <ThemedText style={styles.activityTime}>{item.time}</ThemedText>
                </View>
                <View style={styles.activityRight}>
                  <ThemedText style={styles.activityMoney}>${item.money}</ThemedText>
                  <ThemedText style={styles.activityType}>
                    {item.type === "received" ? "Lấy lại" : "Cần trả"}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 18,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 18,
  },
  heroAmount: {
    fontSize: 30,
  },
  dualLabel: {
    fontSize: 14,
  },
  heroPill: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignSelf: "flex-start",
    minWidth: "52%",
  },
  pillText: {
    textAlign: "center",
  },
  dualRow: {
    flexDirection: "row",
    gap: 12,
  },
  dualCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    gap: 10,
  },
  dualValue: {
    fontSize: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
  },
  quickIconWrap: {
    backgroundColor: "#EAF6EE",
    padding: 18,
    borderRadius: 20,
  },
  quickLabel: {
    marginTop: 8,
    textAlign: "center",
  },
  cardGrid: {
    flexDirection: "row",
    gap: 12,
  },
  groupCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  groupIconWrap: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  groupName: {
    fontSize: 16,
  },
  groupMembers: {
    fontSize: 14,
  },
  groupStatus: {
    marginTop: 12,
    color: "#5F6368",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  activityBody: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  activityLeft: {
    flex: 1,
    gap: 4,
  },
  activityDescription: {
    fontSize: 14,
  },
  activityTime: {
    fontSize: 12,
    color: "#5F6368",
  },
  activityRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  activityMoney: {
    fontSize: 14,
    fontWeight: "700",
  },
  activityType: {
    fontSize: 12,
    color: "#5F6368",
  },
});
