import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { activityService } from "@/api/services/activity.service";
import { groupService } from "@/api/services/group.service";
import type { AuditLog } from "@/api/types/activity";
import type { Group } from "@/api/types/group";
import TopAppBar from "@/components/TopAppBar";

type HistoryItem = AuditLog & {
  actor?: {
    id: string;
    displayName: string;
    email: string | null;
    avatarUrl?: string | null;
  } | null;
  before?: any;
  after?: any;
};

const FilterChip: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
  >
    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>{label}</Text>
  </TouchableOpacity>
);

const TransactionItem: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const displayItem = mapHistoryItem(item);

  return (
    <View style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        {item.actor?.avatarUrl ? (
          <Image source={{ uri: item.actor.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: displayItem.iconBg }]}>
            <MaterialCommunityIcons name={displayItem.icon} size={20} color="#0F172A" />
          </View>
        )}

        <View style={styles.transactionTextWrap}>
          <Text style={styles.transactionTitle}>{displayItem.title}</Text>
          {displayItem.amountHighlight ? <Text style={styles.highlightText}>{displayItem.amountHighlight}</Text> : null}
          <Text style={styles.transactionSubtitle}>{displayItem.subtitle}</Text>
        </View>
      </View>

      <View style={styles.transactionAmountWrap}>
        {displayItem.amount ? (
          <Text style={[styles.transactionAmount, { color: displayItem.amountColor }]}>{displayItem.amount}</Text>
        ) : (
          <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
        )}
      </View>
    </View>
  );
};

export default function HistoryScreen() {
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [transactions, setTransactions] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const groupData = await groupService.getGroups();

        const selectedGroup = groupData.find((group) => group.status === "active") ?? groupData[0] ?? null;
        setActiveGroup(selectedGroup);

        if (!selectedGroup) {
          setTransactions([]);
          return;
        }

        const history = await activityService.getHistory(selectedGroup.id);
        setTransactions(history.items as HistoryItem[]);
      } catch (fetchError) {
        console.log("Get history error:", fetchError);
        setError("Không thể tải lịch sử.");
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  const groupedTransactions = useMemo(() => {
    const sorted = [...transactions].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    const grouped = new Map<string, HistoryItem[]>();

    sorted.forEach((item) => {
      const section = getSectionLabel(item.createdAt);
      const currentItems = grouped.get(section) ?? [];
      currentItems.push(item);
      grouped.set(section, currentItems);
    });

    return Array.from(grouped.entries());
  }, [transactions]);

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
            <Text style={styles.summaryTitle}>Lịch sử tài chính</Text>
            <Text style={styles.summarySubtitle}>{activeGroup ? `Nhóm: ${activeGroup.name}` : "Bạn chưa có nhóm nào"}</Text>
            <Text style={styles.summaryAmount}>{transactions.length} mục</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <FilterChip label="Tất cả" active />
            <FilterChip label="Khoản chi" />
            <FilterChip label="Thanh toán" />
            <FilterChip label="Nhóm" />
          </ScrollView>

          {error ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="error-outline" size={28} color="#6B7280" />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : null}

          {!error && groupedTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="history" size={28} color="#6B7280" />
              <Text style={styles.emptyText}>Chưa có lịch sử để hiển thị.</Text>
            </View>
          ) : null}

          {groupedTransactions.map(([section, items]) => (
            <View key={section} style={styles.section}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{section}</Text>
              </View>

              {items.map((item) => (
                <TransactionItem key={item.id} item={item} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function getSectionLabel(createdAt: string) {
  const date = new Date(createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((today - itemDay) / 86400000);

  if (diffDays === 0) return "HÔM NAY";
  if (diffDays === 1) return "HÔM QUA";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value?: number | null, currency = "đ") {
  if (typeof value !== "number") return null;

  return `${new Intl.NumberFormat("vi-VN").format(value)}${currency ? ` ${currency}` : ""}`;
}

function mapHistoryItem(item: HistoryItem) {
  const actorName = item.actor?.displayName ?? "Một thành viên";
  const actionLabel = getActionLabel(item.action);
  const entityLabel = getEntityLabel(item.entityType);
  const amount = formatMoney(item.after?.amount ?? item.before?.amount, item.after?.currency ?? item.before?.currency ?? "đ");

  return {
    icon: getEntityIcon(item.entityType),
    iconBg: getEntityColor(item.entityType),
    title: `${actorName} ${actionLabel} ${entityLabel}`,
    subtitle: new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(item.createdAt)),
    amount,
    amountColor: item.action.includes("delete") ? "#BA1A1A" : "#0F172A",
    amountHighlight: item.entityType === "expense" && item.after?.description ? item.after.description : undefined,
  };
}

function getActionLabel(action: string) {
  if (action.includes("create")) return "đã tạo";
  if (action.includes("update")) return "đã cập nhật";
  if (action.includes("delete")) return "đã xóa";
  if (action.includes("settle")) return "đã quyết toán";
  if (action.includes("member")) return "đã thay đổi thành viên";
  return "đã thực hiện";
}

function getEntityLabel(entityType: string) {
  if (entityType === "expense") return "khoản chi";
  if (entityType === "settlement") return "giao dịch thanh toán";
  if (entityType === "reminder") return "nhắc nhở";
  if (entityType === "member") return "thành viên";
  if (entityType === "group") return "nhóm";
  return entityType;
}

function getEntityIcon(entityType: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (entityType === "expense") return "silverware-fork-knife";
  if (entityType === "settlement") return "cash";
  if (entityType === "reminder") return "bell-outline";
  if (entityType === "member") return "account-group";
  return "history";
}

function getEntityColor(entityType: string) {
  if (entityType === "expense") return "#D8EEF9";
  if (entityType === "settlement") return "#DFF7E8";
  if (entityType === "reminder") return "#FFEED8";
  if (entityType === "member") return "#FFEDE6";
  return "#EEF2F7";
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
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF7EF" },
  avatarWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF7EF", alignItems: "center", justifyContent: "center" },
  avatarImageWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF7EF", alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  transactionTextWrap: { flex: 1, minWidth: 0 },
  transactionTitle: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#0F172A" },
  highlightText: { color: "#BA1A1A", fontWeight: "700", marginTop: 6 },
  transactionSubtitle: { color: "#6B7280", marginTop: 6, fontSize: 12 },
  transactionAmountWrap: { alignItems: "flex-end", marginLeft: 12, flexShrink: 0, minWidth: 72 },
  transactionAmount: { fontWeight: "800", fontSize: 14 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyText: { color: "#6B7280", textAlign: "center" },
});
