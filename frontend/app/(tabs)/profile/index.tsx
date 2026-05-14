import TopAppBar from "@/components/TopAppBar";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Mock profile data
const mockProfileData = {
  name: "Minh Nguyen",
  email: "minh@gmail.com",
  phone: "090xxxxxxx",
  groups: 12,
  friends: 48,
  transactions: 156,
  avatar: require("../../../assets/images/icon.png"),
};

// Simulate API call to fetch profile
const fetchProfileData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockProfileData);
    }, 2000); // 2 second delay
  });
};

const ProfileScreen = () => {
  const [profile, setProfile] = useState<typeof mockProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const data = await fetchProfileData() as typeof mockProfileData;
      setProfile(data);
      setLoading(false);
    };
    loadProfile();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
        <TopAppBar title="EasySplit" showBack={false} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={{ marginTop: 12, color: "#6B7280", fontSize: 14 }}>Đang tải hồ sơ...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
        <TopAppBar title="EasySplit" showBack={false} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#6B7280" }}>Không thể tải dữ liệu</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <TopAppBar title="EasySplit" showBack={false} />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Profile Information Section */}
        <View style={{ alignItems: "center", paddingTop: 32, paddingBottom: 28 }}>
          {/* Avatar with Edit Badge */}
          <View style={{ position: "relative", marginBottom: 16 }}>
            <Image
              source={profile.avatar}
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 4,
                borderColor: "#16A34A",
              }}
            />
            {/* Edit Badge */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#16A34A",
                borderWidth: 3,
                borderColor: "#fff",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons name="edit" size={20} color="#fff" />
            </View>
          </View>

          {/* User Details */}
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#0F172A", marginBottom: 6 }}>
            {profile.name}
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 4 }}>
            {profile.email}
          </Text>
          <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
            {profile.phone}
          </Text>
        </View>

        {/* Statistics Cards */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            marginBottom: 24,
            gap: 12,
          }}
        >
          {/* Card 1 - Groups */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              borderRadius: 20,
              paddingVertical: 16,
              paddingHorizontal: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#16A34A", marginBottom: 6 }}>
              {profile.groups}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 }}>
              SỐ NHÓM
            </Text>
          </View>

          {/* Card 2 - Friends */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              borderRadius: 20,
              paddingVertical: 16,
              paddingHorizontal: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#16A34A", marginBottom: 6 }}>
              {profile.friends}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 }}>
              SỐ BẠN BÈ
            </Text>
          </View>

          {/* Card 3 - Transactions */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              borderRadius: 20,
              paddingVertical: 16,
              paddingHorizontal: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#16A34A", marginBottom: 6 }}>
              {profile.transactions}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 }}>
              GIAO DỊCH
            </Text>
          </View>
        </View>

        {/* Action Menu */}
        <View
          style={{
            marginHorizontal: 20,
            backgroundColor: "#fff",
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          {/* Edit Profile */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#E6E7E8",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#DBE9F5",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name="account-edit" size={22} color="#0F172A" />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: "#0F172A" }}>
              Chỉnh sửa hồ sơ
            </Text>
            <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#E6E7E8",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#DBE9F5",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name="cog" size={22} color="#0F172A" />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: "#0F172A" }}>
              Cài đặt
            </Text>
            <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
          </TouchableOpacity>

          {/* Help */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#DBE9F5",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name="help-circle" size={22} color="#0F172A" />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: "#0F172A" }}>
              Hỗ trợ
            </Text>
            <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={{
            marginHorizontal: 20,
            backgroundColor: "#FEF2F2",
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "#FCA5A5",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <MaterialCommunityIcons name="logout" size={22} color="#BA1A1A" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#BA1A1A" }}>
            Đăng xuất
          </Text>
        </TouchableOpacity>

        {/* Footer Info */}
        <View style={{ alignItems: "center", paddingBottom: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#9CA3AF", letterSpacing: 2 }}>
            EASYSPLIT V2.4.0
          </Text>
          {/* Pagination Dots */}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A" }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#D1D5DB" }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#D1D5DB" }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
