import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import TopAppBar from "@/components/TopAppBar";
import { sendFriendRequest } from "@/api/services/friend.service";

export default function AddFriendScreen() {
  const [email, setEmail] = useState("");

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập email của bạn bè.");
      return;
    }

    try {
      await sendFriendRequest(email.trim());
      Alert.alert("Đã gửi lời mời", "Yêu cầu kết bạn đã được gửi.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      console.error("Send friend request failed", error);
      Alert.alert("Không gửi được", "Kiểm tra lại email hoặc kết nối mạng.");
    }
  };

  return (
    <View style={styles.screen}>
      <TopAppBar title="Thêm bạn bè" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.badge}><Text style={styles.badgeText}>Invitation</Text></View>
          <Text style={styles.title}>Mời bạn bè cùng dùng EasySplit</Text>
          <Text style={styles.subtitle}>Nhập email, gửi lời mời và bắt đầu chia tiền trong một giao diện rõ ràng hơn.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="email" size={20} color="#0F5E28" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="friend@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Lợi ích</Text>
          <View style={styles.benefitRow}>
            <View style={styles.benefitItem}><MaterialIcons name="group-add" size={20} color="#0F5E28" /><Text style={styles.benefitText}>Tạo nhóm chung nhanh hơn</Text></View>
            <View style={styles.benefitItem}><MaterialIcons name="request-page" size={20} color="#0F5E28" /><Text style={styles.benefitText}>Nhận lời mời ngay</Text></View>
            <View style={styles.benefitItem}><MaterialIcons name="attach-money" size={20} color="#0F5E28" /><Text style={styles.benefitText}>Theo dõi nợ bằng VND</Text></View>
          </View>
        </View>

        <Pressable onPress={handleInvite} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Gửi lời mời</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7F4" },
  content: { padding: 20, gap: 14 },
  heroCard: { backgroundColor: "#FFFFFF", borderRadius: 28, padding: 18, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2 },
  badge: { alignSelf: "flex-start", backgroundColor: "#EAF6EE", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#0F5E28", fontWeight: "800", fontSize: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#6B7280", lineHeight: 20 },
  sectionCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  label: { color: "#6B7280", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F7F9F7", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14 },
  input: { flex: 1, color: "#0F172A", fontSize: 15 },
  benefitRow: { gap: 10 },
  benefitItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "#F7F9F7" },
  benefitText: { flex: 1, color: "#0F172A", fontWeight: "600" },
  primaryButton: { backgroundColor: "#0F5E28", paddingVertical: 15, borderRadius: 18, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
});