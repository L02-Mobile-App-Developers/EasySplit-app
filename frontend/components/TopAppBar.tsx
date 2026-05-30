import { useAppTheme } from "@/hooks/useAppTheme";
import { EvilIcons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { ReactNode } from "react";
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface TopAppBarProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showSettings?: boolean;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
  rightContent?: ReactNode;
}
const TopAppBar: React.FC<TopAppBarProps> = ({
  title = "EasySplit",
  showBack = false,
  showSearch = false,
  showSettings = false,
  onBackPress,
  onSettingsPress,
  rightContent,
}) => {
  const { darkGreen, lightGray, backgroundWhite, selected } = useAppTheme();

  const handleBackPress = onBackPress ?? (() => router.back());

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundWhite} />
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.safeArea,
          {
            backgroundColor: backgroundWhite,
            borderBottomColor: lightGray,
            marginTop: Platform.OS === "ios" ? -12 : 0,
          },
        ]}
      >
        <View style={styles.container}>
          <View style={styles.leftSection}>
            {showBack && (
              <Pressable
                onPress={handleBackPress}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons name="arrow-back" size={22} color={darkGreen} />
              </Pressable>
            )}

            <View style={styles.titleWrap}>
              <Text
                style={[styles.title, { color: darkGreen }]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: selected }]} numberOfLines={1}>
                Split the bill, keep the chill
              </Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            {rightContent}
            {showSettings && (
              <Pressable
                onPress={onSettingsPress}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                ]}
              >
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  container: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  pressed: {
    backgroundColor: "rgba(34, 197, 94, 0.14)",
  },
});

export default TopAppBar;
