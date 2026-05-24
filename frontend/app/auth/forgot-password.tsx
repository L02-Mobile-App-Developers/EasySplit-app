import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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

export default function ForgotPassword() {
	const { textColor, lightGray, backgroundWhite, selected } = useAppTheme();
	const [email, setEmail] = useState("");
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
				<View style={styles.topBand} />
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<TouchableOpacity
						activeOpacity={0.75}
						onPress={goBack}
						style={[styles.backButton, { borderColor: outline, backgroundColor: surface }]}
					>
						<Ionicons name="arrow-back" size={20} color={textColor} />
					</TouchableOpacity>

					<SafeAreaView style={[styles.card, { backgroundColor: surface }]}> 
						<View style={[styles.heroAccent, { backgroundColor: brandGreen }]} />
						<ThemedText fontWeight="semibold" style={[styles.title, { color: textColor }]}>Quên mật khẩu</ThemedText>
						<ThemedText fontWeight="medium" style={[styles.subtitle, { color: placeholderGray, opacity: 0.85 }]}>Nhập email để nhận liên kết đặt lại mật khẩu.</ThemedText>

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
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		marginBottom: 14,
	},
	card: {
		width: "100%",
		borderRadius: 28,
		paddingHorizontal: 20,
		paddingVertical: 20,
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
	footerLinkWrap: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 18 },
	footerText: { fontSize: 13 },
});
