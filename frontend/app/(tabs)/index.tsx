import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { activityService } from "@/api/services/activity.service";
import { balanceService } from "@/api/services/balance.service";
import { groupService } from "@/api/services/group.service";
import type { Group } from "@/api/types/group";
import TopAppBar from "@/components/TopAppBar";
import { ThemedText } from "@/components/ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";

type HomeActivity = {
  id: string;
  image: any;
  description: string;
  time: string;
  money: number;
  type: "received" | "paid";
};

type HomeGroup = Pick<Group, "id" | "name" | "memberCount" | "status">;

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
  const [groups, setGroups] = useState<HomeGroup[]>([]);
  const [recentActivities, setRecentActivities] = useState<HomeActivity[]>([]);
  const [netBalance, setNetBalance] = useState(0);
  const [owedBalance, setOwedBalance] = useState(0);
  const [receivableBalance, setReceivableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHome = async () => {
      setLoading(true);
      setError(null);

      try {
        const groupList = await groupService.getGroups();
        const scopedGroups = groupList.slice(0, 2) as HomeGroup[];

        setGroups(scopedGroups);

        if (scopedGroups.length === 0) {
          setRecentActivities([]);
          setNetBalance(0);
          setOwedBalance(0);
          setReceivableBalance(0);
          return;
        }

        const results = await Promise.all(
          scopedGroups.map(async (group) => {
            const [myBalance, activities] = await Promise.all([
              balanceService.getMyBalance(group.id),
              activityService.getActivities(group.id, { page: 1, limit: 1 }),
            ]);

            return {
              group,
              myBalance,
              latestActivity: activities.items?.[0] ?? null,
            };
          }),
        );

        const balances = results.map((item) => item.myBalance.balance ?? 0);
        setNetBalance(balances.reduce((sum, current) => sum + current, 0));
        setReceivableBalance(balances.filter((value) => value > 0).reduce((sum, current) => sum + current, 0));
        setOwedBalance(Math.abs(balances.filter((value) => value < 0).reduce((sum, current) => sum + current, 0)));

        const activities = results
          .filter((item) => Boolean(item.latestActivity))
          .map((item) => mapHomeActivity(item.group, item.latestActivity));

        setRecentActivities(
          activities.sort((left, right) => right.sortKey - left.sortKey).slice(0, 3),
        );
      } catch (fetchError) {
        console.log("Get home data error:", fetchError);
        setError("Không thể tải dữ liệu trang chủ.");
        setGroups([]);
        setRecentActivities([]);
        setNetBalance(0);
        setOwedBalance(0);
        setReceivableBalance(0);
      } finally {
        setLoading(false);
      }
    };

    loadHome();
  }, []);

  const money = useMemo(() => Math.abs(netBalance), [netBalance]);

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
        {error ? (
          <View style={styles.errorCard}>
            <ThemedText fontWeight="semibold" style={styles.errorText}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <ThemedText style={[styles.badgeText, { color: selected }]}>Overview</ThemedText>
          </View>
          <ThemedText fontWeight="bold" style={[styles.heroTitle, { color: textColor }]}>Tổng chênh lệch</ThemedText>
          <ThemedText fontWeight="bold" style={[styles.heroAmount, { color: netBalance >= 0 ? successGreen : errorRed }]}> {netBalance >= 0 ? "+" : "-"}{money.toLocaleString()} VND</ThemedText>
          <View style={styles.heroPill}>
            <ThemedText fontWeight="semibold" style={[styles.pillText, { color: textColor }]}>
              {netBalance >= 0 ? "Dòng tiền dương" : "Dòng tiền âm"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.dualRow}>
          <View style={[styles.dualCard, { backgroundColor: "#FDECEC" }]}>
            <ThemedText fontWeight="bold" style={[styles.dualLabel, { color: errorRed }]}>Bạn đang nợ</ThemedText>
            <ThemedText fontWeight="bold" style={[styles.dualValue, { color: errorRed }]}>{owedBalance.toLocaleString()} VND</ThemedText>
          </View>
          <View style={[styles.dualCard, { backgroundColor: "#E8F7EE" }]}>
            <ThemedText fontWeight="bold" style={[styles.dualLabel, { color: successGreen }]}>Bạn được nhận</ThemedText>
            <ThemedText fontWeight="bold" style={[styles.dualValue, { color: successGreen }]}>{receivableBalance.toLocaleString()} VND</ThemedText>
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
            {groups.length === 0 ? (
              <View style={styles.emptyCard}>
                <ThemedText style={styles.emptyText}>Chưa có nhóm nào.</ThemedText>
              </View>
            ) : null}

            {groups.map((item) => (
              <View key={item.id} style={styles.groupCard}>
                <View style={styles.groupIconWrap}>
                  <MaterialIcons name="tour" size={24} color="#1E8E3E" />
                </View>
                <ThemedText numberOfLines={1} ellipsizeMode="tail" fontWeight="bold" style={styles.groupName}>
                  {item.name}
                </ThemedText>
                <ThemedText style={styles.groupMembers}>{item.memberCount} thành viên</ThemedText>
                <ThemedText style={styles.groupStatus}>{item.status === "closed" ? "Đã quyết toán" : "Đang hoạt động"}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Hoạt động gần đây</ThemedText>
          {recentActivities.length === 0 ? (
            <View style={styles.emptyCard}>
              <ThemedText style={styles.emptyText}>Chưa có hoạt động gần đây.</ThemedText>
            </View>
          ) : null}

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

function mapHomeActivity(group: HomeGroup, activity: any) {
  const description = activity.description ?? activity.title ?? activity.action ?? `${group.name} có hoạt động mới`;
  const createdAt = activity.createdAt ?? activity.time ?? new Date().toISOString();
  const money = typeof activity.amount === "number" ? activity.amount : typeof activity.money === "number" ? activity.money : 0;
  const type = money >= 0 ? "received" : "paid";

  return {
    id: String(activity.id ?? `${group.id}-${createdAt}`),
    image: require("../../assets/images/icon.png"),
    description,
    time: formatRelativeTime(createdAt),
    money: Math.abs(money),
    type,
    sortKey: new Date(createdAt).getTime(),
  };
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (Number.isNaN(date.getTime())) return "Vừa xong";
  if (diffHours < 1) return "Vừa xong";
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
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
  errorCard: {
    backgroundColor: "#FFF1F1",
    borderRadius: 18,
    padding: 14,
  },
  errorText: {
    color: "#BA1A1A",
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
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
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
