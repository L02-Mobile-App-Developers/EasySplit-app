import { useAppTheme } from "@/hooks/useAppTheme";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  title?: string;
  showBack?: boolean;
  bonus?: ReactNode;
};

export default function Header({ title, showBack = true, bonus }: Props) {
  const { darkGreen } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: 8,
              backgroundColor: pressed ? "#E5E7EB" : "transparent",
            })}
          >
            <AntDesign name="arrow-left" size={24} color="black" />
          </Pressable>
        )}

        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: darkGreen,
          }}
        >
          {title}
        </Text>
      </View>

      {bonus}
    </View>
  );
}
