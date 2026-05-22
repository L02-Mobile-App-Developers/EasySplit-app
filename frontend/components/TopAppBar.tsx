import { useAppTheme } from "@/hooks/useAppTheme";
import { EvilIcons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { ReactNode } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface TopAppBarProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showSettings?: boolean;
  onBackPress?: () => void;
  onSearchPress?: () => void;
  onSettingsPress?: () => void;
  rightContent?: ReactNode;
}
const TopAppBar: React.FC<TopAppBarProps> = ({
  title = "EasySplit",
  showBack = false,
  showSearch = false,
  showSettings = false,
  onBackPress,
  onSearchPress,
  onSettingsPress,
  rightContent,
}) => {
  const { darkGreen, lightGray, backgroundWhite } = useAppTheme();

  const handleBackPress = onBackPress ?? (() => router.back());

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundWhite} />
      <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: backgroundWhite, borderBottomColor: lightGray }]}>
        <View style={styles.container}>
          <View style={styles.leftSection}>
            {showBack && (
              <Pressable onPress={handleBackPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <MaterialIcons name="arrow-back" size={22} color={darkGreen} />
              </Pressable>
            )}

            <View style={styles.titleWrap}>
              <Text style={[styles.title, { color: darkGreen }]} numberOfLines={1}>
                {title}
              </Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            {rightContent}
            {showSearch && (
              <Pressable onPress={onSearchPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <EvilIcons name="search" size={26} color={darkGreen} />
              </Pressable>
            )}
            {showSettings && (
              <Pressable onPress={onSettingsPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <MaterialIcons name="settings" size={22} color={darkGreen} />
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  container: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    backgroundColor: "rgba(0, 110, 47, 0.08)",
  },
});

export default TopAppBar;
