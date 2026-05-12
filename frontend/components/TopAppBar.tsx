import { useAppTheme } from "@/hooks/useAppTheme";
import { EvilIcons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StatusBar, Text, TouchableOpacity, View } from "react-native";

interface TopAppBarProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showSettings?: boolean;
  onBackPress?: () => void;
  onSearchPress?: () => void;
  onSettingsPress?: () => void;
}

/**
 * TopAppBar Component
 *
 * A minimalist, pixel-perfect header component for the EasySplit app.
 * Positioned at the top of the screen with customizable actions.
 *
 * @param {TopAppBarProps} props
 * @returns {React.FC}
 */
const TopAppBar: React.FC<TopAppBarProps> = ({
  title = "EasySplit",
  showBack = false,
  showSearch = true,
  showSettings = true,
  onBackPress,
  onSearchPress,
  onSettingsPress,
}) => {
  const { darkGreen, lightGray, backgroundWhite } = useAppTheme();

  return (
    <>
      {/* Status Bar */}
      <StatusBar barStyle="dark-content" backgroundColor={backgroundWhite} />

      {/* Top App Bar */}
      <View
        style={{
          backgroundColor: backgroundWhite,
          paddingTop: 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: lightGray,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        {/* Left Section: Back Arrow + Title */}
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          {/* Back Button */}
          {showBack && (
            <TouchableOpacity
              onPress={onBackPress}
              style={{
                padding: 8,
                marginLeft: -8,
                marginRight: 8,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={darkGreen} />
            </TouchableOpacity>
          )}

          {/* Title Text */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: darkGreen,
              letterSpacing: 0.3,
            }}
          >
            {title}
          </Text>
        </View>

        {/* Right Section: Search & Settings Icons */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {/* Search Icon */}
          {showSearch && (
            <TouchableOpacity
              onPress={onSearchPress}
              style={{
                padding: 8,
              }}
              activeOpacity={0.7}
            >
              <EvilIcons name="search" size={24} color={darkGreen} />
            </TouchableOpacity>
          )}

          {/* Settings Icon */}
          {showSettings && (
            <TouchableOpacity
              onPress={onSettingsPress}
              style={{
                padding: 8,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="settings" size={24} color={darkGreen} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

export default TopAppBar;
