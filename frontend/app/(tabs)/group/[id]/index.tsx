import TopAppBar from "@/components/TopAppBar";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { expenseService } from "@/api/services/expense.service";
import { groupService } from "@/api/services/group.service";
import { settlementService } from "@/api/services/settlement.service";

import { balanceService } from "@/api/services/balance.service";
import { Balance } from "@/api/types/balance";
import { Expense } from "@/api/types/expense";
import { Group, GroupMember } from "@/api/types/group";
import { useEffect, useState } from "react";

import { DebtEdge } from "@/api/types/settlement";
import { useAuthStore } from "@/store/auth.store";

const user = useAuthStore.getState().user;

// user to repay debt
// const user = [
//   {
//     id: "user-1",
//     name: "Nguyen Van A",
//     avatar: "https://randomuser.me/api/portraits/men/1.jpg",
//     amount: -500000,
//   },
//   {
//     id: "user-2",
//     name: "Nguyen Van B",
//     avatar: "https://randomuser.me/api/portraits/men/2.jpg",
//     amount: 300000,
//   },
//   {
//     id: "user-3",
//     name: "Nguyen Van C",
//     avatar: "https://randomuser.me/api/portraits/men/3.jpg",
//     amount: 200000,
//   },
// ];

// filter user to repay debt
// const userToPay = user
//   .filter((u) => u.amount < 0)
//   .map((u) => ({
//     ...u,
//     amount: Math.abs(u.amount),
//   }));

// recent activity
const recentActivity = [
  {
    id: "activity-1",
    description: "Vé xe đi Đà Lạt",
    timestamp: "2026-05-21T10:00:00Z",
    whopay: "Nguyen Van A",
    amount: 100000,
    quantity: 1,
    moneyforyou: 10000,
    icon: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    id: "activity-2",
    description: "Ăn uống",
    timestamp: "2024-06-02T12:00:00Z",
    whopay: "Nguyen Van B",
    amount: 200000,
    quantity: 2,
    moneyforyou: -5000,
    icon: "https://randomuser.me/api/portraits/men/22.jpg",
  },
];

// func
const getTimeGroup = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);

  const isToday = now.toDateString() === time.toDateString();

  const isYesterday =
    new Date(now.setDate(now.getDate() - 1)).toDateString() ===
    time.toDateString();

  if (isToday) return "Hôm nay";
  if (isYesterday) return "Hôm qua";
  return "Trước đó";
};

const groupedActivity = recentActivity.reduce(
  (acc, item) => {
    const group = getTimeGroup(item.timestamp);

    if (!acc[group]) acc[group] = [];

    acc[group].push(item);

    return acc;
  },
  {} as Record<string, typeof recentActivity>,
);

