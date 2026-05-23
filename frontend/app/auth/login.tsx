import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";

const MOCK_USERS = [
  {
    name: "Nguyen Van A",
    email: "demo@esplit.app",
    password: "123456",
  },
  {
    name: "Tran Thi B",
    email: "user@esplit.app",
    password: "abcdef",
  },
];

export default function Login() {
  const { textColor, backgroundWhite, selected } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const brandGreen = selected;
  const placeholderGray = "#9CA3AF";
  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng điền email và mật khẩu");
      return;
    }

    const matchedUser = MOCK_USERS.find(
      (user) =>
        user.email.toLowerCase() === email.trim().toLowerCase() &&
        user.password === password,
    );

    if (!matchedUser) {
      Alert.alert(
        "Lỗi",
        "Email hoặc mật khẩu không đúng. Hãy thử tài khoản mẫu bên dưới.",
      );
      return;
    }

    Alert.alert("Thành công", `Xin chào ${matchedUser.name}`);
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: backgroundWhite }]}
    >
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandWrap}>
            <Image
              source={require("../../assets/images/logo-removebg.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          <View style={styles.card}>
            <ThemedText
              fontWeight="semibold"
              style={[styles.title, { color: textColor }]}
            >
              Đăng nhập tài khoản
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: placeholderGray }]}>
              Chào mừng bạn quay lại, hãy đăng nhập để tiếp tục.
            </ThemedText>

            <View style={styles.mockBox}>
              <ThemedText
                fontWeight="semibold"
                style={[styles.mockTitle, { color: textColor }]}
              >
                Tài khoản mẫu
              </ThemedText>
              <ThemedText style={[styles.mockText, { color: placeholderGray }]}>
                demo@esplit.app / 123456
              </ThemedText>
              <ThemedText style={[styles.mockText, { color: placeholderGray }]}>
                user@esplit.app / abcdef
              </ThemedText>
            </View>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={placeholderGray}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mật khẩu"
              placeholderTextColor={placeholderGray}
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              style={[styles.button, { backgroundColor: brandGreen }]}
            >
              <ThemedText fontWeight="semibold" style={styles.buttonText}>
                Đăng nhập
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/auth/forgot-password")}
              style={styles.linkRow}
            >
              <ThemedText
                style={[styles.forgotLink, { color: placeholderGray }]}
              >
                Quên mật khẩu?
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <ThemedText
                style={[styles.dividerText, { color: placeholderGray }]}
              >
                Hoặc đăng nhập bằng
              </ThemedText>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialRow}>
              {[
                { name: "logo-google", color: "#DB4437" },
                { name: "logo-facebook", color: "#1877F2" },
                { name: "logo-twitter", color: "#1DA1F2" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.name}
                  activeOpacity={0.85}
                  style={styles.socialButton}
                >
                  <Ionicons
                    name={item.name as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={item.color}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.replace("/auth/register")}
              style={styles.footerLinkWrap}
            >
              <ThemedText
                style={[styles.footerText, { color: placeholderGray }]}
              >
                Bạn chưa có tài khoản?{" "}
              </ThemedText>
              <ThemedText
                fontWeight="semibold"
                style={[styles.footerText, { color: brandGreen }]}
              >
                Đăng ký
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brandWrap: { alignItems: "center", marginBottom: 18 },
  logo: { width: 220, height: 90 },
  card: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "stretch",
    elevation: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
    }),
  },
  title: { fontSize: 22, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 18 },
  mockBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  mockTitle: { fontSize: 13, marginBottom: 6 },
  mockText: { fontSize: 12, lineHeight: 18 },
  input: {
    backgroundColor: "#FAFBFF",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8EBF5",
    marginTop: 12,
    fontSize: 15,
  },
  button: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonText: { color: "white" },
  linkRow: { alignItems: "center", marginTop: 14 },
  forgotLink: { fontSize: 13 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 16,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#EBEEF6" },
  dividerText: { marginHorizontal: 12, fontSize: 12 },
  socialRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  socialButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1F7",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  footerLinkWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  footerText: { fontSize: 13 },
});
