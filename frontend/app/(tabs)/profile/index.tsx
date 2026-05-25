import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { meService } from "@/api/services/me.service";
import type { User } from "@/api/types/auth";
import type { Usage } from "@/api/types/me";
import { useAuthStore } from "@/store/auth.store";
import TopAppBar from "@/components/TopAppBar";

const fallbackAvatar = require("../../../assets/images/icon.png");

type ProfileData = {
  user: User;
  usage: Usage;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [draft, setDraft] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const [user, usage] = await Promise.all([meService.getProfile(), meService.getUsage()]);

        setProfile({ user, usage });
        setDraft(user);
        useAuthStore.setState({ user, isAuthenticated: true });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const beginEditing = () => {
    if (!profile) return;
    setDraft(profile.user);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (!profile) return;
    setDraft(profile.user);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!draft) return;

    setLoading(true);

    try {
      const updatedUser = await meService.updateProfile({
        displayName: draft.displayName,
        avatarUrl: draft.avatarUrl,
      });

      setProfile((current) => (current ? { ...current, user: updatedUser } : current));
      setDraft(updatedUser);
      useAuthStore.setState({ user: updatedUser, isAuthenticated: true });
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <TopAppBar title="Cá nhân" showSearch showSettings />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.screen}>
        <TopAppBar title="Cá nhân" showSearch showSettings />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Không thể tải dữ liệu</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopAppBar title="Cá nhân" showSearch showSettings />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={profile.user.avatarUrl ? { uri: profile.user.avatarUrl } : fallbackAvatar}
              style={styles.avatar}
            />
            <View style={styles.avatarBadge}>
              <MaterialIcons name={isEditing ? "photo-library" : "edit"} size={18} color="#fff" />
            </View>
          </View>

          <Text style={styles.nameText}>{draft?.displayName ?? profile.user.displayName}</Text>
          <Text style={styles.emailText}>{profile.user.email ?? "Chưa có email"}</Text>

          <View style={styles.statsRow}>
            <StatCard label="Nhóm" value={profile.usage.groupCount} />
            <StatCard label="Smart settle" value={profile.usage.smartSettleUsedThisMonth} />
            <StatCard label="Quota" value={profile.usage.freeMaxGroups} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          {isEditing ? (
            <View style={styles.formCard}>
              <Input
                value={draft?.displayName ?? ""}
                placeholder="Họ và tên"
                onChangeText={(value) => setDraft((current) => (current ? { ...current, displayName: value } : current))}
              />
              <Input
                value={draft?.avatarUrl ?? ""}
                placeholder="Avatar URL"
                onChangeText={(value) => setDraft((current) => (current ? { ...current, avatarUrl: value } : current))}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.secondaryButton, { borderColor: "#E5E7EB" }]} onPress={cancelEditing}>
                  <Text style={styles.secondaryButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: "#16A34A" }]} onPress={handleSaveProfile}>
                  <Text style={styles.primaryButtonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.85} onPress={beginEditing} style={styles.infoCard}>
              <MaterialIcons name="account-circle" size={24} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Cập nhật hồ sơ</Text>
                <Text style={styles.infoText}>Chỉnh sửa tên hiển thị và avatar của bạn.</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="lock-outline" label="Đổi mật khẩu" onPress={() => router.push("/auth/forgot-password")} />
            <MenuItem icon="logout" label="Đăng xuất" onPress={() => router.replace("/auth/login")} danger />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Input = ({ value, placeholder, onChangeText }: { value: string; placeholder: string; onChangeText: (value: string) => void }) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#9CA3AF"
    style={styles.input}
  />
);

const MenuItem = ({ icon, label, onPress, danger = false }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void; danger?: boolean }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.menuItem}>
    <MaterialIcons name={icon} size={22} color={danger ? "#BA1A1A" : "#16A34A"} />
    <Text style={[styles.menuText, danger && { color: "#BA1A1A" }]}>{label}</Text>
    <MaterialIcons name="chevron-right" size={22} color="#6B7280" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7F4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6B7280" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarWrap: { position: "relative", marginBottom: 14 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: "#16A34A" },
  avatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#16A34A",
    borderWidth: 3,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  nameText: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  emailText: { marginTop: 4, color: "#6B7280" },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
  statCard: {
    flex: 1,
    backgroundColor: "#F7F9F7",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  statLabel: { fontSize: 12, color: "#6B7280" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    backgroundColor: "#F7F9F7",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  buttonRow: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: { fontWeight: "700", color: "#0F172A" },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: { fontWeight: "700", color: "#FFFFFF" },
  infoCard: {
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
  infoTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  infoText: { marginTop: 4, color: "#6B7280" },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: "700", color: "#0F172A" },
});
