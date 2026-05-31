import { reminderService } from "@/api/services/reminder.service";
import { useAuthStore } from "@/store/auth.store";
import { useGroupStore } from "@/store/group.store";
import { useHomeStore } from "@/store/home.store";
import TopAppBar from "@/components/TopAppBar";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Reminder } from "@/api/types/reminder";

const currency = (value?: number | null) => {
  if (typeof value !== "number") return "-";
  return `${value.toLocaleString("vi-VN")}đ`;
};

const avatarFallback = (seed?: string | number) => {
  const value = seed ? String(seed) : Math.random().toString(36).slice(2, 8);
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(value)}`;
};

export default function ReminderDetailScreen() {
  const { id, reminderId } = useLocalSearchParams<{ id: string; reminderId: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const invalidateHistory = useHomeStore((state) => state.invalidate);
  const invalidateGroupCache = useGroupStore((state) => state.invalidateGroupCache);

  const [loading, setLoading] = useState(true);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id || !reminderId) return;

      setLoading(true);
      try {
        const result = await reminderService.getReminders(String(id), { page: 1, limit: 100 });
        const items = result.data ?? [];
        setReminders(items);
        setReminder(items.find((item) => item.id === String(reminderId)) ?? null);
      } catch (error) {
        console.error("Failed to load reminder detail:", error);
        setReminder(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, reminderId]);

  const canCancel = useMemo(() => {
    return Boolean(reminder && currentUser?.id && reminder.createdBy === currentUser.id && reminder.status === "queued");
  }, [currentUser?.id, reminder]);

  const handleCancel = async () => {
    if (!reminder || !id) return;

    try {
      setCancelling(true);
      const updated = await reminderService.cancelReminder(String(id), reminder.id);
      setReminder(updated);
      setReminders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      invalidateGroupCache(String(id));
      invalidateHistory();
      Alert.alert("Thành công", "Đã hủy nhắc nhở");
    } catch (error) {
      console.error("Cancel reminder error:", error);
      Alert.alert("Lỗi", "Không thể hủy nhắc nhở");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopAppBar title="Chi tiết nhắc" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#C2410C" />
            <Text style={styles.loadingText}>Đang tải nhắc nhở...</Text>
          </View>
        ) : reminder ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{reminder.status.toUpperCase()}</Text>
              </View>

              <View style={styles.userRow}>
                <Image
                  source={{ uri: reminder.targetUser?.avatarUrl || avatarFallback(reminder.targetUserId) }}
                  style={styles.avatar}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{reminder.targetUser?.displayName ?? "Một thành viên"}</Text>
                  <Text style={styles.subtitle}>Người được nhắc</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Nội dung</Text>
                <Text style={styles.infoValue}>{reminder.message}</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Kênh</Text>
                <Text style={styles.infoValue}>{reminder.channel}</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Lên lịch</Text>
                <Text style={styles.infoValue}>{new Date(reminder.scheduledAt).toLocaleString("vi-VN")}</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Tạo lúc</Text>
                <Text style={styles.infoValue}>{new Date(reminder.createdAt).toLocaleString("vi-VN")}</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Người tạo</Text>
                <Text style={styles.infoValue}>{reminder.creator?.displayName ?? reminder.createdBy}</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Mã nhắc</Text>
                <Text style={styles.infoValue}>{reminder.id}</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Nhóm</Text>
                <Text style={styles.infoValue}>{reminder.groupId}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Danh sách nhắc cùng nhóm</Text>
              {reminders.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
              ) : (
                reminders.map((item) => (
                  <View key={item.id} style={styles.reminderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reminderRowTitle}>{item.targetUser?.displayName ?? item.targetUserId}</Text>
                      <Text style={styles.reminderRowMeta}>{item.status} • {new Date(item.createdAt).toLocaleDateString("vi-VN")}</Text>
                    </View>
                    <Text style={styles.reminderRowAmount}>{currency(undefined)}</Text>
                  </View>
                ))
              )}
            </View>

            {canCancel ? (
              <TouchableOpacity disabled={cancelling} onPress={handleCancel} style={[styles.cancelButton, cancelling && { opacity: 0.7 }]}>
                <Text style={styles.cancelButtonText}>{cancelling ? "Đang hủy..." : "Hủy nhắc"}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Không tìm thấy nhắc nhở</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F2" },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  loadingText: { marginTop: 10, color: "#7C2D12", fontWeight: "600" },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF4E5",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { color: "#C2410C", fontWeight: "800", fontSize: 12 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#FFF4E5" },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  subtitle: { color: "#6B7280", marginTop: 4 },
  infoCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  infoLabel: { color: "#9A3412", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  infoValue: { color: "#111827", fontWeight: "600", lineHeight: 20 },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  emptyText: { color: "#6B7280" },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF8F2",
    borderRadius: 16,
    padding: 12,
  },
  reminderRowTitle: { color: "#111827", fontWeight: "800" },
  reminderRowMeta: { color: "#6B7280", marginTop: 3, fontSize: 12 },
  reminderRowAmount: { color: "#C2410C", fontWeight: "800" },
  cancelButton: {
    backgroundColor: "#C2410C",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: { color: "#FFFFFF", fontWeight: "800" },
});