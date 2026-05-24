import { Entypo, Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";

const items = [
  {
    icon: <Ionicons name="home-outline" size={24} color="#6B7280" />,
    label: "Trang chủ",
    route: "/",
  },
  {
    icon: <Ionicons name="people-outline" size={24} color="#6B7280" />,
    label: "Nhóm",
    route: "/group",
  },
  {
    icon: <Ionicons name="person-add-outline" size={24} color="#6B7280" />,
    label: "Bạn bè",
    route: "/friend",
  },
  {
    icon: <Entypo name="back-in-time" size={24} color="#6B7280" />,
    label: "Lịch sử",
    route: "/history",
  },
  {
    icon: <Ionicons name="person-outline" size={24} color="#6B7280" />,
    label: "Cá nhân",
    route: "/profile",
  },
];

const activeItems = [
  {
    icon: <Ionicons name="home" size={24} color="#22C55E" />,
  },
  {
    icon: <Ionicons name="people" size={24} color="#22C55E" />,
  },
  {
    icon: <Ionicons name="person-add" size={24} color="#22C55E" />,
  },
  {
    icon: <Entypo name="back-in-time" size={24} color="#22C55E" />,
  },
  {
    icon: <Ionicons name="person" size={24} color="#22C55E" />,
  },
];

export default function NavigationBar() {
  const pathname = usePathname();
  const [containerWidth, setContainerWidth] = useState(0);
  const { backgroundColor, iconDefaultColor, successGreen } = useAppTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: backgroundColor }]}
      onLayout={(e) => {
        setContainerWidth(e.nativeEvent.layout.width);
      }}
    >
      {items.map((item, index) => {
        const isActive =
          item.route === "/"
            ? pathname === "/"
            : pathname.startsWith(item.route);

        return (
          <TouchableOpacity
            key={index}
            style={styles.item}
            onPress={() => router.push(item.route as any)}
          >
            <View
              style={[
                styles.activeBorder,
                {
                  backgroundColor: isActive ? successGreen : "transparent",
                  width: containerWidth / 5 - 5,
                },
              ]}
            />

            {isActive ? activeItems[index].icon : item.icon}
            <Text
              style={[
                styles.label,
                isActive
                  ? { color: successGreen }
                  : { color: iconDefaultColor },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 20,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  item: {
    alignItems: "center",
    position: "relative",
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
  activeBorder: {
    position: "absolute",
    top: -12,
    height: 2,
    borderRadius: 2,
  },
});
