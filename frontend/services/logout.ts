import { removeToken, removeUser } from "@/store/authStorage";
import { router } from "expo-router";

export const logout = async () => {
  await removeToken();
  await removeUser();

  router.replace("/auth/login");
};
