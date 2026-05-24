import { Redirect } from "expo-router";
import "react-native-get-random-values";

export default function Index() {
  return <Redirect href="/auth/login" />;
}
