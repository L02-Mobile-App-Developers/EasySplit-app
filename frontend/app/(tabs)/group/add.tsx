import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import TopAppBar from "@/components/TopAppBar";
import { groupService } from "@/api/services/group.service";
import type { GroupCategory } from "@/api/types/group";

const categories: Array<{ value: GroupCategory; label: string; hint: string }> = [
  { value: "trip", label: "Du lịch", hint: "Chuyến đi ngắn hoặc dài ngày" },
  { value: "food", label: "Ăn uống", hint: "Ăn trưa, café, tiệc nhỏ" },
  { value: "roommate", label: "Ở chung", hint: "Tiền nhà, điện nước" },
  { value: "project", label: "Dự án", hint: "Công việc, team, lớp học" },
  { value: "other", label: "Khác", hint: "Nhóm dùng chung linh hoạt" },
];

const memberSuggestions = ["Mai", "Nam", "Vy", "Khoa", "Linh", "Huy"];

export default function AddGroupScreen() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GroupCategory>("trip");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(["Mai", "Nam"]);

  const selectedCategory = useMemo(() => categories.find((item) => item.value === category), [category]);

  const toggleMember = (member: string) => {
    setSelectedMembers((current) =>
      current.includes(member)
        ? current.filter((item) => item !== member)
        : [...current, member],
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên nhóm.");
      return;
    }

    try {
      await groupService.createGroup({ name: name.trim(), category });
      Alert.alert("Đã tạo nhóm", `Nhóm ${name} đã sẵn sàng.`, [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      console.error("Create group failed", error);
      Alert.alert("Không thể tạo nhóm", "Thử lại sau nhé.");
    }
  };

  return (
    <View style={styles.screen}>
      <TopAppBar title="Tạo nhóm" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.badge}><Text style={styles.badgeText}>Material</Text></View>
          <Text style={styles.title}>Tạo một nhóm mới</Text>
          <Text style={styles.subtitle}>Đặt tên, chọn loại nhóm và thêm vài người thân quen trước khi bắt đầu ghi chi tiêu.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Tên nhóm</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="groups" size={20} color="#0F5E28" />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nhập tên nhóm"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Danh mục</Text>
          <View style={styles.categoryGrid}>
            {categories.map((item) => {
              const active = item.value === category;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setCategory(item.value)}
                  style={[styles.categoryCard, active ? styles.categoryCardActive : styles.categoryCardInactive]}
                >
                  <View style={[styles.categoryIcon, active ? styles.categoryIconActive : styles.categoryIconInactive]}>
                    <MaterialIcons name={active ? "check-circle" : "radio-button-unchecked"} size={18} color={active ? "#FFFFFF" : "#0F5E28"} />
                  </View>
                  <Text style={styles.categoryTitle}>{item.label}</Text>
                  <Text style={styles.categoryHint}>{item.hint}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.activeCategoryBanner}>
            <Text style={styles.activeCategoryLabel}>Đang chọn</Text>
            <Text style={styles.activeCategoryValue}>{selectedCategory?.label}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Gợi ý thành viên</Text>
            <Text style={styles.counter}>{selectedMembers.length} người</Text>
          </View>
          <View style={styles.memberGrid}>
            {memberSuggestions.map((member) => {
              const active = selectedMembers.includes(member);
              return (
                <Pressable
                  key={member}
                  onPress={() => toggleMember(member)}
                  style={[styles.memberChip, active ? styles.memberChipActive : styles.memberChipInactive]}
                >
                  <Text style={[styles.memberChipText, active ? styles.memberChipTextActive : styles.memberChipTextInactive]}>{member}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={handleCreate} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Tạo nhóm</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7F4" },
  content: { padding: 20, gap: 14 },
  heroCard: { backgroundColor: "#FFFFFF", borderRadius: 28, padding: 18, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2 },
  badge: { alignSelf: "flex-start", backgroundColor: "#EAF6EE", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#0F5E28", fontWeight: "800", fontSize: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#6B7280", lineHeight: 20 },
  sectionCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  label: { color: "#6B7280", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F7F9F7", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14 },
  input: { flex: 1, color: "#0F172A", fontSize: 15 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryCard: { width: "48%", borderRadius: 22, padding: 14, gap: 8, borderWidth: 1 },
  categoryCardActive: { backgroundColor: "#0F5E28", borderColor: "#0F5E28" },
  categoryCardInactive: { backgroundColor: "#F7F9F7", borderColor: "#E5E7EB" },
  categoryIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  categoryIconActive: { backgroundColor: "rgba(255,255,255,0.18)" },
  categoryIconInactive: { backgroundColor: "#EAF6EE" },
  categoryTitle: { fontWeight: "800", color: "#0F172A" },
  categoryHint: { color: "#6B7280", fontSize: 12, lineHeight: 17 },
  activeCategoryBanner: { borderRadius: 18, backgroundColor: "#F0F9F3", padding: 14, gap: 4 },
  activeCategoryLabel: { color: "#6B7280", fontSize: 12, fontWeight: "700" },
  activeCategoryValue: { color: "#0F5E28", fontWeight: "800" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counter: { color: "#16A34A", fontWeight: "800" },
  memberGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  memberChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  memberChipActive: { backgroundColor: "#0F5E28", borderColor: "#0F5E28" },
  memberChipInactive: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
  memberChipText: { fontWeight: "700" },
  memberChipTextActive: { color: "#FFFFFF" },
  memberChipTextInactive: { color: "#0F172A" },
  primaryButton: { backgroundColor: "#0F5E28", paddingVertical: 15, borderRadius: 18, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
});