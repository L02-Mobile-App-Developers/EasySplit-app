import { Redirect } from "expo-router";

import { useAuthStore } from "@/store/auth.store";

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return <Redirect href={isAuthenticated ? "/(tabs)" : "/auth/login"} />;
}
