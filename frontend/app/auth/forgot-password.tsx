import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, TextInput, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function ForgotPassword() {
	const { textColor, lightGray, backgroundWhite } = useAppTheme();
	const [email, setEmail] = useState("");
	const brandGreen = "#22C55E";
	const placeholderGray = "#9CA3AF";
	const goBack = () => {
		if (router.canGoBack()) {
			router.back();
			return;
		}
		router.replace("/auth/login");
	};

	const handleSubmit = () => {
		if (!email) {
			Alert.alert("Lỗi", "Vui lòng nhập email");
			return;
		}
		Alert.alert("Đã gửi yêu cầu", `Yêu cầu đặt lại mật khẩu đã gửi tới ${email}`);
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

					<SafeAreaView style={styles.card}>
						<ThemedText fontWeight="semibold" style={[styles.title, { color: textColor }]}>Quên mật khẩu</ThemedText>
						<ThemedText fontWeight="medium" style={[styles.subtitle, { color: placeholderGray, opacity: 0.85 }]}>Nhập email để nhận liên kết đặt lại mật khẩu.</ThemedText>

						<TextInput
							value={email}
							onChangeText={setEmail}
							placeholder="Email"
							placeholderTextColor={placeholderGray}
							keyboardType="email-address"
							autoCapitalize="none"
							style={styles.input}
						/>

						<TouchableOpacity activeOpacity={0.8} onPress={handleSubmit} style={[styles.button, { backgroundColor: brandGreen }]}>
							<ThemedText fontWeight="semibold" style={styles.buttonText}>Gửi yêu cầu</ThemedText>
						</TouchableOpacity>

						<TouchableOpacity activeOpacity={0.8} onPress={() => router.replace("/auth/login")} style={styles.footerLinkWrap}>
							<ThemedText style={[styles.footerText, { color: placeholderGray }]}>Quay lại </ThemedText>
							<ThemedText fontWeight="semibold" style={[styles.footerText, { color: brandGreen }]}>Đăng nhập</ThemedText>
						</TouchableOpacity>
					</SafeAreaView>
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
