// app/group/[id]/pay/index.tsx

import { settlementService } from "@/api/services/settlement.service";
import { DebtEdge } from "@/api/types/settlement";
import TopAppBar from "@/components/TopAppBar";
import { useAuthStore } from "@/store/auth.store";

import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// const currentUser = useAuthStore((state) => state.user);

export default function PayScreen() {
  const { id } = useLocalSearchParams();

  const currentUser = useAuthStore((state) => state.user);

  const [debts, setDebts] = useState<DebtEdge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDebts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settlementService.getDebts(String(id));
      setDebts(data);
    } catch (error) {
      console.error("Failed to fetch debts:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchDebts();
    }, [fetchDebts]),
  );

  // Người khác nợ bạn
  const peopleOweYou = useMemo(() => {
    return debts.filter((item) => item.toUserId === currentUser?.id);
  }, [debts]);

  // Bạn nợ người khác
  const youOwePeople = useMemo(() => {
    return debts.filter((item) => item.fromUserId === currentUser?.id);
  }, [debts]);

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString("vi-VN")}đ`;
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F7F9FB",
        }}
      >
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <TopAppBar title="Thanh toán" showBack />

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40,
        }}
      >
        {/* YOU OWE */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 14,
          }}
        >
          Bạn cần trả
        </Text>

        {youOwePeople.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 14,
              marginBottom: 24,
            }}
          >
            <Text style={{ color: "gray" }}>Bạn hiện không nợ ai 🎉</Text>
          </View>
        ) : (
          youOwePeople.map((item) => (
            <View
              key={`${item.fromUserId}-${item.toUserId}`}
              style={{
                backgroundColor: "#fff1f2",
                borderRadius: 16,
                padding: 16,
                marginBottom: 14,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                <Image
                  source={{
                    uri:
                      item.toUser?.avatarUrl ||
                      "https://ui-avatars.com/api/?name=User",
                  }}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 100,
                  }}
                />

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {item.toUser?.displayName}
                  </Text>

                  <Text
                    style={{
                      marginTop: 4,
                      color: "#dc2626",
                      fontWeight: "600",
                    }}
                  >
                    Bạn nợ {formatMoney(item.amount)}
                  </Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#dc2626" : "#ef4444",
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 12,
                })}
                onPress={() => {
                  router.push({
                    pathname: "/group/[id]/pay/[payId]",
                    params: {
                      id: String(id),
                      payId: item.toUserId,
                      amount: String(item.amount),
                    },
                  });
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "700",
                  }}
                >
                  Trả nợ
                </Text>
              </Pressable>
            </View>
          ))
        )}

        {/* OWE YOU */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginTop: 10,
            marginBottom: 14,
          }}
        >
          Người khác nợ bạn
        </Text>

        {peopleOweYou.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: "gray" }}>Hiện chưa có ai nợ bạn</Text>
          </View>
        ) : (
          peopleOweYou.map((item) => (
            <View
              key={`${item.fromUserId}-${item.toUserId}`}
              style={{
                backgroundColor: "#ecfdf5",
                borderRadius: 16,
                padding: 16,
                marginBottom: 14,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                <Image
                  source={{
                    uri:
                      item.fromUser?.avatarUrl ||
                      "https://ui-avatars.com/api/?name=User",
                  }}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 100,
                  }}
                />

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {item.fromUser?.displayName}
                  </Text>

                  <Text
                    style={{
                      marginTop: 4,
                      color: "#16a34a",
                      fontWeight: "600",
                    }}
                  >
                    Nợ bạn {formatMoney(item.amount)}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "#22c55e",
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "700",
                  }}
                >
                  Chờ trả
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
