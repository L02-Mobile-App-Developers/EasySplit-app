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
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { textColor, backgroundWhite, selected, lightGray } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const brandGreen = selected;
  const placeholderGray = "#6B7280";
  const surface = "#FFFFFF";
  const surfaceVariant = "#F7F9F7";
  const outline = lightGray;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: backgroundWhite }]}
    >
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.topBand} />
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
            <ThemedText style={[styles.brandLabel, { color: placeholderGray }]}>
              EasySplit
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: surface }]}> 
            <View style={[styles.heroAccent, { backgroundColor: brandGreen }]} />
            <ThemedText
              fontWeight="semibold"
              style={[styles.title, { color: textColor }]}
            >
              Đăng nhập tài khoản
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: placeholderGray }]}> 
              Chào mừng bạn quay lại, hãy đăng nhập để tiếp tục.
            </ThemedText>

            <View style={[styles.field, { backgroundColor: surfaceVariant, borderColor: outline }]}> 
              <Ionicons name="mail-outline" size={18} color={placeholderGray} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={placeholderGray}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <View style={[styles.field, { backgroundColor: surfaceVariant, borderColor: outline }]}> 
              <Ionicons name="lock-closed-outline" size={18} color={placeholderGray} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mật khẩu"
                placeholderTextColor={placeholderGray}
                secureTextEntry
                style={[styles.input, { color: textColor }]}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={async () => {
                try {
                  if (!email || !password) {
                    Alert.alert("Lỗi", "Vui lòng nhập email và mật khẩu");
                    return;
                  }

                  setLoading(true);
                  await login(email, password);
                  router.replace("/(tabs)");
                } catch (error: any) {
                  console.log(error?.response?.data || error);
                  const message =
                    error?.response?.data?.error?.message ||
                    "Đăng nhập thất bại";
                  Alert.alert("Lỗi", message);
                } finally {
                  setLoading(false);
                }
              }}
              style={[styles.button, { backgroundColor: brandGreen }]}
            >
              <ThemedText fontWeight="semibold" style={styles.buttonText}>
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
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
  topBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(30, 142, 62, 0.08)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brandWrap: { alignItems: "center", marginBottom: 18 },
  logo: { width: 210, height: 84 },
  brandLabel: {
    marginTop: 2,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  card: {
    width: "100%",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "stretch",
    overflow: "hidden",
    elevation: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
    }),
  },
  heroAccent: {
    width: 64,
    height: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  title: { fontSize: 22, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 18 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
    paddingVertical: 13,
    fontSize: 15,
  },
  button: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E8E3E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
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
  divider: { flex: 1, height: 1, backgroundColor: "#E7EAE7" },
  dividerText: { marginHorizontal: 12, fontSize: 12 },
  socialRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  socialButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EAE7",
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
