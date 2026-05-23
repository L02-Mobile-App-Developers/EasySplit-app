import { Image, Text, View } from "react-native";

export default function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View style={{ justifyContent: "center", alignItems: "center" }}>
        <Image
          testID="logo-image"
          source={require("@/assets/images/logo-removebg.png")}
          style={{ width: 120, height: 120, marginBottom: 20 }}
          resizeMode="contain"
        />
        <Text
          style={{
            color: "#0F172A",
            fontSize: 36,
            fontWeight: "bold",
            marginBottom: 20,
          }}
        >
          EASYSPLIT
        </Text>
      </View>

      <View style={{ position: "absolute", bottom: 30, alignItems: "center" }}>
        <Text style={{ color: "gray" }}>Sản phẩm của</Text>
        <Text style={{ fontWeight: "bold", color: "#0F172A" }}>
          L02 - Mobile App Developers
        </Text>
      </View>

      {/* <ActivityIndicator size="large" color="white" /> */}
    </View>
  );
}
