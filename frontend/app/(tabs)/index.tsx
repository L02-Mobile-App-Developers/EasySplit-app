import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator } from "react-native";

import { activityService } from "@/api/services/activity.service";
import { balanceService } from "@/api/services/balance.service";
import { groupService } from "@/api/services/group.service";
import { useHomeStore } from "@/store/home.store";
import type { Group } from "@/api/types/group";
import TopAppBar from "@/components/TopAppBar";
import { ThemedText } from "@/components/ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useTabCacheRefresh } from "@/hooks/useTabCacheRefresh";

type HomeActivity = {
  id: string;
  image: any;
  description: string;
  time: string;
  money: number;
  type: "received" | "paid";
};

type HomeGroup = Pick<Group, "id" | "name" | "memberCount" | "status" | "latestActivity">;

type HomeData = {
  groups: HomeGroup[];
  recentActivities: HomeActivity[];
  netBalance: number;
  owedBalance: number;
  receivableBalance: number;
};

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
  const getHomeCacheEntry = useHomeStore((s) => s.getCacheEntry);
  const setHomeCache = useHomeStore((s) => s.setCache);

  const applyHomeCache = useCallback((data: HomeData, options: { clearError?: boolean } = {}) => {
    setGroups(data.groups ?? []);
    setRecentActivities(data.recentActivities ?? []);
    setNetBalance(data.netBalance ?? 0);
    setOwedBalance(data.owedBalance ?? 0);
    setReceivableBalance(data.receivableBalance ?? 0);
    if (options.clearError !== false) {
      setError(null);
    }
  }, []);

  const refreshHome = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const groupList = await groupService.getGroups();
        const allGroups = groupList as HomeGroup[];
        const scopedGroups = allGroups.slice(0, 2);

        if (allGroups.length === 0) {
          const empty = { groups: [], recentActivities: [], netBalance: 0, owedBalance: 0, receivableBalance: 0 };
          applyHomeCache(empty);
          setHomeCache(empty);
          return;
        }

        const cachedHomeData = getHomeCacheEntry()?.data;
        const initialData = {
          groups: scopedGroups,
          recentActivities: scopedGroups
            .map((group) => group.latestActivity ? mapHomeActivity(group, group.latestActivity) : null)
            .filter((activity): activity is HomeActivity & { sortKey: number } => Boolean(activity))
            .sort((left, right) => right.sortKey - left.sortKey)
            .slice(0, 3),
          netBalance: cachedHomeData?.netBalance ?? 0,
          owedBalance: cachedHomeData?.owedBalance ?? 0,
          receivableBalance: cachedHomeData?.receivableBalance ?? 0,
        };

        applyHomeCache(initialData);
        if (!silent) setLoading(false);

        const [balanceResults, activityResults] = await Promise.all([
          Promise.allSettled(
            allGroups.map(async (group) => {
              const myBalance = await balanceService.getMyBalance(group.id);
              return normalizeMoney(myBalance.balance);
            }),
          ),
          Promise.all(
            scopedGroups.map(async (group) => {
              try {
                const activities = await activityService.getActivities(group.id, { page: 1, limit: 1 });
                return {
                  group,
                  latestActivity: activities.items?.[0] ?? group.latestActivity ?? null,
                };
              } catch {
                return {
                  group,
                  latestActivity: group.latestActivity ?? null,
                };
              }
            }),
          ),
        ]);
        const balances = balanceResults.map((result) =>
          result.status === "fulfilled" ? result.value : 0,
        );
        const hasBalanceError = balanceResults.some((result) => result.status === "rejected");

        const net = balances.reduce((sum, current) => sum + current, 0);
        const rec = balances.filter((value) => value > 0).reduce((sum, current) => sum + current, 0);
        const owed = Math.abs(balances.filter((value) => value < 0).reduce((sum, current) => sum + current, 0));

        const activities: Array<HomeActivity & { sortKey: number }> = [];
        activityResults.forEach((result) => {
          if (result.latestActivity) {
            activities.push(mapHomeActivity(result.group, result.latestActivity));
          }
        });

        const recent = activities.sort((left, right) => right.sortKey - left.sortKey).slice(0, 3);
        const nextData = { groups: scopedGroups, recentActivities: recent, netBalance: net, owedBalance: owed, receivableBalance: rec };

        applyHomeCache(nextData, { clearError: !hasBalanceError });
        if (hasBalanceError) {
          setError("Không thể tải đầy đủ số dư trang chủ.");
        }
        setHomeCache(nextData);
      } catch (fetchError) {
        console.log("Get home data error:", fetchError);
        setError("Không thể tải dữ liệu trang chủ.");
        const cachedData = getHomeCacheEntry()?.data;
        applyHomeCache(
          cachedData ?? { groups: [], recentActivities: [], netBalance: 0, owedBalance: 0, receivableBalance: 0 },
          { clearError: false },
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [applyHomeCache, getHomeCacheEntry, setHomeCache],
  );

  useTabCacheRefresh({
    getCacheEntry: getHomeCacheEntry,
    applyCache: applyHomeCache,
    refresh: refreshHome,
    ttlMs: 60_000,
  });

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

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <ActivityIndicator size="large" color={successGreen} />
          <ThemedText style={{ marginTop: 12 }}>Đang tải trang chủ...</ThemedText>
        </View>
      ) : (
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
                  <ThemedText style={styles.activityMoney}>{item.money.toLocaleString()} VND</ThemedText>
                  <ThemedText style={styles.activityType}>
                    {item.type === "received" ? "Được nhận" : "Đã trả"}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
        </ScrollView>
      )}
    </>
  );
}

