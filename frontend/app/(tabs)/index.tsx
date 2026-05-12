import { useAppTheme } from "@/hooks/useAppTheme";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// hardcode
const money = 123456789;

const recentActivities = [
  {
    id: 1,
    image: require("../../assets/images/icon.png"),
    description: "A đã thanh toán cho Trà sữa",
    time: "2 giờ trước",
    money: 50000,
    type: "received",
  },
  {
    id: 4,
    image: require("../../assets/images/icon.png"),
    description:
      "A đã thanh toán cho Trà sữaccccccccccccccccccccccccccccccccccccccccccc",
    time: "2 giờ trước",
    money: 50000,
    type: "received",
  },
  {
    id: 3,
    image: require("../../assets/images/icon.png"),
    description: "A đã thanh toán cho Trà sữa",
    time: "2 giờ trước",
    money: 50000,
    type: "received",
  },
  {
    id: 2,
    image: require("../../assets/images/icon.png"),
    description: "A đã thanh toán cho Trà sữa",
    time: "2 giờ trước",
    money: 50000,
    type: "received",
  },
];

const recentGroups = [
  {
    id: 1,
    name: "Du lịch Đà lạt",
    members: 4,
    status: "Đang cân bằng",
  },
  {
    id: 2,
    name: "Ăn uống phòng trọ",
    members: 4,
    status: "Đang cân bằng",
  },
];

const quickActions = [
  {
    id: 11,
    icon: <AntDesign name="usergroup-add" size={24} color="#16A34A" />,
    label: "Tạo nhóm",
    route: "/group/add",
  },
  {
    id: 21,
    icon: <AntDesign name="user-add" size={24} color="#16A34A" />,
    label: "Thêm bạn",
    route: "/friend/add",
  },
  {
    id: 31,
    icon: <MaterialIcons name="add-card" size={24} color="#16A34A" />,
    label: "Thêm chi",
    route: "/transaction/add",
  },
];

export default function Index() {
  const { textColor, selected, lightGray, errorRed, successGreen } =
    useAppTheme();

  return (
    // <SafeAreaView style={{ flex: 1 }}>
    <ScrollView
      contentContainerStyle={{
        paddingTop: 60,
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 20,
      }}
    >
      {/* Tổng chênh lệch */}
      <View
        style={{
          alignItems: "flex-start",
          marginBottom: 20,
          backgroundColor: "#ffffff",
          padding: 20,
          borderRadius: 12,
          gap: 8,
        }}
      >
        <Text style={{ color: textColor, fontSize: 18, fontWeight: "bold" }}>
          Tổng chênh lệch
        </Text>
        <Text style={{ fontWeight: "bold", fontSize: 28, color: successGreen }}>
          +{money.toLocaleString()}
        </Text>
        <View
          style={{
            backgroundColor: selected,
            padding: 12,
            borderRadius: 12,
            marginTop: 10,
            width: "50%",
          }}
        >
          <Text
            style={{
              fontWeight: "600",
              textAlign: "center",
              color: textColor,
            }}
          >
            Dòng tiền dương
          </Text>
        </View>
      </View>

      {/* Nợ - Nhận */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View
          style={{
            padding: 20,
            backgroundColor: "#ffaeaeff",
            borderRadius: 10,
            width: "48%",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "bold", color: errorRed }}>
            Bạn đang nợ
          </Text>
          <Text style={{ fontWeight: "bold", color: errorRed, fontSize: 18 }}>
            {money.toLocaleString()}
          </Text>
        </View>
        <View
          style={{
            padding: 20,
            backgroundColor: "#d0ffe0ff",
            borderRadius: 10,
            width: "48%",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "bold", color: successGreen }}>
            Bạn được nhận
          </Text>
          <Text
            style={{ fontWeight: "bold", color: successGreen, fontSize: 18 }}
          >
            {money.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Thao tác nhanh */}
      <View style={{ marginTop: 20, flexDirection: "column", gap: 10 }}>
        <Text>Thao tác nhanh</Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-start",
            gap: 20,
          }}
        >
          {quickActions.map((item) => (
            <TouchableOpacity
              style={{ flexDirection: "column", alignItems: "center" }}
              key={item.id}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <View
                style={{
                  backgroundColor: lightGray,
                  padding: 20,
                  borderRadius: 20,
                }}
              >
                {item.icon}
              </View>
              <Text style={{ marginTop: 5, fontWeight: "500" }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Nhóm gần đây */}
      <View style={{ flexDirection: "column", gap: 10, marginTop: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text>Nhóm gần đây</Text>
          <Text style={{ color: selected }}>Xem tất cả</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            justifyContent: "space-between",
          }}
        >
          {recentGroups.map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: "column",
                alignItems: "flex-start",
                backgroundColor: "#ffffff",
                padding: 20,
                paddingRight: 40,
                borderRadius: 10,
                gap: 5,
                width: "48%",
              }}
            >
              <View
                style={{
                  backgroundColor: selected,
                  padding: 10,
                  borderRadius: 5,
                  marginBottom: 10,
                }}
              >
                <MaterialIcons name="tour" size={24} color="black" />
              </View>

              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ fontWeight: "bold", fontSize: 16 }}
              >
                {item.name}
              </Text>
              <Text style={{ fontSize: 14 }}>{item.members} thành viên</Text>
              <Text style={{ marginTop: 12 }}>{item.status}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Hoạt động gần đây */}
      <View style={{ flexDirection: "column", gap: 10, marginTop: 20 }}>
        <Text>Hoạt động gần đây</Text>
        {recentActivities.map((item) => (
          <View
            key={item.id}
            style={{
              flexDirection: "row",
              backgroundColor: "#ffffff",
              padding: 10,
              borderRadius: 5,
            }}
          >
            <Image
              source={item.image}
              style={{ width: 40, height: 40, marginRight: 10 }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                flex: 1,
              }}
            >
              {/* left */}
              <View
                style={{
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  width: "60%",
                }}
              >
                <Text numberOfLines={1} ellipsizeMode="tail">
                  {item.description}
                </Text>
                <Text>{item.time}</Text>
              </View>
              {/* right */}
              <View
                style={{
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  flex: 1,
                }}
              >
                <Text>${item.money}</Text>
                <Text>{item.type === "received" ? "Lấy lại" : "Cần trả"}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
    // </SafeAreaView>
  );
}
