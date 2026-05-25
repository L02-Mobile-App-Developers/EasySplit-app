import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, Text, TextInput } from "react-native";

import LoadingScreen from "@/services/LoadingScreen";
import { useAuthStore } from "@/store/auth.store";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";

// import * as SplashScreen from "expo-splash-screen";

// SplashScreen.preventAutoHideAsync();

Text.defaultProps = Text.defaultProps ?? {};
Text.defaultProps.style = [
  Text.defaultProps.style,
  { fontFamily: "Inter_400Regular" },
];

TextInput.defaultProps = TextInput.defaultProps ?? {};
TextInput.defaultProps.style = [
  TextInput.defaultProps.style,
  { fontFamily: "Inter_400Regular" },
];

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const bootstrapAuth = useAuthStore((state) => state.bootstrap);

  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    async function prepare() {
      if (!loaded && !error) return;

      try {
        await bootstrapAuth();
      } catch (e) {
        console.log(e);
      } finally {
        setAppReady(true);
        // await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, [loaded, error, bootstrapAuth]);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle("dark");
    }
  }, []);

  if (!appReady) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
