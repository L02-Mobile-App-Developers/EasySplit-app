import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import TopAppBar from "@/components/TopAppBar";
import { groupService } from "@/api/services/group.service";
import type { GroupMember } from "@/api/types/group";

const participants = [
  { id: 1, name: "BẠN" },
  { id: 2, name: "MAI" },
  { id: 3, name: "NAM" },
  { id: 4, name: "VY" },
];

const splitModes = ["CHIA ĐỀU", "SỐ TIỀN", "%"] as const;

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams();
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("Bạn (Khoa)");
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [splitMode, setSplitMode] = useState<(typeof splitModes)[number]>("CHIA ĐỀU");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>(participants.map((item) => item.id));

  const parsedAmount = Number(amount.replace(/[^0-9]/g, "")) || 0;
  const selectedCount = selectedParticipantIds.length || 1;

  const perPersonAmount = useMemo(() => (selectedCount ? Math.floor(parsedAmount / selectedCount) : 0), [parsedAmount, selectedCount]);
  const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")} VND`;

  useEffect(() => {
    const fetchGroupMembers = async () => {
      try {
        const response = await groupService.getGroupMembers(String(id));
        setMembers(response);
      } catch (error) {
        console.error("Error fetching group members:", error);
      }
    };

    fetchGroupMembers();
  }, [id]);

  const toggleParticipant = (participantId: number) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId) ? current.filter((item) => item !== participantId) : [...current, participantId],
    );
  };

  const handleSave = () => {
    if (!expenseName.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên khoản chi.");
      return;
    }

    if (!parsedAmount) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    Alert.alert("Đã lưu", `Khoản chi ${expenseName} cho nhóm ${String(id)} đã được tạo thử nghiệm.`, [{ text: "OK", onPress: () => router.back() }]);
  };

  return (
    <View style={styles.screen}>
      <TopAppBar title="Thêm khoản chi" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.badge}><Text style={styles.badgeText}>Expense</Text></View>
          <Text style={styles.title}>Tạo khoản chi mới</Text>
          <Text style={styles.subtitle}>Nhập số tiền, chọn người trả và cách chia theo giao diện rõ ràng hơn.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Tên khoản chi</Text>
          <TextInput value={expenseName} onChangeText={setExpenseName} placeholder="Nhập tên khoản chi" placeholderTextColor="#9CA3AF" style={styles.input} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Số tiền</Text>
          <View style={styles.amountBox}>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="0" placeholderTextColor="#9CA3AF" style={styles.amountInput} />
            <Text style={styles.amountUnit}>VND</Text>
          </View>
          <Text style={styles.amountHint}>Ước tính mỗi người: {formatCurrency(perPersonAmount)}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Người trả</Text>
          <Pressable onPress={() => setShowPayerModal(true)} style={styles.selectBox}>
            <View style={styles.selectRow}>
              <View style={styles.selectAvatar}><MaterialIcons name="person" size={18} color="#0F5E28" /></View>
              <Text style={styles.selectText}>{payer}</Text>
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={22} color="#6B7280" />
          </Pressable>
          <Text style={styles.helperText}>Đã tải {members.length} thành viên từ nhóm.</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Người tham gia</Text>
            <Text style={styles.counter}>{selectedParticipantIds.length} người</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.participantRow}>
            {participants.map((participant) => {
              const isSelected = selectedParticipantIds.includes(participant.id);
              return (
                <Pressable key={participant.id} onPress={() => toggleParticipant(participant.id)} style={styles.participantChipWrap}>
                  <View style={[styles.participantAvatar, isSelected && styles.participantAvatarActive]}>
                    <Text style={styles.participantInitial}>{participant.name}</Text>
                    {isSelected && <View style={styles.checkBadge}><AntDesign name="check" size={12} color="white" /></View>}
                  </View>
                  <Text style={styles.participantName}>{participant.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Kiểu chia</Text>
          <View style={styles.modeRow}>
            {splitModes.map((mode) => {
              const active = splitMode === mode;
              return (
                <Pressable key={mode} onPress={() => setSplitMode(mode)} style={[styles.modeChip, active ? styles.modeChipActive : styles.modeChipInactive]}>
                  <Text style={[styles.modeText, active ? styles.modeTextActive : styles.modeTextInactive]}>{mode}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={handleSave} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Lưu khoản chi</Text>
        </Pressable>

        <View style={styles.helperCardRow}>
          <MaterialIcons name="info-outline" size={20} color="#6B7280" />
          <Text style={styles.helperCardText}>Màn này đang giữ flow thử nghiệm, nhưng bố cục đã theo Material rõ hơn.</Text>
        </View>

        <Modal visible={showPayerModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Chọn người trả</Text>
              <ScrollView>
                {participants.map((participant) => (
                  <Pressable
                    key={participant.id}
                    onPress={() => {
                      setPayer(participant.name);
                      setShowPayerModal(false);
                    }}
                    style={styles.modalItem}
                  >
                    <Text style={styles.modalItemText}>{participant.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={() => setShowPayerModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>Hủy</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
  sectionCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 16, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  label: { color: "#6B7280", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  input: { backgroundColor: "#F7F9F7", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, color: "#0F172A" },
  amountBox: { backgroundColor: "#F7F9F7", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  amountInput: { flex: 1, fontSize: 34, fontWeight: "800", color: "#0F5E28", padding: 0 },
  amountUnit: { fontSize: 16, fontWeight: "800", color: "#0F5E28", marginLeft: 12 },
  amountHint: { color: "#6B7280" },
  selectBox: { backgroundColor: "#F7F9F7", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#EAF6EE", alignItems: "center", justifyContent: "center" },
  selectText: { fontWeight: "700", color: "#0F172A" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counter: { color: "#16A34A", fontWeight: "800" },
  participantRow: { gap: 10, paddingVertical: 4 },
  participantChipWrap: { alignItems: "center", gap: 8 },
  participantAvatar: { width: 66, height: 66, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", position: "relative" },
  participantAvatarActive: { borderColor: "#0F5E28" },
  participantInitial: { color: "#0F172A", fontWeight: "800" },
  participantName: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  checkBadge: { position: "absolute", right: -2, top: -2, backgroundColor: "#0F5E28", width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modeRow: { flexDirection: "row", gap: 10 },
  modeChip: { flex: 1, alignItems: "center", borderRadius: 999, paddingVertical: 12, borderWidth: 1 },
  modeChipActive: { backgroundColor: "#0F5E28", borderColor: "#0F5E28" },
  modeChipInactive: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
  modeText: { fontWeight: "800" },
  modeTextActive: { color: "white" },
  modeTextInactive: { color: "#0F172A" },
  primaryButton: { backgroundColor: "#0F5E28", paddingVertical: 15, borderRadius: 18, alignItems: "center" },
  primaryButtonText: { color: "white", fontWeight: "800" },
  helperCardRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14 },
  helperCardText: { flex: 1, color: "#6B7280" },
  helperText: { color: "#6B7280" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  modalCard: { backgroundColor: "#FFFFFF", padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "65%" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 12 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  modalItemText: { fontSize: 15, color: "#0F172A" },
  modalClose: { marginTop: 10, alignItems: "center", paddingVertical: 12, borderRadius: 14, backgroundColor: "#F3F4F6" },
  modalCloseText: { color: "#0F172A", fontWeight: "800" },
});