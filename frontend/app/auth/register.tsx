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

import { authService } from "../../api/services/auth.service";

export default function Register() {
  const { textColor, lightGray, backgroundWhite, selected } = useAppTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const brandGreen = selected;
  const placeholderGray = "#6B7280";
  const surface = "#FFFFFF";
  const surfaceVariant = "#F7F9F7";
  const outline = lightGray;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/auth/login");
  };

  const handleRegister = async () => {
    setSubmitError(null);

    if (!name.trim() || !email.trim() || !password) {
      const message = "Vui lòng điền đầy đủ các trường bắt buộc";
      setSubmitError(message);
      Alert.alert("Lỗi", message);
      return;
    }
    if (password !== confirm) {
      const message = "Mật khẩu xác nhận không khớp";
      setSubmitError(message);
      Alert.alert("Lỗi", message);
      return;
    }

    try {
      await authService.register({ displayName: name.trim(), email: email.trim(), password });
      setSubmitError(null);
      Alert.alert("Thành công", `Đã tạo tài khoản cho ${name.trim()}`);
      router.replace("/auth/login");
    } catch (error: any) {
      console.error("Đăng ký thất bại:", error);

      const errorCode = error?.response?.data?.error?.code;
      const errorMessage = error?.response?.data?.error?.message;

      if (errorCode === "CONFLICT" || /already registered|already exists/i.test(String(errorMessage ?? ""))) {
        const message = "Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập nếu bạn đã có tài khoản.";
        setSubmitError(message);
        Alert.alert("Email đã tồn tại", message);
        return;
      }

      const message = "Đăng ký thất bại. Vui lòng thử lại.";
      setSubmitError(message);
      Alert.alert("Lỗi", message);
    }
  };

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
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={goBack}
              style={[
                styles.backButton,
                { borderColor: outline, backgroundColor: surface },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={textColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.brandWrap}>
            <Image
              source={require("../../assets/images/logo-removebg.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <ThemedText style={[styles.brandLabel, { color: placeholderGray }]}>EasySplit</ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: surface }]}> 
            <View style={[styles.heroAccent, { backgroundColor: brandGreen }]} />
            <ThemedText
              fontWeight="semibold"
              style={[styles.title, { color: textColor }]}
            >
              Tạo tài khoản
            </ThemedText>
            <ThemedText
              fontWeight="medium"
              style={[styles.subtitle, { color: textColor, opacity: 0.85 }]}
            >
              Tạo tài khoản để bắt đầu.
            </ThemedText>

            {submitError ? (
              <View style={styles.errorBox}>
                <ThemedText style={styles.errorText}>{submitError}</ThemedText>
              </View>
            ) : null}

            <View style={[styles.field, { backgroundColor: surfaceVariant, borderColor: outline }]}> 
              <Ionicons name="person-outline" size={18} color={placeholderGray} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Họ và tên"
                placeholderTextColor={placeholderGray}
                style={styles.input}
              />
            </View>

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

            <View style={[styles.field, { backgroundColor: surfaceVariant, borderColor: outline }]}> 
              <Ionicons name="shield-checkmark-outline" size={18} color={placeholderGray} />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Xác nhận mật khẩu"
                placeholderTextColor={placeholderGray}
                secureTextEntry
                style={[styles.input, { color: textColor }]}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRegister}
              style={[styles.button, { backgroundColor: brandGreen }]}
            >
              <ThemedText fontWeight="semibold" style={styles.buttonText}>
                Đăng ký
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.replace("/auth/login")}
              style={styles.footerLinkWrap}
            >
              <ThemedText
                style={[styles.footerText, { color: placeholderGray }]}
              >
                Đã có tài khoản?{" "}
              </ThemedText>
              <ThemedText
                fontWeight="semibold"
                style={[styles.footerText, { color: brandGreen }]}
              >
                Đăng nhập
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
    paddingVertical: 12,
  },
  headerRow: {
    marginBottom: 14,
    alignItems: "flex-start",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  brandWrap: { alignItems: "center", marginBottom: 14 },
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
  errorBox: {
    backgroundColor: "#FFF1F1",
    borderColor: "#F6C7C7",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  errorText: {
    color: "#BA1A1A",
  },
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
  footerLinkWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  footerText: { fontSize: 13 },
});
