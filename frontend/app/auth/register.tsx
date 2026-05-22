import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function Register() {
	const { textColor, lightGray, backgroundWhite, selected } = useAppTheme();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const brandGreen = selected;
	const placeholderGray = "#9CA3AF";
	const goBack = () => {
		if (router.canGoBack()) {
			router.back();
			return;
		}
		router.replace("/auth/login");
	};

	const handleRegister = () => {
		if (!name || !email || !password) {
			Alert.alert("Lỗi", "Vui lòng điền đầy đủ các trường bắt buộc");
			return;
		}
		if (password !== confirm) {
			Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
			return;
		}
		Alert.alert("Thành công", `Đã tạo tài khoản cho ${name}`);
		router.replace("/auth/login");
	};

	return (
		<SafeAreaView style={[styles.safeArea, { backgroundColor: backgroundWhite }]}>
			<StatusBar barStyle="dark-content" />
			<KeyboardAvoidingView behavior="padding" style={styles.flex}>
				<ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
					<TouchableOpacity activeOpacity={0.75} onPress={goBack} style={styles.backButton}>
						<Ionicons name="arrow-back" size={20} color={textColor} />
					</TouchableOpacity>

					<View style={styles.brandWrap}>
						<Image source={require("../../assets/images/logo-removebg.png")} style={styles.logo} contentFit="contain" />
					</View>

					<View style={styles.card}>
						<ThemedText fontWeight="semibold" style={[styles.title, { color: textColor }]}>Tạo tài khoản</ThemedText>
						<ThemedText fontWeight="medium" style={[styles.subtitle, { color: textColor, opacity: 0.85 }]}>Tạo tài khoản để bắt đầu.</ThemedText>

						<TextInput value={name} onChangeText={setName} placeholder="Họ và tên" placeholderTextColor={placeholderGray} style={styles.input} />
						<TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={placeholderGray} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
						<TextInput value={password} onChangeText={setPassword} placeholder="Mật khẩu" placeholderTextColor={placeholderGray} secureTextEntry style={styles.input} />
						<TextInput value={confirm} onChangeText={setConfirm} placeholder="Xác nhận mật khẩu" placeholderTextColor={placeholderGray} secureTextEntry style={styles.input} />

						<TouchableOpacity activeOpacity={0.85} onPress={handleRegister} style={[styles.button, { backgroundColor: brandGreen }]}>
							<ThemedText fontWeight="semibold" style={styles.buttonText}>Đăng ký</ThemedText>
						</TouchableOpacity>

						<TouchableOpacity activeOpacity={0.8} onPress={() => router.replace("/auth/login")} style={styles.footerLinkWrap}>
							<ThemedText style={[styles.footerText, { color: placeholderGray }]}>Đã có tài khoản? </ThemedText>
							<ThemedText fontWeight="semibold" style={[styles.footerText, { color: brandGreen }]}>Đăng nhập</ThemedText>
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
		scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 12 },
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.7)",
		marginBottom: 14,
	},
	brandWrap: { alignItems: "center", marginBottom: 14 },
	logo: { width: 220, height: 90 },
	card: {
		width: "100%",
		backgroundColor: "white",
		borderRadius: 28,
		paddingHorizontal: 20,
		paddingVertical: 20,
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
	footerLinkWrap: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 18 },
	footerText: { fontSize: 13 },
});