export default function GroupDetail() {
  const { id } = useLocalSearchParams();

  const [group, setGroup] = useState<Group>();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [mybalances, setBalances] = useState<Balance>();

  const [memberToPay, setMemberToPay] = useState<DebtEdge[]>([]);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const data = await groupService.getGroup(id as string);
        setGroup(data);
      } catch (error) {
        console.error("Failed to fetch group details:", error);
      }
    };

    const fetchMembers = async () => {
      try {
        const data = await groupService.getGroupMembers(id as string);
        setMembers(data);
      } catch (error) {
        console.error("Failed to fetch group members:", error);
      }
    };

    const fetchExpenses = async () => {
      try {
        const { items } = await expenseService.getExpenses(id as string);
        setExpenses(items);
      } catch (error) {
        console.error("Failed to fetch group expenses:", error);
      }
    };

    const fetchBalances = async () => {
      try {
        const data = await balanceService.getMyBalance(id as string);
        setBalances(data);
      } catch (error) {
        console.error("Failed to fetch my balances:", error);
      }
    };

    const fetchSettlements = async () => {
      try {
        const items = await settlementService.getDebts(id as string);
        items.forEach((item) => {
          if (item.fromUser?.id === user?.id) {
            // bạn là người trả nợ
            setMemberToPay((prev) => [...prev, item]);
          }
        });
      } catch (error) {
        console.error("Failed to fetch settlements:", error);
      }
    };

    fetchGroup();
    fetchMembers();
    fetchExpenses();
    fetchBalances();
    fetchSettlements();
  }, [id]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <TopAppBar title="Chi tiết nhóm" showBack />
      <ScrollView
        contentContainerStyle={{
          paddingTop: 16,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 20,
          alignItems: "center",
        }}
      >
        {/* CARD */}
        <View
          style={{
            width: "95%",
            backgroundColor: "#fff",
            padding: 20,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          {/* HEADER */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              marginBottom: 16,
            }}
          >
            <View>
              <Image
                source={{
                  uri: "https://randomuser.me/api/portraits/men/1.jpg",
                }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 10,
                }}
              />
            </View>

            {/* TEXT */}
            <View style={{ alignItems: "flex-start" }}>
              <Text style={{ fontSize: 23, fontWeight: "bold" }}>
                {group?.name || "Đang tải..."}
              </Text>
              <Text style={{ color: "gray", fontSize: 16 }}>
                {group?.memberCount
                  ? `${group.memberCount} thành viên`
                  : "Đang tải..."}
              </Text>
            </View>
          </View>

          {/* STATS */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 20,
            }}
          >
            {/* BOX 1 */}
            <View
              style={{
                backgroundColor: "#f0f0f0",
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, color: "gray" }}>Tổng chi tiêu</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold" }}>
                5.000.000đ
              </Text>
            </View>

            {/* BOX 2 */}
            <View
              style={{
                backgroundColor: "green",
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, color: "white" }}>
                Số dư của bạn
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                {mybalances
                  ? `${mybalances.balance >= 0 ? "+" : ""}${mybalances.balance}đ`
                  : "Đang tải..."}
              </Text>
            </View>
          </View>
        </View>

        {/* Button */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginVertical: 4,
            marginBottom: 22,
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "green",
              paddingVertical: 16,
              paddingHorizontal: 12,
              borderRadius: 10,
            }}
            onPress={() => router.push(`/group/${id}/add-expense`)}
          >
            <MaterialIcons name="add-circle-outline" size={24} color="white" />
            <Text style={{ fontSize: 16, color: "white" }}>Thêm khoản chi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#a7cff5ff",
              paddingVertical: 16,
              paddingHorizontal: 28,
              borderRadius: 10,
            }}
            onPress={() => router.push(`/group/${id}/pay`)}
          >
            <MaterialCommunityIcons
              name="cash-multiple"
              size={24}
              color="gray"
            />
            <Text style={{ fontSize: 16, color: "gray" }}>Thanh toán</Text>
          </TouchableOpacity>
        </View>

        {/* User to repay debt */}
        <View
          style={{
            width: "95%",
            flexDirection: "row",
            justifyContent: "flex-start",
            marginBottom: 2,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>Trả nợ</Text>
        </View>
        {memberToPay.map((user) => (
          <View
            key={user.fromUserId}
            style={{
              width: "95%",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fba8a8ff",
              padding: 12,
              borderRadius: 10,
              marginVertical: 12,
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Image
                source={{
                  uri:
                    user.toUser?.avatarUrl ||
                    "https://randomuser.me/api/portraits/men/1.jpg",
                }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 100,
                }}
              />
              <View style={{ flexDirection: "column" }}>
                <Text>{user.toUser?.displayName}</Text>
                <Text>{user.amount}đ</Text>
              </View>
            </View>

            <View
              style={{
                marginRight: 8,
                backgroundColor: "#ed5a5aff",
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>Trả nợ</Text>
            </View>
          </View>
        ))}

        {/* Recent activity */}
        <View
          style={{
            width: "95%",
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 12,
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              alignSelf: "flex-start",
            }}
          >
            Hoạt động gần đây
          </Text>
          <TouchableOpacity>
            <Text style={{ color: "green" }}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {/* Specific activity items */}
        {/* {Object.entries(groupedActivity).map(([group, items]) => (
          <View key={group} style={{ width: "95%" }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                marginTop: 4,
                marginBottom: 6,
                color: "gray",
              }}
            >
              {group}
            </Text>

            {items.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                onPress={() =>
                  router.push(`/group/${id}/expense/${activity.id}`)
                }
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: "#fff",
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={{ uri: activity.icon }}
                    style={{ width: 50, height: 50, borderRadius: 20 }}
                  />

                  <View>
                    <Text>{activity.description}</Text>
                    <Text style={{ color: "gray", fontSize: 12 }}>
                      {activity.whopay} - {activity.quantity} người
                    </Text>
                  </View>
                </View>

                <View
                  style={{ alignItems: "flex-end", justifyContent: "center" }}
                >
                  <Text style={{ fontWeight: "bold" }}>{activity.amount}đ</Text>
                  <Text
                    style={{
                      color: activity.moneyforyou >= 0 ? "green" : "red",
                    }}
                  >
                    {activity.moneyforyou >= 0
                      ? `+${activity.moneyforyou}đ`
                      : `${activity.moneyforyou}đ`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))} */}
        {expenses.map((expense) => (
          <TouchableOpacity
            style={{
              width: "95%",
            }}
            key={expense.id}
            onPress={() => router.push(`/group/${id}/expense/${expense.id}`)}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                backgroundColor: "#fff",
                padding: 12,
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <Image
                  source={{
                    uri: "https://randomuser.me/api/portraits/men/1.jpg",
                  }}
                  style={{ width: 50, height: 50, borderRadius: 20 }}
                />

                <View>
                  <Text>{expense.description}</Text>
                  <Text style={{ color: "gray", fontSize: 12 }}>
                    {expense.payer?.displayName} -{" "}
                    {expense.participants?.length} người
                  </Text>
                </View>
              </View>

              <View
                style={{ alignItems: "flex-end", justifyContent: "center" }}
              >
                <Text style={{ fontWeight: "bold" }}>{expense.amount}đ</Text>
                {/* <Text
                  style={{
                    color: expense.amount >= 0 ? "green" : "red",
                  }}
                >
                  {expense.amount >= 0
                    ? `+${expense.amount}đ`
                    : `${expense.amount}đ`}
                </Text> */}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Member */}
        <View
          style={{
            width: "95%",
            flexDirection: "row",
            justifyContent: "flex-start",
            marginTop: 12,
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            Thành viên nhóm
          </Text>
        </View>
        {/* Member items */}
        <View
          style={{
            width: "95%",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {members.map((member) => (
            <View
              key={member.userId}
              style={{
                width: "48%",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                marginVertical: 4,
                backgroundColor: "#fff",
                padding: 12,
                borderRadius: 10,
              }}
            >
              <Image
                source={{
                  uri:
                    member.avatarUrl ||
                    "https://randomuser.me/api/portraits/men/1.jpg",
                }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 100,
                }}
              />
              <View style={{ flexDirection: "column", alignItems: "center" }}>
                <Text style={{ fontWeight: "bold" }}>{member.displayName}</Text>
                {/* <Text style={{ color: member.amount >= 0 ? "green" : "red" }}>
                  {member.amount >= 0
                    ? `+${member.amount}đ`
                    : `${member.amount}đ`}
                </Text> */}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