function mapHomeActivity(group: HomeGroup, activity: any): HomeActivity & { sortKey: number } {
  const description = localizeHomeActivity(group, activity);
  const createdAt = activity.createdAt ?? activity.time ?? new Date().toISOString();
  const money = typeof activity.amount === "number" ? activity.amount : typeof activity.money === "number" ? activity.money : 0;
  const type: HomeActivity["type"] = money >= 0 ? "received" : "paid";

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

function localizeHomeActivity(group: HomeGroup, activity: any) {
  const actor = activity.actorDisplayName ?? activity.actor?.displayName ?? "Một thành viên";
  const action = String(activity.action ?? activity.description ?? activity.title ?? "").trim();
  const normalizedAction = action.toLowerCase().replace(/[:.]/g, "_");

  switch (normalizedAction) {
    case "group_created":
    case "group_create":
      return `${actor} đã tạo nhóm ${group.name}`;
    case "group_closed":
    case "group_close":
      return `${actor} đã quyết toán nhóm ${group.name}`;
    case "expense_created":
    case "expense_create":
      return `${actor} đã thêm khoản chi trong ${group.name}`;
    case "expense_updated":
    case "expense_update":
      return `${actor} đã cập nhật khoản chi trong ${group.name}`;
    case "expense_deleted":
    case "expense_delete":
      return `${actor} đã xóa khoản chi trong ${group.name}`;
    case "settlement_created":
    case "settlement_create":
      return `${actor} đã tạo thanh toán trong ${group.name}`;
    case "settlement_updated":
    case "settlement_update":
      return `${actor} đã cập nhật thanh toán trong ${group.name}`;
    case "member_added":
    case "member_join":
    case "member_created":
      return `${actor} đã tham gia nhóm ${group.name}`;
    case "member_removed":
    case "member_delete":
      return `${actor} đã rời nhóm ${group.name}`;
    case "reminder_created":
    case "reminder_create":
      return `${actor} đã tạo nhắc nhở trong ${group.name}`;
    case "smart_settle":
    case "smart_settlement":
    case "group_settlement_committed":
      return `${actor} đã thực hiện thanh toán thông minh trong ${group.name}`;
    default:
      return translateRawActivityText(action, group.name);
  }
}

function translateRawActivityText(text: string, groupName: string) {
  if (!text) return `${groupName} có hoạt động mới`;

  const normalized = text.toLowerCase();
  if (/[à-ỹđ]/i.test(text)) return text;
  if (normalized.includes("expense")) return `Có cập nhật khoản chi trong ${groupName}`;
  if (normalized.includes("settlement") || normalized.includes("paid") || normalized.includes("payment")) {
    return `Có cập nhật thanh toán trong ${groupName}`;
  }
  if (normalized.includes("member") || normalized.includes("joined") || normalized.includes("left")) {
    return `Có cập nhật thành viên trong ${groupName}`;
  }
  if (normalized.includes("group")) return `Có cập nhật nhóm ${groupName}`;

  return `${groupName} có hoạt động mới`;
}

function normalizeMoney(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
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
