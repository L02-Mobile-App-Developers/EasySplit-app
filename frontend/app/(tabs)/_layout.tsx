import NavigationBar from "@/components/navigationBar";
import { Tabs } from "expo-router";
import { View } from "react-native";

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{ headerShown: false }}
          tabBar={() => null}
        >
          <Tabs.Screen name="index" options={{ title: "Trang chủ" }} />
          <Tabs.Screen name="group" options={{ title: "Nhóm" }} />
          <Tabs.Screen name="friend" options={{ title: "Bạn bè" }} />
          <Tabs.Screen name="history" options={{ title: "Lịch sử" }} />
          <Tabs.Screen name="profile" options={{ title: "Cá nhân" }} />
        </Tabs>
      </View>

      <NavigationBar />
    </View>
  );
}
