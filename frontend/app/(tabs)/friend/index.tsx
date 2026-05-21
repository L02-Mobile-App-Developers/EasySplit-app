import TopAppBar from "@/components/TopAppBar";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
    AntDesign,
    EvilIcons,
    MaterialIcons
} from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

// ============================================================================
// MOCK DATA
// ============================================================================

const mockFriendRequests = [
  {
    id: 1,
    name: "Minh Anh",
    avatar: require("../../../assets/images/icon.png"),
    status: "Muốn kết bạn với bạn",
  },
];

const mockFriendsList = [
  {
    id: 1,
    name: "Lan Tran",
    avatar: require("../../../assets/images/icon.png"),
    debtStatus: "owed" as const, // "owed" (they owe you), "owes" (you owe them), "settled", "no_transaction"
    amount: 50000,
  },
  {
    id: 2,
    name: "Huy Le",
    avatar: require("../../../assets/images/icon.png"),
    debtStatus: "owed" as const,
    amount: 120000,
  },
  {
    id: 3,
    name: "Ngoc Pham",
    avatar: null, // No avatar, will show initials
    debtStatus: "settled" as const,
    amount: 0,
  },
  {
    id: 4,
    name: "Trung Nguyen",
    avatar: require("../../../assets/images/icon.png"),
    debtStatus: "no_transaction" as const,
    amount: 0,
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

interface FriendRequestCardProps {
  name: string;
  status: string;
  avatar: any;
  onAccept: () => void;
  onReject: () => void;
  successGreen: string;
  lightGray: string;
  backgroundWhite: string;
  textColor: string;
  tabIconDefault: string;
}

const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  name,
  status,
  avatar,
  onAccept,
  onReject,
  successGreen,
  lightGray,
  backgroundWhite,
  textColor,
  tabIconDefault,
}) => {
  return (
    <View
      style={{
        backgroundColor: lightGray,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: Avatar */}
      <Image
        source={avatar}
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          marginRight: 12,
        }}
      />

      {/* Middle: Name & Status */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: textColor }}>
          {name}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: tabIconDefault,
            marginTop: 4,
          }}
        >
          {status}
        </Text>
      </View>

      {/* Right: Action Buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {/* Accept Button */}
        <TouchableOpacity
          onPress={onAccept}
          style={{
            backgroundColor: successGreen,
            borderRadius: 8,
            padding: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialIcons name="check" size={20} color={backgroundWhite} />
        </TouchableOpacity>

        {/* Reject Button */}
        <TouchableOpacity
          onPress={onReject}
          style={{
            backgroundColor: lightGray,
            borderRadius: 8,
            padding: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <AntDesign name="close" size={16} color={textColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface FriendListItemProps {
  name: string;
  avatar: any;
  debtStatus: "owed" | "owes" | "settled" | "no_transaction";
  amount: number;
  onPress: () => void;
  successGreen: string;
  errorRed: string;
  lightGray: string;
  backgroundWhite: string;
  textColor: string;
  tabIconDefault: string;
}

const FriendListItem: React.FC<FriendListItemProps> = ({
  name,
  avatar,
  debtStatus,
  amount,
  onPress,
  successGreen,
  errorRed,
  lightGray,
  backgroundWhite,
  textColor,
  tabIconDefault,
}) => {
  // Extract initials from name if no avatar
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.map((part) => part[0]).join("").toUpperCase();
  };

  // Determine status text and color
  const getStatusInfo = () => {
    switch (debtStatus) {
      case "owed":
        return {
          text: `Họ nợ bạn ${amount.toLocaleString()}đ`,
          amountColor: successGreen,
          fullText: true,
        };
      case "owes":
        return {
          text: `Bạn nợ ${amount.toLocaleString()}đ`,
          amountColor: errorRed,
          fullText: true,
        };
      case "settled":
        return {
          text: "Đã cân bằng",
          amountColor: tabIconDefault,
          fullText: false,
          hasIcon: true,
        };
      case "no_transaction":
        return {
          text: "Chưa có giao dịch",
          amountColor: tabIconDefault,
          fullText: false,
        };
      default:
        return {
          text: "Chưa có giao dịch",
          amountColor: tabIconDefault,
          fullText: false,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: backgroundWhite,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Left: Avatar or Initials */}
      {avatar ? (
        <Image
          source={avatar}
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            marginRight: 12,
          }}
        />
      ) : (
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: lightGray,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: tabIconDefault,
            }}
          >
            {getInitials(name)}
          </Text>
        </View>
      )}

      {/* Middle: Name & Status */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: textColor }}>
          {name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
            gap: 4,
          }}
        >
          {statusInfo.hasIcon && (
            <MaterialIcons
              name="check-circle"
              size={14}
              color={tabIconDefault}
            />
          )}
          <Text
            style={{
              fontSize: 14,
              color: statusInfo.amountColor,
              fontWeight: statusInfo.fullText ? "600" : "400",
            }}
          >
            {statusInfo.text}
          </Text>
        </View>
      </View>

      {/* Right: Chevron */}
      <MaterialIcons name="chevron-right" size={24} color={tabIconDefault} />
    </TouchableOpacity>
  );
};

