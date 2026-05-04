import { useAppTheme } from "@/hooks/useAppTheme";
import { AntDesign, EvilIcons, FontAwesome6 } from "@expo/vector-icons";
import { useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

const status = [
  { id: 1, name: "Tất cả" },
  { id: 2, name: "Đang hoạt động" },
  { id: 3, name: "Đã quyết toán" },
];

const groupList = [
  {
    id: 1,
    avt: require("@/assets/images/icon.png"),
    name: "Du lịch Đà lạt",
    members: 4,
    type: "Du lịch",
    settled: false, // đã quyết toán chưa
    icon: require("@/assets/images/icon.png"),
    money: 50000, // số tiền mình nợ (âm) hoặc được hoàn (dương)
    recentActivity: {
      description: "A đã thanh toán cho Trà sữa",
      time: "2 giờ trước",
    },
  },
  {
    id: 2,
    avt: require("@/assets/images/icon.png"),
    name: "Du lịch Vũng tàu",
    members: 4,
    type: "Du lịch",
    settled: false, // đã quyết toán chưa
    icon: require("@/assets/images/icon.png"),
    money: -50000, // số tiền mình nợ (âm) hoặc được hoàn (dương)
    recentActivity: {
      description: "A đã thanh toán cho Trà sữa",
      time: "2 giờ trước",
    },
  },
  {
    id: 3,
    avt: require("@/assets/images/icon.png"),
    name: "Du lịch Kon tum",
    members: 4,
    type: "Du lịch",
    settled: true, // đã quyết toán chưa
    icon: require("@/assets/images/icon.png"),
    money: -50000, // số tiền mình nợ (âm) hoặc được hoàn (dương)
    recentActivity: {
      description: "A đã thanh toán cho Trà sữa",
      time: "2 giờ trước",
    },
  },
  {
    id: 4,
    avt: require("@/assets/images/icon.png"),
    name: "Tiền nhà trọ",
    members: 4,
    type: "Du lịch",
    settled: false,
    icon: require("@/assets/images/icon.png"),
    money: -50000,
    recentActivity: {
      description: "A đã thanh toán cho Trà sữa",
      time: "2 giờ trước",
    },
  },
]; // hardcode, sẽ fetch từ server sau

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(1);

  const {
    lightGray,
    tabIconDefault,
    backgroundWhite,
    textColor,
    successGreen,
    lightRed,
    errorRed,
    lightGreen,
    darkGreen,
  } = useAppTheme();

  return (
    // fix button
    <View>
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 20,
          right: 24,
          zIndex: 2,
          backgroundColor: darkGreen,
          padding: 16,
          borderRadius: 12,
        }}
        onPress={() => router.push("/group/add")}
      >
        <AntDesign name="plus" size={20} color="white" />
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 60,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 20,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
          Nhóm
        </Text>

        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
            backgroundColor: lightGray,
            padding: 10,
            borderRadius: 8,
          }}
        >
          <EvilIcons name="search" size={24} color="black" />
          <TextInput
            placeholder="Tìm kiếm nhóm..."
            placeholderTextColor={tabIconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ marginLeft: 10, fontSize: 16, flex: 1 }}
          />
        </View>

        {/* Selected bar */}
        <View
          style={{
            flexDirection: "row",
            marginBottom: 20,
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {status.map((item) => (
            <TouchableOpacity
              style={{
                backgroundColor:
                  selectedStatus === item.id ? successGreen : lightGray,
                padding: 12,
                borderRadius: 32,
              }}
              onPress={() => setSelectedStatus(item.id)}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: selectedStatus === item.id ? "bold" : "normal",
                  color:
                    selectedStatus === item.id ? backgroundWhite : textColor,
                  textAlign: "center",
                }}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Group List */}
        {groupList.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={{
              flexDirection: "column",
              backgroundColor: backgroundWhite,
              padding: 20,
              borderRadius: 16,
              marginBottom: 20,
              gap: 20,
            }}
            onPress={() => router.push(`/group/${item.id}`)}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", gap: 4 }}>
                <Image
                  source={item.avt}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 10,
                    marginRight: 12,
                  }}
                />
                <View style={{ flexDirection: "column", gap: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: "bold" }}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={item.icon}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        marginRight: 12,
                      }}
                    />
                    <Text style={{ fontSize: 14 }}>
                      {item.type} • {item.members} thành viên
                    </Text>
                  </View>
                </View>
              </View>

              <FontAwesome6 name="ellipsis-vertical" size={20} color="black" />
            </View>

            <View>
              {item.settled ? (
                <View
                  style={{
                    backgroundColor: lightGray,
                    padding: 10,
                    borderRadius: 5,
                    alignSelf: "flex-start", // chỉ bao quanh text, không full width
                  }}
                >
                  <Text
                    style={{
                      color: tabIconDefault,
                      marginBottom: 4,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Đã quyết toán xong
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    justifyContent: "space-between",
                  }}
                >
                  {/* LEFT */}
                  <View
                    style={[
                      { flexDirection: "column", width: "50%" },
                      item.money < 0
                        ? { backgroundColor: lightRed }
                        : { backgroundColor: lightGreen },
                      { padding: 10, borderRadius: 5, alignSelf: "flex-start" },
                    ]}
                  >
                    <Text
                      style={[
                        { fontSize: 16, fontWeight: "600", marginBottom: 8 },
                        item.money < 0
                          ? { color: errorRed }
                          : { color: successGreen },
                      ]}
                    >
                      Trạng thái
                    </Text>
                    {item.money < 0 ? (
                      <View style={{ flexDirection: "column" }}>
                        <Text style={{ color: errorRed, fontWeight: "600" }}>
                          Bạn đang nợ
                        </Text>
                        <Text style={{ color: errorRed, fontWeight: "600" }}>
                          {Math.abs(item.money)} đ
                        </Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "column" }}>
                        <Text
                          style={{ color: successGreen, fontWeight: "600" }}
                        >
                          Bạn được nhận
                        </Text>
                        <Text
                          style={{ color: successGreen, fontWeight: "600" }}
                        >
                          {Math.abs(item.money)} đ
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* RIGHT */}
                  <View
                    style={{
                      backgroundColor: lightGray,
                      width: "50%",
                      padding: 10,
                      borderRadius: 5,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: tabIconDefault,
                        marginBottom: 12,
                      }}
                    >
                      {item.recentActivity.time}
                    </Text>
                    <Text style={{ fontSize: 14, color: textColor }}>
                      {item.recentActivity.description}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
