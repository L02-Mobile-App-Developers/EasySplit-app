import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import TopAppBar from "@/components/TopAppBar";
import { listFriends } from "@/api/services/friend.service";
import { groupService } from "@/api/services/group.service";
import { useGroupStore } from "@/store/group.store";
import { useHomeStore } from "@/store/home.store";

import type { GroupMember } from "@/api/types/group";

type FriendItem = {
  id: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export default function AddMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const [friendList, memberList] = await Promise.all([
          listFriends(),
          groupService.getGroupMembers(id),
        ]);

        const mapped = (friendList ?? []).map((f: any) => ({
          id: f.id ?? f.userId ?? f.user_id,
          displayName: f.displayName ?? f.name ?? f.display_name,
          email: f.email ?? null,
          avatarUrl: f.avatarUrl ?? f.avatar_url ?? null,
        }));

        if (mounted) {
          setFriends(mapped.filter((f: FriendItem) => Boolean(f.id)));
          setMembers(memberList ?? []);
        }
      } catch (error) {
        console.error("Failed to load friends/members", error);
        if (mounted) {
          setFriends([]);
          setMembers([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [id]);

  const memberIdSet = useMemo(() => {
    return new Set(members.map((m) => m.userId));
  }, [members]);

  const availableFriends = useMemo(() => {
    return friends.filter((friend) => !memberIdSet.has(friend.id));
  }, [friends, memberIdSet]);

  const handleAdd = async (friend: FriendItem) => {
    if (!id || addingId) return;

    try {
      setAddingId(friend.id);
      await groupService.addGroupMember(id, friend.id, "member");
      useGroupStore.getState().invalidateGroupCache(id);
      useGroupStore.getState().invalidateGroupListCache();
      useHomeStore.getState().invalidate();

      Alert.alert("Thành công", `Đã thêm ${friend.displayName} vào nhóm`, [
        {
          text: "OK",
          onPress: () => router.replace(`/group/${id}?refresh=${Date.now()}` as any),
        },
      ]);
    } catch (err: any) {
      console.error("Add member failed", err);
      const msg =
        err?.response?.data?.message ||
        "Không thể thêm thành viên. Vui lòng thử lại.";
      Alert.alert("Lỗi", msg);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <TopAppBar title="Thêm thành viên" showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0F5E28" />
          <Text style={styles.loadingText}>Đang tải danh sách bạn bè...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroTitle}>Chọn bạn bè để thêm</Text>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{availableFriends.length} người</Text>
              </View>
            </View>
            <Text style={styles.heroSubtitle}>
              Chỉ có thể thêm bạn đã kết bạn vào nhóm.
            </Text>
          </View>

          {availableFriends.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="group" size={26} color="#6B7280" />
              <Text style={styles.emptyText}>Không còn bạn bè để thêm.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {availableFriends.map((friend) => (
                <View key={friend.id} style={styles.friendRow}>
                  {friend.avatarUrl ? (
                    <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>
                        {(friend.displayName || "?").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{friend.displayName}</Text>
                    <Text style={styles.friendMeta}>
                      {friend.email ?? "Chưa có email"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      addingId === friend.id && styles.addButtonDisabled,
                    ]}
                    disabled={addingId === friend.id}
                    onPress={() => handleAdd(friend)}
                  >
                    {addingId === friend.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.addButtonText}>Thêm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroSubtitle: {
    color: "#6B7280",
  },
  heroBadge: {
    backgroundColor: "#EAF6EE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#0F5E28",
    fontWeight: "800",
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    color: "#6B7280",
  },
  list: {
    gap: 12,
  },
  friendRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EAF6EE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#0F5E28",
    fontWeight: "800",
    fontSize: 16,
  },
  friendName: {
    fontWeight: "800",
    color: "#0F172A",
  },
  friendMeta: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 12,
  },
  addButton: {
    backgroundColor: "#0F5E28",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