// ============================================================================
// API SIMULATION
// ============================================================================

const fetchFriends = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ requests: mockFriendRequests, friends: mockFriendsList });
    }, 2000); // 2 second delay
  });
};

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function FriendScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    textColor,
    backgroundColor,
    selected,
    successGreen,
    errorRed,
    tabIconDefault,
    lightGray,
    backgroundWhite,
    darkGreen,
  } = useAppTheme();

  useEffect(() => {
    const loadFriends = async () => {
      setLoading(true);
      // Temporarily skip API fetch to speed up local development
      // const data = await fetchFriends() as any;
      // setFriendRequests(data.requests);
      // setFriendsList(data.friends);
      setFriendRequests(mockFriendRequests);
      setFriendsList(mockFriendsList);
      setLoading(false);
    };
    loadFriends();
  }, []);

  const handleAcceptRequest = (requestId: number) => {
    console.log("Accept request:", requestId);
    // TODO: Implement API call
  };

  const handleRejectRequest = (requestId: number) => {
    console.log("Reject request:", requestId);
    // TODO: Implement API call
  };

  const handleFriendPress = (friendId: number) => {
    console.log("Friend pressed:", friendId);
    // TODO: Navigate to friend detail or chat
  };

  const handleAddFriendByEmail = () => {
    router.push("/friend/add");
  };

  const handleSearch = () => {
    console.log("Search pressed");
    // TODO: Navigate to search screen
  };

  const handleSettings = () => {
    console.log("Settings pressed");
    // TODO: Navigate to settings screen
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: backgroundColor }}>
        <TopAppBar
          title="EasySplit"
          showBack={false}
          showSearch={true}
          showSettings={true}
          onSearchPress={handleSearch}
          onSettingsPress={handleSettings}
        />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={successGreen} />
          <Text style={{ marginTop: 12, color: tabIconDefault, fontSize: 14 }}>Đang tải bạn bè...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: backgroundColor }}>
      {/* Top App Bar */}
      <TopAppBar
        title="EasySplit"
        showBack={false}
        showSearch={true}
        showSettings={true}
        onSearchPress={handleSearch}
        onSettingsPress={handleSettings}
      />

      <ScrollView
        contentContainerStyle={{
          // Increased paddingTop to match Group page spacing
          paddingTop: 60,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 20,
        }}
      >
        {/* Screen Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            marginBottom: 24,
            color: textColor,
          }}
        >
          Bạn bè
        </Text>

        {/* Search Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
            backgroundColor: lightGray,
            paddingHorizontal: 12,
            borderRadius: 10,
            height: 48,
          }}
        >
          <EvilIcons name="search" size={24} color={tabIconDefault} />
          <TextInput
            placeholder="Tìm kiếm bạn bè..."
            placeholderTextColor={tabIconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              marginLeft: 10,
              fontSize: 16,
              flex: 1,
              color: textColor,
            }}
          />
        </View>

        {/* Primary Action Button: Add Friend by Email */}
        <TouchableOpacity
          onPress={handleAddFriendByEmail}
          style={{
            backgroundColor: darkGreen,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 28,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <AntDesign name="usergroup-add" size={20} color="white" />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "white",
              }}
            >
              Thêm bạn bằng email
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="white" />
        </TouchableOpacity>

        {/* Friend Requests Section */}
        {friendRequests.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            {/* Header with Badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: tabIconDefault,
                  letterSpacing: 0.5,
                }}
              >
                LỜI MỜI KẾT BẠN
              </Text>
              <View
                style={{
                  backgroundColor: "#EF4444",
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  {friendRequests.length}
                  {friendRequests.length === 1 ? " MỚI" : " MỚI"}
                </Text>
              </View>
            </View>

            {/* Friend Request Cards */}
            {friendRequests.map((request) => (
              <FriendRequestCard
                key={request.id}
                name={request.name}
                status={request.status}
                avatar={request.avatar}
                onAccept={() => handleAcceptRequest(request.id)}
                onReject={() => handleRejectRequest(request.id)}
                successGreen={successGreen}
                lightGray={lightGray}
                backgroundWhite={backgroundWhite}
                textColor={textColor}
                tabIconDefault={tabIconDefault}
              />
            ))}
          </View>
        )}

        {/* Friends List Section */}
        <View>
          {/* Header */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: tabIconDefault,
              marginBottom: 12,
              letterSpacing: 0.5,
            }}
          >
            DANH SÁCH BẠN BÈ
          </Text>

          {/* Friend List Items */}
          {friendsList.map((friend) => (
            <FriendListItem
              key={friend.id}
              name={friend.name}
              avatar={friend.avatar}
              debtStatus={friend.debtStatus}
              amount={friend.amount}
              onPress={() => handleFriendPress(friend.id)}
              successGreen={successGreen}
              errorRed={errorRed}
              lightGray={lightGray}
              backgroundWhite={backgroundWhite}
              textColor={textColor}
              tabIconDefault={tabIconDefault}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
