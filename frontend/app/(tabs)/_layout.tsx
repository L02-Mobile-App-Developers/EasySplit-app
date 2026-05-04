import NavigationBar from "@/components/navigationBar";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      {/* Nội dung màn hình */}
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>

      {/* Navbar custom */}
      <NavigationBar />
    </View>
  );
}
