import { AntDesign, EvilIcons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { groupService } from "@/api/services/group.service";
import type { Group } from "@/api/types/group";
import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useTabCacheRefresh } from "@/hooks/useTabCacheRefresh";
import { useGroupStore } from "@/store/group.store";

const statusFilters = [
  { id: 10, name: "Tất cả" },
  { id: 20, name: "Đang hoạt động" },
  { id: 30, name: "Đã quyết toán" },
];

export default function GroupScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(10);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activitiesMap, setActivitiesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const getGroupListCacheEntry = useGroupStore((s) => s.getGroupListCacheEntry);
  const setGroupListCache = useGroupStore((s) => s.setGroupListCache);

  const {
    lightGray,
    tabIconDefault,
    backgroundWhite,
    textColor,
    successGreen,
    errorRed,
    lightGreen,
    darkGreen,
  } = useAppTheme();

  const applyGroupListCache = useCallback((data: Group[]) => {
    setGroups(data);
    const aMap: Record<string, any> = {};
    const map: Record<string, string | undefined> = {};
    data.forEach((g) => {
      map[g.id] = g.role;
      if ((g as any).latestActivity) {
        aMap[g.id] = (g as any).latestActivity;
      }
    });
    useGroupStore.getState().setRoles(map);
    setActivitiesMap(aMap);
  }, []);

  const refreshGroups = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      try {
        const data = await groupService.getGroups();
        applyGroupListCache(data as Group[]);
        setGroupListCache(data as Group[]);
      } catch (error) {
        console.log("Get groups error:", error);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [applyGroupListCache, setGroupListCache],
  );

  useTabCacheRefresh({
    getCacheEntry: getGroupListCacheEntry,
    applyCache: applyGroupListCache,
    refresh: refreshGroups,
    ttlMs: 0,
  });

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const matchSearch = group.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchStatus =
        selectedStatus === 10
          ? true
          : selectedStatus === 20
            ? group.status === "active"
            : group.status === "closed";
      return matchSearch && matchStatus;
    });
  }, [groups, searchQuery, selectedStatus]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: backgroundWhite }]}>
        <ActivityIndicator size="large" color={darkGreen} />
        <Text style={styles.loadingText}>Đang tải nhóm...</Text>
      </View>
    );
  }

  const handleSearch = () => undefined;

  const handleSettings = () => undefined;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshGroups({ silent: true });
  };

  return (
    <View style={[styles.screen, { backgroundColor: backgroundWhite }]}>
      <TopAppBar
        title="Nhóm"
        showSearch
        showSettings
        onSettingsPress={handleSettings}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: darkGreen }]}
        onPress={() => router.push("/group/add")}
        activeOpacity={0.85}
      >
        <AntDesign name="plus" size={20} color="white" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={undefined}
      >
        {/* <View style={styles.headerCard}>
          <Text style={[styles.pageTitle, { color: textColor }]}>
            Nhóm của bạn
          </Text>
          <Text style={styles.pageSubtitle}>
            Quản lý chi tiêu theo từng nhóm với giao diện mới gọn và rõ hơn.
          </Text>
        </View> */}

        <View style={[styles.searchBar, { backgroundColor: lightGray }]}>
          <EvilIcons name="search" size={24} color={tabIconDefault} />
          <TextInput
            placeholder="Tìm kiếm nhóm..."
            placeholderTextColor={tabIconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
        >
          {statusFilters.map((filter) => {
            const active = selectedStatus === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                activeOpacity={0.8}
                onPress={() => setSelectedStatus(filter.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? lightGreen : "#FFFFFF",
                    borderColor: active ? lightGreen : lightGray,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? darkGreen : textColor },
                  ]}
                >
                  {filter.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Danh sách nhóm
          </Text>
          <Text style={{ color: successGreen }}>
            {filteredGroups.length} nhóm
          </Text>
        </View>

        <View style={styles.groupList}>
          {filteredGroups.map((group) => {
            const latest =
              activitiesMap[group.id] ?? (group as any).latestActivity;
            const formatActivity = (act: any) => {
              if (!act) return "Chưa có hoạt động nào";
              const raw = act.description ?? act.action ?? "";
              const action = String(raw).trim();
              const actor =
                act.actorDisplayName ??
                act.actor?.displayName ??
                "Một thành viên";

              // Known exact mappings
              switch (action) {
                case "expense_created":
                case "expense.create":
                case "expense:created":
                  return `${actor} đã thêm khoản chi`;
                case "expense_updated":
                case "expense.update":
                  return `${actor} đã cập nhật khoản chi`;
                case "settlement_created":
                case "settlement.create":
                  return `${actor} đã tạo quyết toán`;
                case "member_added":
                case "member.join":
                  return `${actor} đã tham gia nhóm`;
                case "group_closed":
                case "group.close":
                  return `${actor} đã quyết toán nhóm`;
              }

              // If the action looks like a machine code (contains _ or . or :), try to build a Vietnamese phrase
              if (/[_.:]/.test(action)) {
                const normal = action.replace(/[_.:]+/g, " ").toLowerCase();
                const tokens = normal.split(/\s+/).filter(Boolean);

                const verbMap: Record<string, string> = {
                  created: "đã thêm",
                  create: "đã tạo",
                  added: "đã thêm",
                  updated: "đã cập nhật",
                  update: "đã cập nhật",
                  deleted: "đã xóa",
                  removed: "đã xóa",
                  joined: "đã tham gia",
                  join: "đã tham gia",
                  closed: "đã quyết toán",
                  settle: "đã quyết toán",
                  settlement: "quyết toán",
                  payment: "thanh toán",
                  paid: "đã thanh toán",
                  refunded: "đã hoàn trả",
                  comment: "bình luận",
                  expense: "khoản chi",
                  member: "thành viên",
                  group: "nhóm",
                };

                let verb = "";
                const objects: string[] = [];
                for (const t of tokens) {
                  if (
                    !verb &&
                    verbMap[t] &&
                    /(created|create|added|updated|update|deleted|removed|joined|join|closed|settle|paid|refunded)/.test(
                      t,
                    )
                  ) {
                    verb = verbMap[t];
                    continue;
                  }
                  // treat settlement and expense as object words
                  if (t in verbMap && !verb) {
                    // if it's a noun like 'expense' or 'settlement', keep for objects
                    objects.push(verbMap[t]);
                    continue;
                  }
                  // default: keep token (could be 'by' or other connector)
                  objects.push(t);
                }

                const objectText = objects
                  .join(" ")
                  .replace(/\s+/g, " ")
                  .trim();
                if (verb) {
                  return `${actor} ${verb}${objectText ? " " + objectText : ""}`.trim();
                }

                if (objectText) {
                  // Capitalize first letter of objectText and return as short description
                  return `${actor} ${objectText}`;
                }
              }

              // If action is a free-form description (likely already readable), attempt small replacements
              if (action) {
                const replaced = action
                  .replace(/_/g, " ")
                  .replace(/\./g, " ")
                  .replace(/added/gi, "đã thêm")
                  .replace(/created/gi, "đã tạo")
                  .replace(/updated/gi, "đã cập nhật")
                  .replace(/joined/gi, "đã tham gia")
                  .replace(/closed/gi, "đã quyết toán")
                  .replace(/expense/gi, "khoản chi")
                  .replace(/member/gi, "thành viên")
                  .replace(/settlement/gi, "quyết toán");

                // If the replaced text is short, prepend actor when it looks like an action phrase
                if (/\b(đã|đang)\b/.test(replaced)) {
                  return `${actor} ${replaced}`;
                }

                return replaced || "Hoạt động";
              }

              return "Hoạt động";
            };
            return (
              <TouchableOpacity
                key={group.id}
                activeOpacity={0.85}
                onPress={() => router.push(`/group/${group.id}` as any)}
                style={styles.groupCard}
              >
                <View style={styles.groupCardTop}>
                  <View
                    style={[styles.groupIcon, { backgroundColor: lightGreen }]}
                  >
                    <MaterialIcons name="groups" size={22} color={darkGreen} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.groupName, { color: textColor }]}
                    >
                      {group.name}
                    </Text>
                    <Text style={styles.groupMeta}>
                      {group.memberCount ?? 0} thành viên
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          group.status === "closed" ? "#FDECEC" : "#E8F7EE",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          group.status === "closed" ? errorRed : successGreen,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {group.status === "closed"
                        ? "Đã quyết toán"
                        : "Đang hoạt động"}
                    </Text>
                  </View>
                </View>

                <View style={styles.activityBox}>
                  <Text style={styles.activityLabel}>Hoạt động gần nhất</Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.activityText, { color: textColor }]}
                  >
                    {formatActivity(latest)}
                  </Text>
                  <Text style={styles.activityTime}>
                    {latest?.time
                      ? new Date(latest.time).toLocaleString()
                      : "-"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {!refreshing && filteredGroups.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialIcons name="group-off" size={28} color={tabIconDefault} />
            <Text style={styles.emptyText}>Không tìm thấy nhóm phù hợp.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6B7280" },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  pageTitle: { fontSize: 28, fontWeight: "800" },
  pageSubtitle: { marginTop: 8, color: "#6B7280", lineHeight: 20 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  chipRow: { marginBottom: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },
  chipText: { fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  groupList: { gap: 12 },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  groupCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  groupIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: { fontSize: 16, fontWeight: "800" },
  groupMeta: { marginTop: 4, color: "#6B7280" },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activityBox: {
    backgroundColor: "#F7F9F7",
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  activityLabel: { fontSize: 12, color: "#6B7280", textTransform: "uppercase" },
  activityText: { fontSize: 14, fontWeight: "600" },
  activityTime: { fontSize: 12, color: "#6B7280" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyText: { color: "#6B7280" },
});
