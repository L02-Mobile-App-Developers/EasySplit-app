import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function GroupDetail() {
  const { id } = useLocalSearchParams();

  return (
    <View>
      <Text>Group ID: {id}</Text>
    </View>
  );
}
