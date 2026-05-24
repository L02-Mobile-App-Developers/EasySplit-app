import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import { AntDesign, EvilIcons, FontAwesome6 } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import { activityService } from "@/api/services/activity.service";
import { groupService } from "@/api/services/group.service";

import type { Group } from "@/api/types/group";

const status = [
  { id: 10, name: "Tất cả" },
  { id: 20, name: "Đang hoạt động" },
  { id: 30, name: "Đã quyết toán" },
];

const groupList = [
  {
    id: 1,
    avt: require("../../../assets/images/icon.png"),
    name: "Du lịch Đà lạt",
    members: 4,
    type: "Du lịch",
    settled: false, // đã quyết toán chưa
    icon: require("../../../assets/images/icon.png"),
    money: 50000, // số tiền mình nợ (âm) hoặc được hoàn (dương)
    recentActivity: {
      description: "A đã thanh toán cho Trà sữa",
      time: "2 giờ trước",
    },
  },
  {
    id: 2,
    avt: require("../../../assets/images/icon.png"),
    name: "Du lịch Vũng tàu",
    members: 4,
    type: "Du lịch",
    settled: false, // đã quyết toán chưa
    icon: require("../../../assets/images/icon.png"),
    money: -50000, // số tiền mình nợ (âm) hoặc được hoàn (dương)
    recentActivity: {
      description: "A đã thanh toán cho Trà sữa",
      time: "2 giờ trước",
    },
  },
  {
    id: 3,
    avt: require("../../../assets/images/icon.png"),
    name: "Du lịch Kon tum",
    members: 4,
    type: "Du lịch",
    settled: true, // đã quyết toán chưa
    icon: require("../../../assets/images/icon.png"),
    money: -50000, // số tiền mình nợ (âm) hoặc được hoàn (dương)
    recentActivity: {
      description: "A đã thanh toán cho Trà sữa",
      time: "2 giờ trước",
    },
  },
  {
    id: 4,
    avt: require("../../../assets/images/icon.png"),
    name: "Tiền nhà trọ",
    members: 4,
    type: "Du lịch",
    settled: false,
    icon: require("../../../assets/images/icon.png"),
    money: -50000,
    recentActivity: {
      description: "A đã thanh toán cho Trà sữa",
      time: "2 giờ trước",
    },
  },
]; // hardcode, sẽ fetch từ server sau

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(10);

  const [groups, setGroups] = useState<Group[]>([]);

  const [activitiesMap, setActivitiesMap] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

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

  const fetchGroups = async () => {
    try {
      const data = await groupService.getGroups();

      setGroups(data);
    } catch (error) {
      console.log("Get groups error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // fetch activities for each group to show recent activity
  useEffect(() => {
    if (groups.length === 0) return;

    const fetchActivities = async () => {
      try {
        const results = await Promise.all(
          groups.map(async (group) => {
            const data = await activityService.getActivities(group.id);
            return { groupId: group.id, data };
          }),
        );

        const map: Record<string, any> = {};

        results.forEach((r: any) => {
          map[r.groupId] = r.data.items?.[0] ?? null; // lấy latest activity
        });

        setActivitiesMap(map);
      } catch (err) {
        console.log("Get activities error:", err);
      }
    };

    fetchActivities();
  }, [groups]);

  const onRefresh = async () => {
    setRefreshing(true);

    await fetchGroups();
  };

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const matchSearch = group.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchStatus =
        selectedStatus === 10
          ? true
          : selectedStatus === 20
            ? group.status === "active"
            : group.status === "closed";

      return matchSearch && matchStatus;
    });
  }, [groups, searchQuery, selectedStatus]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: backgroundWhite,
        }}
      >
        <ActivityIndicator size="large" color={darkGreen} />
      </View>
    );
  }

  const handleSearch = () => {
    console.log("Search pressed");
    // TODO: Navigate to search screen
  };

  const handleSettings = () => {
    console.log("Settings pressed");
    // TODO: Navigate to settings screen
  };

  return (
    // fix button
    <View style={{ flex: 1 }}>
      <TopAppBar
        title="EasySplit"
        showBack={false}
        showSearch={true}
        showSettings={true}
        onSearchPress={handleSearch}
        onSettingsPress={handleSettings}
      />
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
          paddingTop: 16,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 20,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: "row",
            marginBottom: 20,
            justifyContent: "center",
            gap: 8,
            flexGrow: 1,
          }}
        >
          {status.map((item) => (
            <TouchableOpacity
              key={item.id}
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
        </ScrollView>

        {/* Group List */}
        {filteredGroups.map((item) => (
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
                  source={groupList[0].avt}
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
                      source={groupList[0].icon}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        marginRight: 12,
                      }}
                    />
                    <Text style={{ fontSize: 14 }}>
                      {item.category} • {item.memberCount} thành viên
                    </Text>
                  </View>
                </View>
              </View>

              <FontAwesome6 name="ellipsis-vertical" size={20} color="black" />
            </View>

            <View>
              {item.status === "closed" ? (
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
                      groupList[0].money < 0
                        ? { backgroundColor: lightRed }
                        : { backgroundColor: lightGreen },
                      { padding: 10, borderRadius: 5, alignSelf: "flex-start" },
                    ]}
                  >
                    <Text
                      style={[
                        { fontSize: 16, fontWeight: "600", marginBottom: 8 },
                        groupList[0].money < 0
                          ? { color: errorRed }
                          : { color: successGreen },
                      ]}
                    >
                      Trạng thái
                    </Text>
                    {groupList[0].money < 0 ? (
                      <View style={{ flexDirection: "column" }}>
                        <Text style={{ color: errorRed, fontWeight: "600" }}>
                          Bạn đang nợ
                        </Text>
                        <Text style={{ color: errorRed, fontWeight: "600" }}>
                          {Math.abs(groupList[0].money)} đ
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
                          {Math.abs(groupList[0].money)} đ
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
                      {activitiesMap[item.id]?.createdAt ?? ""}
                    </Text>
                    <Text style={{ fontSize: 14, color: textColor }}>
                      {activitiesMap[item.id]?.action ?? "Chưa có hoạt động"}
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
