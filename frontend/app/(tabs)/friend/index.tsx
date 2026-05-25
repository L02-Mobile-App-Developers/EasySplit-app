import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  acceptFriendRequest,
  listFriends,
  listIncomingRequests,
  rejectFriendRequest,
} from "@/api/services/friend.service";

type FriendItem = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl?: string | null;
};

type FriendRequestItem = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  createdAt: string;
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function FriendScreen() {
  const { backgroundWhite, textColor, successGreen, errorRed, lightGray, darkGreen, tabIconDefault, lightGreen } = useAppTheme();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFriends = async () => {
    setLoading(true);
    setError(null);

    try {
      const [friendItems, requestItems] = await Promise.all([listFriends(), listIncomingRequests()]);
      setFriends(friendItems as FriendItem[]);
      setRequests(requestItems as FriendRequestItem[]);
    } catch (fetchError) {
      console.log("Get friends error:", fetchError);
      setError("Không thể tải danh sách bạn bè.");
      setFriends([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const handleAccept = async (requestId: string) => {
    setMutatingId(requestId);
    try {
      await acceptFriendRequest(requestId);
      await loadFriends();
    } catch (acceptError) {
      console.log("Accept friend request error:", acceptError);
      setError("Không thể chấp nhận lời mời.");
    } finally {
      setMutatingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setMutatingId(requestId);
    try {
      await rejectFriendRequest(requestId);
      await loadFriends();
    } catch (rejectError) {
      console.log("Reject friend request error:", rejectError);
      setError("Không thể từ chối lời mời.");
    } finally {
      setMutatingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: backgroundWhite }]}> 
        <TopAppBar title="Bạn bè" showSearch showSettings />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={darkGreen} />
          <Text style={styles.loadingText}>Đang tải bạn bè...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: backgroundWhite }]}>
      <TopAppBar title="Bạn bè" showSearch showSettings />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={[styles.pageTitle, { color: textColor }]}>Kết nối và chia sẻ chi tiêu</Text>
          <Text style={styles.pageSubtitle}>
            Quản lý lời mời kết bạn, thêm bạn qua email và xem danh sách bạn bè.
          </Text>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/friend/add")} style={styles.emailInviteCard}>
          <View style={styles.emailInviteLeft}>
            <MaterialIcons name="mail-outline" size={24} color={darkGreen} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Mời bạn bè qua email</Text>
              <Text style={styles.metaText}>Gửi lời mời trực tiếp bằng email từ ứng dụng.</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={tabIconDefault} />
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Lời mời kết bạn</Text>
            <Text style={{ color: darkGreen }}>{requests.length} mới</Text>
          </View>

          {error ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="error-outline" size={24} color={tabIconDefault} />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : null}

          {requests.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="mark-email-unread" size={24} color={tabIconDefault} />
              <Text style={styles.emptyText}>Chưa có lời mời nào.</Text>
            </View>
          ) : null}

          {requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{request.id.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.friendName, { color: textColor }]}>Lời mời #{request.id.slice(0, 6)}</Text>
                <Text style={styles.metaText}>Đã gửi vào {new Date(request.createdAt).toLocaleDateString("vi-VN")}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.smallIconButton, { backgroundColor: darkGreen, opacity: mutatingId === request.id ? 0.6 : 1 }]}
                  onPress={() => handleAccept(request.id)}
                  disabled={mutatingId === request.id}
                >
                  <MaterialIcons name="check" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallIconButton, { backgroundColor: lightGray, opacity: mutatingId === request.id ? 0.6 : 1 }]}
                  onPress={() => handleReject(request.id)}
                  disabled={mutatingId === request.id}
                >
                  <AntDesign name="close" size={16} color={textColor} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Danh sách bạn bè</Text>
            <Text style={{ color: tabIconDefault }}>{friends.length} người</Text>
          </View>

          {friends.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="person-off" size={24} color={tabIconDefault} />
              <Text style={styles.emptyText}>Chưa có bạn bè nào.</Text>
            </View>
          ) : null}

          {friends.map((friend) => {
            const initials = getInitials(friend.displayName);

            return (
              <TouchableOpacity
                key={friend.id}
                activeOpacity={0.85}
                onPress={() => router.push("/friend/add")}
                style={styles.friendCard}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: textColor }]}>{friend.displayName}</Text>
                  <Text style={styles.metaText}>{friend.email ?? "Chưa có email"}</Text>
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
            <Text style={styles.metaText}>Gửi lời mời qua email để kết nối nhanh hơn.</Text>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6B7280" },
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
  emailInviteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  emailInviteLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
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
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { color: "#6B7280", textAlign: "center" },
});
