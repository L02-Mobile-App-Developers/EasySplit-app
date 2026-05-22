import TopAppBar from "@/components/TopAppBar";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Entypo,
  Feather,
  FontAwesome5,
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";

import { FriendInfo } from "@/types";

// Loại nhóm
const groupTypes = [
  {
    id: 1,
    name: "Ăn uống",
    icon: (color: string) => (
      <MaterialCommunityIcons
        name="silverware-fork-knife"
        size={16}
        color={color}
      />
    ),
  },
  {
    id: 2,
    name: "Du lịch",
    icon: (color: string) => (
      <FontAwesome5 name="plane-departure" size={16} color={color} />
    ),
  },
  {
    id: 3,
    name: "Ở trọ",
    icon: (color: string) => (
      <FontAwesome6 name="house" size={16} color={color} />
    ),
  },
  {
    id: 4,
    name: "Sự kiện",
    icon: (color: string) => (
      <MaterialCommunityIcons name="party-popper" size={16} color={color} />
    ),
  },
  // {
  //   id: 5,
  //   name: "Khác",
  //   icon: (color: string) => (
  //     <AntDesign name="ellipsis" size={16} color={color} />
  //   ),
  // },
];

// thông tin user
const users = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    gmail: "nguyenvanA@gmail.com",
  },
  {
    id: 2,
    name: "Trần Thị B",
    avatar: "https://randomuser.me/api/portraits/women/2.jpg",
    gmail: "tranthiB@gmail.com",
  },
  {
    id: 3,
    name: "Lê Văn C",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg",
    gmail: "LevanC@gmail.com",
  },
];

// card mà được add
const AddedMemberCard: React.FC<
  FriendInfo & {
    onRemove: () => void;
  }
> = ({ name, avatar, onRemove }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "white",
        padding: 8,
        borderRadius: 20,
        alignSelf: "flex-start", // chỉ chiếm vừa đủ nội dung
      }}
    >
      <Image
        source={{ uri: avatar }}
        style={{
          width: 30,
          height: 30,
          borderRadius: 25,
        }}
      />
      <Text style={{ color: "black", fontSize: 12 }}>{name}</Text>
      <Pressable onPress={onRemove}>
        <Feather name="x-circle" size={16} color="red" />
      </Pressable>
    </View>
  );
};

// card chưa add
const MemberCard: React.FC<
  FriendInfo & {
    onToggle: () => void;
    isAdded: boolean;
  }
> = ({ name, avatar, gmail, onToggle, isAdded }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "white",
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 20,
        flex: 1, // chiếm hết chiều ngang
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Image
          source={{ uri: avatar }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
          }}
        />
        <View style={{ flexDirection: "column", gap: 2 }}>
          <Text style={{ color: "black", fontSize: 14, fontWeight: "bold" }}>
            {name}
          </Text>
          <Text style={{ color: "gray", fontSize: 10 }}>{gmail}</Text>
        </View>
      </View>

      <Pressable onPress={onToggle}>
        {isAdded ? (
          <FontAwesome6
            name="check-circle"
            size={24}
            color="green"
            style={{ marginRight: 6 }}
          />
        ) : (
          <Entypo
            name="circle"
            size={24}
            color="black"
            style={{ marginRight: 6 }}
          />
        )}
      </Pressable>
    </View>
  );
};

export default function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [memberToAdd, setMemberToAdd] = useState<FriendInfo[]>([]); // danh sách member đang add
  const [groupType, setGroupType] = useState<string | null>(null); // loại nhóm đang chọn
  const [groupName, setGroupName] = useState("");

  // function thêm user vào danh sách đang add
  const handleAddMember = (user: FriendInfo) => {
    setMemberToAdd((prev) => [...prev, user]);
  };

  const handleRemoveMember = (user: FriendInfo) => {
    setMemberToAdd((prev) => prev.filter((item) => item.id !== user.id));
  };

  const pickImage = async () => {
    // xin quyền
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri); // lấy uri
    }

    // console.log(image);
  };

  return (
    <View>
      {/* HEADER */}
      <TopAppBar title="Tạo nhóm mới" showBack  />
      <ScrollView
        contentContainerStyle={{
            paddingTop: 12,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 20,
        }}
      >
        {/* Upload Image */}
        <Pressable
          onPress={pickImage}
          style={{
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 20,
              }}
            />
          ) : (
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 20,
                backgroundColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text>Chọn ảnh</Text>
            </View>
          )}
        </Pressable>

        {/* Tên nhóm */}
        <Text style={{ marginBottom: 10 }}>Tên nhóm</Text>
        <TextInput
          placeholder="Nhập tên nhóm"
          placeholderTextColor="#999"
          value={groupName}
          onChangeText={setGroupName}
          style={{
            backgroundColor: "#e7e8e9ff",
            padding: 16,
            borderRadius: 10,
            color: "#333",
            marginBottom: 12,
          }}
        />

        {/* Loại nhóm */}
        <Text style={{ marginVertical: 10 }}>Loại nhóm</Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {groupTypes.map((type) => (
            <Pressable key={type.id} onPress={() => setGroupType(type.name)}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor:
                    groupType === type.name ? "#16a34a" : "#e7e8e9ff",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 30,
                }}
              >
                {type.icon(groupType === type.name ? "white" : "black")}

                <Text
                  style={{
                    color: groupType === type.name ? "white" : "black",
                    fontWeight: groupType === type.name ? "bold" : "normal",
                  }}
                >
                  {type.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Thành viên */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 20,
          }}
        >
          <Text>Thêm thành viên</Text>
          <Text style={{ color: "green" }}>
            {memberToAdd.length} thành viên đã được chọn
          </Text>
        </View>

        {/* Danh sách đang add */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: "row",
            gap: 10,
            padding: 10,
            alignItems: "center",
          }}
          style={{
            marginTop: 10,
            backgroundColor: "#e7e8e9ff",
            borderRadius: 10,
            minHeight: 66,
          }}
        >
          {memberToAdd.map((user) => (
            <AddedMemberCard
              key={user.id}
              id={user.id}
              name={user.name}
              avatar={user.avatar}
              gmail={user.gmail}
              onRemove={() => handleRemoveMember(user)}
            />
          ))}
        </ScrollView>

        {/* Danh sách chưa add */}
        <View
          style={{
            flexDirection: "column",
            gap: 10,
            marginTop: 16,
            backgroundColor: "#e7e8e9ff",
            padding: 10,
            borderRadius: 10,
          }}
        >
          {users.map((user) => {
            const isAdded = memberToAdd.some((item) => item.id === user.id);

            return (
              <MemberCard
                key={user.id}
                id={user.id}
                name={user.name}
                avatar={user.avatar}
                gmail={user.gmail}
                isAdded={isAdded}
                onToggle={() => {
                  if (isAdded) {
                    handleRemoveMember(user);
                  } else {
                    handleAddMember(user);
                  }
                }}
              />
            );
          })}
        </View>

        {/* Button */}
        <View>
          <Pressable
            style={{
              backgroundColor: "green",
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
              marginTop: 20,
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
            onPress={() => {
              // Xử lý tạo nhóm
            }}
          >
            <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
              Tạo nhóm
            </Text>
            <MaterialIcons name="group-add" size={24} color="white" />
          </Pressable>
        </View>

        {/*  */}
      </ScrollView>
    </View>
  );
}
