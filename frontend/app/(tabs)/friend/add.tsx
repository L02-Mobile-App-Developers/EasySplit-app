import { MaterialIcons } from "@expo/vector-icons";
import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as friendService from "@/api/services/friend.service";

export default function AddFriend() {
  const { darkGreen } = useAppTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !email.includes("@")) {
      Alert.alert("Lỗi", "Vui lòng nhập email hợp lệ.");
      return;
    }

    try {
      setLoading(true);
      await friendService.sendFriendRequest(email);
      setLoading(false);
      Alert.alert("Thành công", `Đã gửi lời mời tới ${email}`);
      router.back();
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Lỗi", err?.response?.data?.error?.message || err.message || "Không thể gửi lời mời");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TopAppBar title="Thêm bạn" showBack showSearch showSettings />
      <ScrollView
        contentContainerStyle={{
          paddingTop: 12,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 20,
        }}
      >
        <Text style={{ marginBottom: 8 }}>Email</Text>
        <TextInput
          placeholder="Nhập email bạn bè"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            backgroundColor: "#e7e8e9ff",
            padding: 14,
            borderRadius: 8,
            color: "#111",
            marginBottom: 16,
          }}
        />

        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#14532d" : darkGreen,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          })}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
            {loading ? "Đang gửi..." : "Gửi lời mời"}
          </Text>
          <MaterialIcons name="send" size={20} color="white" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
