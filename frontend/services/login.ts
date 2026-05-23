import { saveToken, saveUser } from "@/store/authStorage";
import axios from "axios";

export const handleLogin = async (email: string, password: string) => {
  const res = await axios.post("/login", {
    email,
    password,
  });

  const { token, user } = res.data;

  await saveToken(token);
  await saveUser(user);
};
