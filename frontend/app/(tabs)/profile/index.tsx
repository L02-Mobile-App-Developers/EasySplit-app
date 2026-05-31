import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { meService } from "@/api/services/me.service";
import type { User } from "@/api/types/auth";
import type { Subscription, Usage } from "@/api/types/me";
import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuthStore } from "@/store/auth.store";

const fallbackAvatar = require("../../../assets/images/icon.png");

type ProfileData = {
  user: User;
  subscription: Subscription;
  usage: Usage;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [draft, setDraft] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [planAction, setPlanAction] = useState<"upgrade" | "downgrade" | null>(null);
  const theme = useAppTheme();

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const [user, subscription, usage] = await Promise.all([
          meService.getProfile(),
          meService.getSubscription(),
          meService.getUsage(),
        ]);

        setProfile({ user, subscription, usage });
        setDraft(user);
        useAuthStore.setState({ user, isAuthenticated: true });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const beginEditing = () => {
    if (!profile) return;
    setDraft(profile.user);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (!profile) return;
    setDraft(profile.user);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!draft) return;

    setLoading(true);

    try {
      const updatedUser = await meService.updateProfile({
        displayName: draft.displayName,
        avatarUrl: draft.avatarUrl,
      });

      setProfile((current) =>
        current ? { ...current, user: updatedUser } : current,
      );
      setDraft(updatedUser);
      useAuthStore.setState({ user: updatedUser, isAuthenticated: true });
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const premiumCheckoutUrl =
    process.env.EXPO_PUBLIC_PREMIUM_URL || process.env.EXPO_PUBLIC_SUBSCRIPTION_URL;

  const openPlanFlow = async (action: "upgrade" | "downgrade") => {
    if (action === "upgrade") {
      setPlanAction(action);
      return;
    }

    if (!premiumCheckoutUrl) {
      Alert.alert(
        "Chuyển sang Free",
        "Hiện chưa có trang đổi gói được cấu hình. Khi có URL quản lý gói, nút này sẽ mở luồng hủy Premium.",
      );
      return;
    }

    try {
      await Linking.openURL(premiumCheckoutUrl);
    } catch (error) {
      console.error("Open plan URL error:", error);
      Alert.alert("Không mở được trang quản lý gói");
    }
  };

  const handlePremiumCheckout = async () => {
    if (!premiumCheckoutUrl) {
      Alert.alert(
        "Đăng ký Premium",
        "Chưa có URL thanh toán Premium. Hãy cấu hình EXPO_PUBLIC_PREMIUM_URL hoặc EXPO_PUBLIC_SUBSCRIPTION_URL để mở luồng đăng ký.",
      );
      return;
    }

    try {
      await Linking.openURL(premiumCheckoutUrl);
    } catch (error) {
      console.error("Open premium checkout error:", error);
      Alert.alert("Không mở được trang đăng ký Premium");
    }
  };

  const closePlanAction = () => setPlanAction(null);

  const handlePlanConfirm = async () => {
    if (!planAction) return;

    if (planAction === "upgrade") {
      await handlePremiumCheckout();
      return;
    }

    await openPlanFlow("downgrade");
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <TopAppBar title="Cá nhân" showSearch showSettings />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.screen}>
        <TopAppBar title="Cá nhân" showSearch showSettings />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Không thể tải dữ liệu</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopAppBar title="Cá nhân" showSearch showSettings />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={
                profile.user.avatarUrl
                  ? { uri: profile.user.avatarUrl }
                  : fallbackAvatar
              }
              style={styles.avatar}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                if (!isEditing) {
                  beginEditing();
                  return;
                }

                // pick image from library
                try {
                  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (perm.status !== "granted") return;

                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.7,
                    allowsEditing: true,
                    aspect: [1, 1],
                  });

                  if (!result.canceled) {
                    const uri = (result as any).uri ?? (result as any).assets?.[0]?.uri;
                    if (uri) {
                      setDraft((cur) => (cur ? { ...cur, avatarUrl: uri } : cur));
                      useAuthStore.setState((s) => ({
                        user: s.user ? { ...s.user, avatarUrl: uri } : s.user,
                        isAuthenticated: s.isAuthenticated,
                      }));
                    }
                  }
                } catch (e) {
                  console.error("Pick image error:", e);
                }
              }}
              style={styles.avatarBadge}
            >
              <MaterialIcons
                name={isEditing ? "photo-library" : "edit"}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.nameText}>
            {draft?.displayName ?? profile.user.displayName}
          </Text>
          <Text style={styles.emailText}>
            {profile.user.email ?? "Chưa có email"}
          </Text>

          <View style={styles.badgeRow}>
            <StatusPill
              label={getPlanLabel(profile.subscription.plan)}
              tone={profile.subscription.plan === "premium" ? "accent" : "neutral"}
            />
            <StatusPill
              label={getSubscriptionStatusLabel(profile.subscription.status)}
              tone={profile.subscription.status === "active" ? "success" : "warning"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription & Usage</Text>
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View>
                <Text style={styles.subscriptionLabel}>Gói hiện tại</Text>
                <Text style={styles.subscriptionTitle}>
                  {getPlanLabel(profile.subscription.plan)}
                </Text>
              </View>
              <View
                style={[
                  styles.planBadge,
                  profile.subscription.plan === "premium"
                    ? { backgroundColor: `${theme.selected}18` }
                    : { backgroundColor: `${theme.lightGray}40` },
                ]}
              >
                <Text
                  style={[
                    styles.planBadgeText,
                    {
                      color:
                        profile.subscription.plan === "premium"
                          ? theme.selected
                          : theme.darkGreen,
                    },
                  ]}
                >
                  {profile.subscription.plan === "premium" ? "Premium" : "Free"}
                </Text>
              </View>
            </View>

            <View style={styles.subscriptionMeta}>
              <InfoRow
                icon="verified-user"
                label="Trạng thái"
                value={getSubscriptionStatusLabel(profile.subscription.status)}
              />
              <InfoRow
                icon="event-available"
                label="Chu kỳ"
                value={formatDateRange(
                  profile.subscription.currentPeriodStart,
                  profile.subscription.currentPeriodEnd,
                )}
              />
            </View>

            <View style={styles.usageBlock}>
              <UsageBar
                label="Nhóm"
                value={profile.usage.groupCount}
                max={profile.usage.freeMaxGroups}
                accentColor={theme.selected}
              />
              <UsageBar
                label="Smart settle / tháng"
                value={profile.usage.smartSettleUsedThisMonth}
                max={profile.usage.freeSmartSettlePerMonth}
                accentColor={theme.successGreen}
              />
            </View>

            <View style={styles.usageFootnote}>
              <Text style={styles.usageFootnoteText}>
                {profile.usage.groupCount >= profile.usage.freeMaxGroups
                  ? "Đã chạm giới hạn nhóm của gói miễn phí."
                  : `${profile.usage.freeMaxGroups - profile.usage.groupCount} nhóm còn lại trong gói miễn phí.`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đăng ký & đổi gói</Text>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planOverline}>Premium access</Text>
                <Text style={styles.planTitle}>Mở khóa các tính năng nâng cao</Text>
              </View>
              <MaterialIcons name="workspace-premium" size={28} color={theme.selected} />
            </View>

            <View style={styles.planGrid}>
              <PlanOption
                title="Free"
                description="Phù hợp để bắt đầu"
                features={[
                  "Tối đa {limit} nhóm",
                  "Smart settle giới hạn theo tháng",
                  "Các tính năng cốt lõi",
                ]}
                active={profile.subscription.plan === "free"}
                tone="neutral"
                actionLabel={profile.subscription.plan === "free" ? "Đang dùng" : "Chuyển sang Free"}
                featureLimit={profile.usage.freeMaxGroups}
                onPress={() => openPlanFlow("downgrade")}
              />
              <PlanOption
                title="Premium"
                description="Dành cho nhóm dùng thường xuyên"
                features={[
                  "Không giới hạn smart settle",
                  "Group settlement",
                  "Reminders và full history",
                ]}
                active={profile.subscription.plan === "premium"}
                tone="accent"
                actionLabel={profile.subscription.plan === "premium" ? "Đang dùng" : "Đăng ký Premium"}
                onPress={() => openPlanFlow("upgrade")}
              />
            </View>

            <View style={styles.planActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openPlanFlow("upgrade")}
                style={[styles.planPrimaryButton, { backgroundColor: theme.selected }]}
              >
                <MaterialIcons name="workspace-premium" size={18} color="#fff" />
                <Text style={styles.planPrimaryButtonText}>Đăng ký Premium</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openPlanFlow("downgrade")}
                style={[styles.planSecondaryButton, { borderColor: theme.lightGray }]}
              >
                <MaterialIcons name="swap-horiz" size={18} color={theme.darkGreen} />
                <Text style={[styles.planSecondaryButtonText, { color: theme.darkGreen }]}>Đổi gói</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          {isEditing ? (
            <View style={styles.formCard}>
              <Input
                value={draft?.displayName ?? ""}
                placeholder="Họ và tên"
                onChangeText={(value) =>
                  setDraft((current) =>
                    current ? { ...current, displayName: value } : current,
                  )
                }
              />
              <Input
                value={draft?.avatarUrl ?? ""}
                placeholder="Avatar URL"
                onChangeText={(value) =>
                  setDraft((current) =>
                    current ? { ...current, avatarUrl: value } : current,
                  )
                }
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: "#E5E7EB" }]}
                  onPress={cancelEditing}
                >
                  <Text style={styles.secondaryButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: "#16A34A" }]}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.primaryButtonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={beginEditing}
              style={styles.infoCard}
            >
              <MaterialIcons name="account-circle" size={24} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Cập nhật hồ sơ</Text>
                <Text style={styles.infoText}>
                  Chỉnh sửa tên hiển thị và avatar của bạn.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="lock-outline"
              label="Đổi mật khẩu"
              onPress={() => router.push("/auth/forgot-password")}
            />
            <MenuItem
              icon="logout"
              label="Đăng xuất"
              onPress={() => {
                router.replace("/auth/login");
                useAuthStore.getState().logout();
              }}
              danger
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={planAction !== null}
        transparent
        animationType="fade"
        onRequestClose={closePlanAction}
      >
        <View style={styles.planModalOverlay}>
          <View style={styles.planModalCard}>
            <View style={styles.planModalHeader}>
              <View style={[styles.planModalIcon, { backgroundColor: `${theme.selected}18` }]}>
                <MaterialIcons
                  name={planAction === "upgrade" ? "workspace-premium" : "swap-horiz"}
                  size={24}
                  color={theme.selected}
                />
              </View>
              <TouchableOpacity onPress={closePlanAction} style={styles.planModalClose}>
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.planModalTitle}>
              {planAction === "upgrade" ? "Đăng ký Premium" : "Chuyển sang Free"}
            </Text>
            <Text style={styles.planModalText}>
              {planAction === "upgrade"
                ? "Premium mở khóa smart settle không giới hạn, group settlement và reminders."
                : "Bạn có thể chuyển về gói Free bất cứ lúc nào. Một số tính năng nâng cao sẽ bị giới hạn."}
            </Text>

            <View style={styles.planModalActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={closePlanAction}
                style={[styles.planModalButton, styles.planModalButtonSecondary]}
              >
                <Text style={[styles.planModalButtonText, { color: theme.darkGreen }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  closePlanAction();
                  void handlePlanConfirm();
                }}
                style={[styles.planModalButton, { backgroundColor: theme.selected }]}
              >
                <Text style={styles.planModalButtonText}>
                  {planAction === "upgrade" ? "Tiếp tục" : "Xác nhận"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getPlanLabel = (plan: Subscription["plan"]) =>
  plan === "premium" ? "Premium" : "Free";

const getSubscriptionStatusLabel = (status: Subscription["status"]) => {
  switch (status) {
    case "active":
      return "Đang hoạt động";
    case "trialing":
      return "Đang dùng thử";
    case "grace_period":
      return "Gia hạn chờ xử lý";
    case "canceled":
      return "Đã hủy";
    case "expired":
      return "Đã hết hạn";
    default:
      return "Không hoạt động";
  }
};

const formatDate = (value: string | null) => {
  if (!value) return "Chưa cập nhật";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Chưa cập nhật";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
};

const formatDateRange = (start: string | null, end: string | null) => {
  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);

  if (formattedStart === "Chưa cập nhật" && formattedEnd === "Chưa cập nhật") {
    return "Chưa có dữ liệu";
  }

  return `${formattedStart} - ${formattedEnd}`;
};

const StatusPill = ({
  label,
  tone,
}: {
  label: string;
  tone: "accent" | "success" | "warning" | "neutral";
}) => {
  const theme = useAppTheme();
  const toneStyleMap = {
    accent: {
      backgroundColor: `${theme.selected}18`,
      color: theme.selected,
    },
    success: {
      backgroundColor: `${theme.successGreen}18`,
      color: theme.successGreen,
    },
    warning: {
      backgroundColor: `${theme.warningYellow}18`,
      color: theme.warningYellow,
    },
    neutral: {
      backgroundColor: `${theme.lightGray}40`,
      color: theme.darkGreen,
    },
  } as const;

  const toneStyle = toneStyleMap[tone];

  return (
    <View style={[styles.statusPill, { backgroundColor: toneStyle.backgroundColor }]}>
      <Text style={[styles.statusPillText, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) => {
  const theme = useAppTheme();

  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: `${theme.selected}18` }]}>
        <MaterialIcons name={icon} size={18} color={theme.selected} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
};

const UsageBar = ({
  label,
  value,
  max,
  accentColor,
}: {
  label: string;
  value: number;
  max: number;
  accentColor: string;
}) => {
  const safeMax = Math.max(max, 1);
  const progress = Math.min(value / safeMax, 1);
  const remaining = Math.max(max - value, 0);

  return (
    <View style={styles.usageBarBlock}>
      <View style={styles.usageBarHeader}>
        <Text style={styles.usageBarLabel}>{label}</Text>
        <Text style={styles.usageBarValue}>
          {value}/{max}
        </Text>
      </View>
      <View style={styles.usageTrack}>
        <View
          style={[
            styles.usageFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>
      <Text style={styles.usageHelperText}>
        Còn lại {remaining} mục trong hạn mức này.
      </Text>
    </View>
  );
};

const PlanOption = ({
  title,
  description,
  features,
  active,
  tone,
  actionLabel,
  featureLimit,
  onPress,
}: {
  title: string;
  description: string;
  features: string[];
  active: boolean;
  tone: "accent" | "neutral";
  actionLabel: string;
  featureLimit?: number;
  onPress: () => void;
}) => {
  const theme = useAppTheme();
  const accent = tone === "accent" ? theme.selected : theme.darkGreen;
  const backgroundColor = tone === "accent" ? `${theme.selected}10` : "#F7F9F7";

  return (
    <View style={[styles.planOption, { backgroundColor, borderColor: active ? accent : theme.lightGray }]}>
      <View style={styles.planOptionHeader}>
        <View>
          <Text style={[styles.planOptionTitle, { color: accent }]}>{title}</Text>
          <Text style={styles.planOptionDescription}>{description}</Text>
        </View>
        {active && (
          <View style={[styles.planActivePill, { backgroundColor: `${accent}18` }]}>
            <Text style={[styles.planActivePillText, { color: accent }]}>Hiện tại</Text>
          </View>
        )}
      </View>

      <View style={styles.planFeatureList}>
        {features.map((feature) => (
          <View key={feature} style={styles.planFeatureRow}>
            <MaterialIcons name="check-circle" size={16} color={accent} />
            <Text style={styles.planFeatureText}>
              {feature.replace("{limit}", String(featureLimit ?? 5))}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.planOptionButton, { backgroundColor: active ? `${accent}16` : accent }]}
      >
        <Text style={[styles.planOptionButtonText, { color: active ? accent : "#FFFFFF" }]}>
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const Input = ({
  value,
  placeholder,
  onChangeText,
}: {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#9CA3AF"
    style={styles.input}
  />
);

const MenuItem = ({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={styles.menuItem}
  >
    <MaterialIcons
      name={icon}
      size={22}
      color={danger ? "#BA1A1A" : "#16A34A"}
    />
    <Text style={[styles.menuText, danger && { color: "#BA1A1A" }]}>
      {label}
    </Text>
    <MaterialIcons name="chevron-right" size={22} color="#6B7280" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7F4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6B7280" },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarWrap: { position: "relative", marginBottom: 14 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#16A34A",
  },
  avatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#16A34A",
    borderWidth: 3,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  nameText: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  emailText: { marginTop: 4, color: "#6B7280" },
  badgeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  statusPill: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: { fontSize: 12, fontWeight: "800" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  subscriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  subscriptionLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  subscriptionTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  planBadge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  planBadgeText: { fontSize: 12, fontWeight: "800" },
  subscriptionMeta: { gap: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F7F9F7",
    borderRadius: 18,
    padding: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoRowLabel: { fontSize: 12, color: "#6B7280" },
  infoRowValue: { marginTop: 2, fontSize: 14, fontWeight: "700", color: "#0F172A" },
  usageBlock: { gap: 14 },
  usageBarBlock: { gap: 8 },
  usageBarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  usageBarLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  usageBarValue: { fontSize: 13, fontWeight: "800", color: "#16A34A" },
  usageTrack: {
    width: "100%",
    height: 10,
    borderRadius: 9999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  usageFill: {
    height: "100%",
    borderRadius: 9999,
  },
  usageHelperText: { fontSize: 12, color: "#6B7280" },
  usageFootnote: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  usageFootnoteText: { fontSize: 12, color: "#6B7280" },
  planModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  planModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  planModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  planModalClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  planModalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  planModalText: { fontSize: 14, lineHeight: 20, color: "#475569" },
  planModalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  planModalButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  planModalButtonSecondary: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  planModalButtonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planOverline: { fontSize: 12, fontWeight: "800", color: "#6B7280", textTransform: "uppercase" },
  planTitle: { marginTop: 4, fontSize: 18, fontWeight: "800", color: "#0F172A" },
  planGrid: { gap: 12 },
  planOption: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
  },
  planOptionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  planOptionTitle: { fontSize: 16, fontWeight: "800" },
  planOptionDescription: { marginTop: 2, fontSize: 13, color: "#6B7280" },
  planActivePill: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  planActivePillText: { fontSize: 12, fontWeight: "800" },
  planFeatureList: { gap: 8 },
  planFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planFeatureText: { flex: 1, fontSize: 13, color: "#0F172A" },
  planOptionButton: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  planOptionButtonText: { fontSize: 13, fontWeight: "800" },
  planActions: { flexDirection: "row", gap: 10 },
  planPrimaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  planPrimaryButtonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  planSecondaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
  },
  planSecondaryButtonText: { fontSize: 13, fontWeight: "800" },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    backgroundColor: "#F7F9F7",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  buttonRow: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: { fontWeight: "700", color: "#0F172A" },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: { fontWeight: "700", color: "#FFFFFF" },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  infoTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  infoText: { marginTop: 4, color: "#6B7280" },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: "700", color: "#0F172A" },
});
