import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";

import { Inter_900Black, useFonts } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_900Black,
  });

  // ✅ hook 1
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // ✅ hook 2 (đưa lên trước return)
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle("dark");
    }
  }, []);

  // ✅ return sau khi đã gọi hook
  if (!loaded && !error) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack />
    </>
  );
}
