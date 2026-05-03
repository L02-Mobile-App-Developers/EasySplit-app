import { useAssets } from "expo-asset";
import { Image } from "expo-image";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const [assets, error] = useAssets([
    require("../assets/images/icon.png"),
    require("../assets/images/icon.png"),
  ]);

  if (!assets) return null;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontFamily: "Inter_900Black" }}>
        Edit app/index.tsx to edit this screen.
      </Text>
      <Text style={{ fontFamily: "Inter_900Black" }}>Con cac</Text>
      <Image source={assets[0]} style={{ width: 100, height: 100 }} />
    </SafeAreaView>
  );
}
