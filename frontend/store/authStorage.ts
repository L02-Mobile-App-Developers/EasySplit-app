import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "token";
const USER_KEY = "user";

// lưu token
export const saveToken = async (token: string) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

// lấy token
export const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

// xóa token
export const removeToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// lưu user
export const saveUser = async (user: any) => {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

// lấy user
export const getUser = async () => {
  const data = await SecureStore.getItemAsync(USER_KEY);
  return data ? JSON.parse(data) : null;
};

// xoá user
export const removeUser = async () => {
  await SecureStore.deleteItemAsync(USER_KEY);
};
